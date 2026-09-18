const $ = (id) => document.getElementById(id);
const eur = (n) => new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'}).format(n||0)+' €';
const pct = (n) => new Intl.NumberFormat('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1}).format((n||0)*100)+' %';
const nom = (p) => p ? `${p.nombre||''} ${p.apellidos||''}`.trim()||'(sin nombre)' : '—';
const esc = (s) => String(s==null?'':s).replace(/"/g,'&quot;');
const IDIOMAS = {es:'Español',ca:'Català',en:'English'};
const TIPOS_MOV = ['Compra','Venta','Aportación','Disposición','Dividendo','Comisión'];

let VAULT=null, AUTOR=localStorage.getItem('autor')||null, ESTADO=null, SEL=null, SELC=null, SELCLI=null, NUEVO=false, FILTRO='';

async function boot(){
  if(!('showDirectoryPicker' in window)){ pantallaNavegador(); return; }
  const h=await Libro.leerHandle();
  if(h && AUTOR && await Libro.permiso(h,false)){ VAULT=h; entrar(); } else pantallaConexion(h);
}
function pantallaNavegador(){ document.body.innerHTML=`<div class="wrap"><div class="center"><h1>Abre esta app en Chrome</h1><div class="card"><p>Necesita Chrome (o Edge) para guardar en OneDrive. Safari y Firefox no lo permiten.</p></div></div></div>`; }
function pantallaConexion(hg){
  document.body.innerHTML=`<div class="wrap"><div class="center"><h1>Gestor de Carteras</h1><p class="muted">Primera vez en este equipo</p>
    <div class="card"><p><b>1.</b> Elige la carpeta <b>compartida</b> de OneDrive (la MISMA en los dos equipos).</p>
      <div class="row"><button class="primary" id="bp">${hg?'Reconectar la carpeta':'Elegir carpeta…'}</button><span class="muted" id="pm"></span></div>
      <p style="margin-top:16px"><b>2.</b> ¿Quién usa este equipo?</p>
      <div class="users"><label><input type="radio" name="au" value="jacobo" ${AUTOR==='jacobo'?'checked':''}> Jacobo</label>
        <label><input type="radio" name="au" value="ana" ${AUTOR==='ana'?'checked':''}> Ana</label></div>
      <div class="row" style="margin-top:14px"><button class="primary" id="bg" disabled>Entrar</button></div></div></div></div>`;
  const rg=()=>{ $('bg').disabled=!(VAULT&&AUTOR); };
  $('bp').onclick=async()=>{ try{ if(hg){ if(await Libro.permiso(hg,true)) VAULT=hg; } else VAULT=await Libro.elegirCarpeta(); if(VAULT){$('pm').textContent='✓ conectada'; rg();} }catch(e){ $('pm').textContent='No se pudo conectar.'; } };
  document.querySelectorAll('input[name=au]').forEach(r=>r.onchange=()=>{ AUTOR=r.value; rg(); });
  $('bg').onclick=()=>{ localStorage.setItem('autor',AUTOR); entrar(); }; rg();
}

let TAB='analisis';
function entrar(){
  document.body.innerHTML=`<div class="top"><span class="brand">Gestor de Carteras</span><span class="user">Usuario: ${AUTOR} · datos en OneDrive</span></div>
    <div class="tabs">
      <div class="tab" data-t="analisis">Análisis</div>
      <div class="tab" data-t="clientes">Clientes</div>
      <div class="tab" data-t="actualizar">Actualizar</div>
      <div class="tab" data-t="informes">Informes</div>
    </div><div class="wrap" id="view"></div>`;
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{ TAB=t.dataset.t; pintarTabs(); render(); });
  pintarTabs(); recargarYrender(); window.addEventListener('focus',recargarYrender);
}
function pintarTabs(){ document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.t===TAB)); }
async function recargarYrender(){ try{ ESTADO=Libro.reconstruir(await Libro.cargarEventos(VAULT)); }catch(e){ ESTADO=Libro.reconstruir([]); } render(); }
function render(){ ({analisis:renderAnalisis,clientes:renderClientes,actualizar:renderActualizar,informes:renderInformes}[TAB])(); }

// ---- helpers ----
async function apuntar(l){ for(const [t,p] of l) await Libro.anexar(VAULT,AUTOR,t,p); }
const titularesDe=(st,cid)=>[...(st.titulares[cid]||[])];
const cartsDe=(st,pid)=>Object.entries(st.carteras).filter(([cid,c])=>!c.baja&&titularesDe(st,cid).includes(pid)).map(([cid,c])=>({cid,...c}));
const vlUlt=(st,inst)=>{ const m=st.vl[inst]||{}; const f=Object.keys(m).sort(); return f.length?m[f[f.length-1]]:null; };
const carterasActivas=(st)=>Object.entries(st.carteras).filter(([,c])=>!c.baja).map(([cid,c])=>({cid,...c}));
function productos(st, cids){
  const set=new Set(cids); const prod={};
  for(const [k,tit] of Object.entries(st.posiciones)){
    const [cid,inst]=k.split('|'); if(!set.has(cid)||Math.abs(tit)<1e-8) continue;
    const vl=vlUlt(st,inst); if(vl==null) continue;
    prod[inst]=prod[inst]||{valor:0,n:0}; prod[inst].valor+=tit*vl; prod[inst].n++;
  }
  const tot=Object.values(prod).reduce((a,b)=>a+b.valor,0)||1;
  return Object.entries(prod).sort((a,b)=>b[1].valor-a[1].valor).map(([inst,v])=>({inst,nombre:st.instrumentos[inst]?.nombre||'—',valor:v.valor,n:v.n,pct:v.valor/tot}));
}

// ============ ANÁLISIS ============
function stdev(a){if(a.length<2)return 0;const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)*(y-m),0)/(a.length-1));}
function maxDD(rents){let idx=1,peak=1,dd=0;for(const r of rents){idx*=(1+(r||0));peak=Math.max(peak,idx);dd=Math.min(dd,idx/peak-1);}return dd;}
function barSVG(labels,vals){if(!vals.length)return '';const W=560,H=210,pL=34,pR=10,pT=16,pB=22;const lo=Math.min(0,...vals),hi=Math.max(0,...vals),pad=(hi-lo)*0.15||0.02;const y0=lo-pad,y1=hi+pad,step=(W-pL-pR)/vals.length,bw=step*0.6,Y=v=>pT+(H-pT-pB)*(1-(v-y0)/((y1-y0)||1));let g=`<line x1="${pL}" y1="${Y(0)}" x2="${W-pR}" y2="${Y(0)}" stroke="#D9CFCF"/>`;vals.forEach((v,i)=>{const x=pL+i*step+step/2-bw/2,yt=Y(Math.max(0,v)),yb=Y(Math.min(0,v));g+=`<rect x="${x}" y="${yt}" width="${bw}" height="${Math.max(1,yb-yt)}" rx="2" fill="${v<0?'#575755':'#A98A8C'}"/><text x="${x+bw/2}" y="${v<0?yb+9:yt-3}" text-anchor="middle" font-size="8" font-weight="700">${(v>=0?'+':'')+(v*100).toFixed(1)}%</text><text x="${x+bw/2}" y="${H-7}" text-anchor="middle" font-size="8" fill="#575755">${labels[i]}</text>`;});return `<div class="chart"><svg viewBox="0 0 ${W} ${H}">${g}</svg></div>`;}
function donutSVG(segs){const tot=segs.reduce((s,x)=>s+x.v,0)||1,r=58,C=2*Math.PI*r;let off=0,g='';const col=['#8E7577','#E5D0D2','#575755','#B79A9C','#C9B9BA','#7d6a6b','#ddc8c9','#9c8788'];
  segs.forEach((sg,i)=>{const d=sg.v/tot*C;g+=`<circle cx="78" cy="78" r="${r}" fill="none" stroke="${col[i%col.length]}" stroke-width="26" stroke-dasharray="${d} ${C-d}" stroke-dashoffset="${-off}" transform="rotate(-90 78 78)"/>`;off+=d;});
  const leg=segs.map((sg,i)=>`<div class="it"><span class="sw" style="background:${col[i%col.length]}"></span>${sg.n} <b>${pct(sg.v/tot)}</b></div>`).join('');
  return `<div class="donut"><svg viewBox="0 0 156 156" style="width:150px;flex:none">${g}</svg><div class="leg">${leg}</div></div>`;}
function renderAnalisis(){
  const st=ESTADO; const act=carterasActivas(st);
  const patCart=act.map(c=>({...c,pat:Libro.patrimonio(st,c.cid)}));
  const patTotal=patCart.reduce((a,c)=>a+c.pat,0)||1;
  const liqTotal=act.reduce((a,c)=>a+(st.liquidez[c.cid]||0),0);
  const prod=productos(st, act.map(c=>c.cid));
  // concentración: una cartera conjunta se reparte entre sus titulares (no cuenta entera a cada uno)
  const porPersona={};
  for(const c of patCart){const ts=titularesDe(st,c.cid); const share=c.pat/(ts.length||1); for(const pid of ts) porPersona[pid]=(porPersona[pid]||0)+share;}
  const ranking=Object.entries(porPersona).sort((a,b)=>b[1]-a[1]);
  const topCli=ranking.slice(0,5);
  const top5pct=topCli.reduce((a,[,v])=>a+v,0)/patTotal;
  const nClientes=Object.keys(st.personas).length;
  // riesgo del conjunto desde la serie anual (agregada por año)
  const bookY={};
  act.forEach(c=>(st.hist[c.cid]?.anual||[]).forEach(y=>{const o=bookY[y.a]||(bookY[y.a]={ini:0,res:0});o.ini+=y.ini||0;o.res+=(y.res!=null?y.res:0);}));
  const bookAnual=Object.keys(bookY).sort().map(a=>({a:+a,rent:bookY[a].ini?bookY[a].res/bookY[a].ini:0}));
  const rentsBook=bookAnual.map(y=>y.rent);
  const vol=stdev(rentsBook), dd=maxDD(rentsBook);
  const half=Math.ceil(prod.length/2);
  const tprod=arr=>`<table><thead><tr><th>Producto</th><th class="num">Valor</th><th class="num">Peso</th><th class="num">Carteras</th></tr></thead><tbody>${arr.map(p=>`<tr><td>${p.nombre}</td><td class="num">${eur(p.valor)}</td><td class="num">${pct(p.pct)}</td><td class="num">${p.n}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">Sin datos.</td></tr>'}</tbody></table>`;
  $('view').innerHTML=`<h1>Análisis de la cartera</h1>
    <div class="card"><h2>Resumen</h2>
      <div class="kpis3">
        <div class="mini"><div class="k">Clientes</div><div class="v">${nClientes}</div></div>
        <div class="mini"><div class="k">Carteras</div><div class="v">${act.length}</div></div>
        <div class="mini"><div class="k">Patrimonio total</div><div class="v">${eur(patTotal)}</div></div>
        <div class="mini"><div class="k">Liquidez</div><div class="v">${pct(liqTotal/patTotal)}</div></div>
      </div>
      <div class="kpis3" style="margin-top:12px">
        <div class="mini"><div class="k">Patrimonio medio / cartera</div><div class="v" style="font-size:17px">${eur(patTotal/(act.length||1))}</div></div>
        <div class="mini"><div class="k">Nº de productos</div><div class="v">${prod.length}</div></div>
        <div class="mini"><div class="k">Peso 5 mayores clientes</div><div class="v" style="font-size:17px">${pct(top5pct)}</div></div>
        <div class="mini"><div class="k">Mayor producto</div><div class="v" style="font-size:17px">${prod[0]?pct(prod[0].pct):'—'}</div></div>
      </div></div>
    <div class="card"><h2>Patrimonio por producto</h2>
      <div class="cols2"><div>${tprod(prod.slice(0,half))}</div><div>${tprod(prod.slice(half))}</div></div>
      <div style="display:flex;justify-content:center;margin-top:20px">${prod.length?donutSVG(prod.slice(0,8).map(p=>({n:p.nombre,v:p.valor}))):''}</div></div>
    <div class="card"><h2>Riesgo (histórico anual del conjunto)</h2>
      <div class="kpis3"><div class="mini"><div class="k">Volatilidad anual</div><div class="v" style="font-size:18px">${bookAnual.length?pct(vol):'—'}</div></div>
        <div class="mini"><div class="k">Caída máxima</div><div class="v" style="font-size:18px">${bookAnual.length?pct(dd):'—'}</div></div>
        <div class="mini"><div class="k">Mejor año</div><div class="v" style="font-size:18px">${bookAnual.length?pct(Math.max(...rentsBook)):'—'}</div></div>
        <div class="mini"><div class="k">Peor año</div><div class="v" style="font-size:18px">${bookAnual.length?pct(Math.min(...rentsBook)):'—'}</div></div></div>
      <div style="margin-top:10px">${bookAnual.length?barSVG(bookAnual.map(y=>y.a),rentsBook):'<span class="muted">Sin serie anual.</span>'}</div>
      <div class="muted" style="margin-top:6px;font-size:11.5px">Volatilidad = desviación típica de las rentabilidades anuales. Caída máxima = mayor retroceso acumulado. La resolución mensual y el Sharpe llegan con los VL mensuales por fondo.</div></div>
    <div class="card"><h2>Concentración</h2>
      <p class="muted" style="margin:0 0 8px">Mayores clientes por patrimonio (las conjuntas se reparten entre sus titulares). El producto más pesado es ${prod[0]?`<b>${prod[0].nombre}</b> con ${pct(prod[0].pct)} del total`:'—'}.</p>
      <table><thead><tr><th>Cliente</th><th class="num">Patrimonio</th><th class="num">% del total</th></tr></thead>
        <tbody>${topCli.map(([pid,v])=>`<tr><td>${nom(st.personas[pid])}</td><td class="num">${eur(v)}</td><td class="num">${pct(v/patTotal)}</td></tr>`).join('')}</tbody></table>
      <div class="avisos">Los ratios de riesgo histórico (volatilidad, caída máxima, rentabilidad en el tiempo, Sharpe) necesitan la serie mensual de cada cartera, que aún no está migrada. Es el siguiente paso.</div></div>`;
}

// ============ CLIENTES ============
function renderClientes(){
  const st=ESTADO; if(SEL&&!st.personas[SEL]) SEL=null;
  const personas=Object.values(st.personas).sort((a,b)=>nom(a).localeCompare(nom(b)));
  const f=FILTRO.toLowerCase();
  const lista=personas.filter(p=>nom(p).toLowerCase().includes(f)).map(p=>`<div class="item ${(p.id===SEL&&!NUEVO)?'sel':''}" data-pid="${p.id}"><div class="n">${nom(p)}</div><div class="m">${cartsDe(st,p.id).length} cartera(s)</div></div>`).join('')||'<div class="muted" style="padding:8px">Sin resultados.</div>';
  $('view').innerHTML=`<h1>Clientes</h1>
    <div class="split">
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Personas <span class="muted" style="font-weight:400">(${personas.length})</span></h2><button class="primary" id="bNuevo">+ Nuevo cliente</button></div>
        <input id="buscar" placeholder="Buscar cliente…" value="${esc(FILTRO)}" style="width:100%;background:#fff;border-color:var(--linea);margin:12px 0">
        <div class="listaP">${lista}</div>
      </div>
      <div class="card" id="ficha"></div></div>`;
  document.querySelectorAll('.item').forEach(e=>e.onclick=()=>{ SEL=e.dataset.pid; NUEVO=false; renderClientes(); });
  $('bNuevo').onclick=()=>{ NUEVO=true; SEL=null; renderClientes(); };
  const bb=$('buscar'); bb.oninput=()=>{ FILTRO=bb.value; const ff=FILTRO.toLowerCase(); document.querySelectorAll('.item').forEach(el=>{ el.style.display=nom(st.personas[el.dataset.pid]).toLowerCase().includes(ff)?'':'none'; }); };
  if(NUEVO) renderFichaNueva(); else renderFicha();
}
function renderFichaNueva(){
  $('ficha').innerHTML=`<h2>Nuevo cliente</h2>
    <p class="muted" style="margin-top:-6px;margin-bottom:14px">Rellena los datos y pulsa Crear. Después podrás añadirle carteras.</p>
    <div class="row"><input id="nfn" placeholder="Nombre"><input id="nfa" placeholder="Apellidos"></div>
    <div class="row" style="margin-top:8px"><input id="nfe" placeholder="Email"><input id="nft" placeholder="Teléfono"></div>
    <div class="row" style="margin-top:8px"><label class="chk">Idioma <select id="nfi">${Object.entries(IDIOMAS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" id="nci" checked> crear su cartera individual</label></div>
    <div class="row" style="margin-top:16px"><button class="primary" id="bCrear">Crear cliente</button><button class="ghost" id="bCanc">Cancelar</button><span class="err" id="nerr"></span></div>`;
  $('bCrear').onclick=crearCliente; $('bCanc').onclick=()=>{ NUEVO=false; renderClientes(); };
}
async function crearCliente(){
  const n=$('nfn').value.trim(); if(!n){ $('nerr').textContent='El nombre es obligatorio.'; return; }
  const pid=crypto.randomUUID();
  const l=[['alta_persona',{id:pid,nombre:n,apellidos:$('nfa').value.trim(),email:$('nfe').value.trim(),telefono:$('nft').value.trim(),idioma:$('nfi').value}]];
  if($('nci').checked){ const cid=crypto.randomUUID(); l.push(['alta_cartera',{id:cid,nombre:'Cartera individual',tipo:'individual'}]); l.push(['titular',{cartera:cid,persona:pid}]); }
  await apuntar(l); NUEVO=false; SEL=pid; await recargarYrender();
}
function renderFicha(){
  const st=ESTADO, c=$('ficha'); if(!SEL){ c.innerHTML=`<h2>Ficha</h2><p class="muted">Selecciona una persona de la lista, o pulsa “+ Nuevo cliente”.</p>`; return; }
  const p=st.personas[SEL], otras=Object.values(st.personas).filter(x=>x.id!==SEL);
  const cart=cartsDe(st,SEL).map(k=>{
    const t=titularesDe(st,k.cid);
    const chips=t.map(pid=>`<span class="chip">${nom(st.personas[pid])}${pid!==SEL?` <button data-q="${k.cid}" data-p="${pid}">×</button>`:''}</span>`).join('');
    const noT=otras.filter(x=>!t.includes(x.id));
    const add=noT.length?`<select data-add="${k.cid}"><option value="">+ titular…</option>${noT.map(x=>`<option value="${x.id}">${nom(x)}</option>`).join('')}</select>`:'';
    return `<div class="cartera"><div class="row"><input data-cn="${k.cid}" value="${esc(k.nombre)}" style="flex:1">
      <select data-ct="${k.cid}"><option value="individual" ${k.tipo==='individual'?'selected':''}>Individual</option><option value="conjunta" ${k.tipo==='conjunta'?'selected':''}>Conjunta</option></select>
      <button class="ghost" data-gc="${k.cid}">Guardar</button></div>
      <div class="chips" style="margin-top:8px">${chips}</div>${add}
      <div style="margin-top:6px"><button class="danger" data-baja="${k.cid}">Dar de baja</button>
        <button class="danger" data-del="${k.cid}" style="margin-left:6px">Eliminar</button>
        <span class="muted" style="margin-left:8px">${eur(Libro.patrimonio(st,k.cid))}</span></div></div>`;}).join('')||'<p class="muted">Sin carteras. Crea una abajo.</p>';
  c.innerHTML=`<h2>Ficha de ${nom(p)}</h2>
    <div class="row"><input id="fn" value="${esc(p.nombre)}" placeholder="Nombre"><input id="fa" value="${esc(p.apellidos)}" placeholder="Apellidos"></div>
    <div class="row" style="margin-top:8px"><input id="fe" value="${esc(p.email)}" placeholder="Email"><input id="ft" value="${esc(p.telefono)}" placeholder="Teléfono"></div>
    <div class="row" style="margin-top:8px"><label class="chk">Idioma <select id="fi">${Object.entries(IDIOMAS).map(([k,v])=>`<option value="${k}" ${(p.idioma||'es')===k?'selected':''}>${v}</option>`).join('')}</select></label>
      <button class="primary" id="bF">Guardar ficha</button><button class="danger" id="bDP" style="margin-left:auto">Eliminar cliente…</button><span class="muted" id="fm"></span></div>
    <div style="margin-top:16px"><h2>Carteras</h2>${cart}</div>
    <div style="margin-top:12px;border-top:1px solid var(--linea);padding-top:12px">
      <div class="row"><input id="ncn" placeholder="Nombre nueva cartera" value="Cartera individual" style="flex:1"></div>
      <p class="muted" style="margin:8px 0 4px">Otros titulares (marca para conjunta):</p>
      <div class="chks">${otras.map(x=>`<label class="chk"><input type="checkbox" class="co" value="${x.id}"> ${nom(x)}</label>`).join('')||'<span class="muted">no hay más personas</span>'}</div>
      <div class="row" style="margin-top:8px"><button class="primary" id="bNC">Crear cartera para ${p.nombre}</button></div></div>`;
  $('bF').onclick=guardarFicha; $('bNC').onclick=nuevaCartera; $('bDP').onclick=()=>borrarPersona(SEL);
  c.querySelectorAll('[data-gc]').forEach(b=>b.onclick=()=>guardarCartera(b.dataset.gc));
  c.querySelectorAll('[data-baja]').forEach(b=>b.onclick=()=>bajaCartera(b.dataset.baja));
  c.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>borrarCartera(b.dataset.del));
  c.querySelectorAll('[data-add]').forEach(s=>s.onchange=()=>{ if(s.value) addTitular(s.dataset.add,s.value); });
  c.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>quitaTitular(b.dataset.q,b.dataset.p));
}
async function altaPersona(){ const n=$('nom').value.trim(); if(!n) return; const a=$('ape').value.trim(); const pid=crypto.randomUUID();
  const l=[['alta_persona',{id:pid,nombre:n,apellidos:a,email:'',telefono:'',idioma:'es'}]];
  if($('ci').checked){ const cid=crypto.randomUUID(); l.push(['alta_cartera',{id:cid,nombre:'Cartera individual',tipo:'individual'}]); l.push(['titular',{cartera:cid,persona:pid}]); }
  await apuntar(l); SEL=pid; await recargarYrender(); }
async function guardarFicha(){ await apuntar([['edit_persona',{id:SEL,nombre:$('fn').value.trim(),apellidos:$('fa').value.trim(),email:$('fe').value.trim(),telefono:$('ft').value.trim(),idioma:$('fi').value}]]); await recargarYrender(); if($('fm'))$('fm').textContent='Guardado.'; }
async function nuevaCartera(){ const nombre=$('ncn').value.trim()||'Cartera'; const otros=[...document.querySelectorAll('.co:checked')].map(i=>i.value); const cid=crypto.randomUUID(); const tipo=otros.length?'conjunta':'individual';
  const l=[['alta_cartera',{id:cid,nombre,tipo}],['titular',{cartera:cid,persona:SEL}]]; for(const pid of otros) l.push(['titular',{cartera:cid,persona:pid}]); await apuntar(l); await recargarYrender(); }
async function guardarCartera(cid){ await apuntar([['edit_cartera',{id:cid,nombre:document.querySelector(`[data-cn="${cid}"]`).value.trim(),tipo:document.querySelector(`[data-ct="${cid}"]`).value}]]); await recargarYrender(); }
async function bajaCartera(cid){ await apuntar([['edit_cartera',{id:cid,baja:true}]]); await recargarYrender(); }
async function addTitular(cid,pid){ const st=ESTADO; const l=[['titular',{cartera:cid,persona:pid}]]; if(titularesDe(st,cid).length+1>=2&&st.carteras[cid]?.tipo==='individual') l.push(['edit_cartera',{id:cid,tipo:'conjunta'}]); await apuntar(l); await recargarYrender(); }
async function quitaTitular(cid,pid){ const st=ESTADO; const l=[['quita_titular',{cartera:cid,persona:pid}]]; if(titularesDe(st,cid).filter(x=>x!==pid).length<=1&&st.carteras[cid]?.tipo==='conjunta') l.push(['edit_cartera',{id:cid,tipo:'individual'}]); await apuntar(l); await recargarYrender(); }
function esDeCartera(cid){ return (ev)=>{ const p=ev.payload||{}; if((ev.tipo==='alta_cartera'||ev.tipo==='edit_cartera')&&p.id===cid) return true; if((ev.tipo==='titular'||ev.tipo==='quita_titular'||ev.tipo==='movimiento')&&p.cartera===cid) return true; if(ev.tipo==='correccion'&&(p.cartera===cid||p.movimiento?.cartera===cid)) return true; return false; }; }
async function borrarCartera(cid){ const st=ESTADO; if(!confirm(`Eliminar "${st.carteras[cid]?.nombre||'cartera'}" y sus movimientos de forma permanente. ¿Continuar?`)) return; await Libro.purgar(VAULT,esDeCartera(cid)); await recargarYrender(); }
async function borrarPersona(pid){ const st=ESTADO,p=st.personas[pid]; if(!p) return;
  const casc=Object.keys(st.carteras).filter(cid=>{const t=titularesDe(st,cid); return t.includes(pid)&&t.length===1;});
  if(!confirm(`Eliminar a ${nom(p)}${casc.length?` y ${casc.length} cartera(s) individual(es)`:''} de forma permanente. ¿Continuar?`)) return;
  const preds=casc.map(esDeCartera);
  await Libro.purgar(VAULT,(ev)=>{ const pl=ev.payload||{}; if((ev.tipo==='alta_persona'||ev.tipo==='edit_persona')&&pl.id===pid) return true; if((ev.tipo==='titular'||ev.tipo==='quita_titular')&&pl.persona===pid) return true; return preds.some(f=>f(ev)); });
  SEL=null; await recargarYrender(); }

// ============ ACTUALIZAR ============
function renderActualizar(){
  const st=ESTADO; const act=carterasActivas(st);
  if(!SELC && act.length) SELC=act[0].cid;
  const cart=st.carteras[SELC];
  const insts=Object.entries(st.instrumentos).sort((a,b)=>(a[1].nombre||'').localeCompare(b[1].nombre||''));
  const pos=SELC?Object.entries(st.posiciones).filter(([k,t])=>k.split('|')[0]===SELC&&Math.abs(t)>1e-8).map(([k,t])=>{const inst=k.split('|')[1]; const vl=vlUlt(st,inst); return {inst,tit:t,vl,valor:vl?t*vl:null};}):[];
  const liq=SELC?(st.liquidez[SELC]||0):0;
  $('view').innerHTML=`<h1>Actualizar</h1>
    <div class="card"><div class="row"><label class="chk">Cartera
      <select id="selc">${act.map(c=>`<option value="${c.cid}" ${c.cid===SELC?'selected':''}>${c.nombre} — ${titularesDe(st,c.cid).map(p=>nom(st.personas[p])).join(', ')}</option>`).join('')}</select></label>
      <span class="muted" style="margin-left:auto">Patrimonio: <b>${eur(SELC?Libro.patrimonio(st,SELC):0)}</b></span></div></div>
    <div class="split">
      <div class="card"><h2>Nuevo movimiento</h2>
        <div class="field"><label>Tipo</label><select id="mt">${TIPOS_MOV.map(t=>`<option>${t}</option>`).join('')}</select></div>
        <div class="field" id="fInst"><label>Instrumento</label><select id="mi"><option value="">— Selecciona —</option>${insts.map(([id,i])=>`<option value="${id}">${i.nombre}</option>`).join('')}<option value="__n">+ Nuevo…</option></select></div>
        <div class="field" id="fNew" style="display:none"><label>Instrumento nuevo</label><input id="mnew" placeholder="Nombre"><input id="mnewisin" placeholder="ISIN (opcional)" style="margin-top:6px"></div>
        <div class="row"><div class="field"><label>Importe (€)</label><input id="mimp" inputmode="decimal"></div>
          <div class="field" id="fPre"><label>VL de compra</label><input id="mpre" inputmode="decimal"></div></div>
        <div class="field"><label>Fecha</label><input id="mf" type="date" value="2026-08-31"></div>
        <div class="err" id="me"></div>
        <button class="primary" id="bMov">Guardar movimiento</button></div>
      <div class="card"><h2>Posiciones</h2>
        <table><thead><tr><th>Fondo</th><th class="num">Títulos</th><th class="num">VL</th><th class="num">Valor</th></tr></thead>
          <tbody>${pos.map(p=>`<tr><td>${st.instrumentos[p.inst]?.nombre||'—'}</td><td class="num">${new Intl.NumberFormat('es-ES',{maximumFractionDigits:4}).format(p.tit)}</td><td class="num">${p.vl?new Intl.NumberFormat('es-ES',{maximumFractionDigits:4}).format(p.vl):'—'}</td><td class="num">${p.valor!=null?eur(p.valor):'—'}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">Sin posiciones.</td></tr>'}
          <tr class="liq"><td>Liquidez</td><td class="num">—</td><td class="num">—</td><td class="num">${eur(liq)}</td></tr></tbody></table>
        <h2 style="margin-top:16px">Actualizar VL de un fondo</h2>
        <div class="row"><select id="vi">${insts.map(([id,i])=>`<option value="${id}">${i.nombre}</option>`).join('')}</select>
          <input id="vf" type="date" value="2026-08-31" style="background:#fff;border-color:var(--linea)"><input id="vv" inputmode="decimal" placeholder="VL" style="max-width:120px">
          <button class="ghost" id="bVL">Guardar VL</button></div></div></div>
    <div class="card"><h2>Instrumentos (ISIN)</h2>
      <p class="muted" style="margin-top:-6px;margin-bottom:12px">Escribe el ISIN de cada producto. Aparece en Análisis y en los informes.</p>
      <table><thead><tr><th>Instrumento</th><th>Tipo</th><th>ISIN</th></tr></thead>
        <tbody>${insts.map(([id,i])=>`<tr><td>${i.nombre}</td><td class="muted">${i.tipo}</td><td><input data-isin="${id}" value="${esc(i.isin||'')}" placeholder="ES0000000000" style="background:#fff;border-color:var(--linea);width:190px"></td></tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:12px"><button class="primary" id="bISIN">Guardar ISIN</button><span class="muted" id="isinmsg"></span></div></div>`;
  $('selc').onchange=e=>{ SELC=e.target.value; renderActualizar(); };
  const t=$('mt'), usaF=()=>['Compra','Venta'].includes(t.value);
  const sync=()=>{ $('fInst').style.display=usaF()?'':'none'; $('fPre').style.display=usaF()?'':'none'; $('fNew').style.display=(usaF()&&$('mi').value==='__n')?'':'none'; };
  t.onchange=sync; $('mi').onchange=sync; sync();
  $('bMov').onclick=guardarMov; $('bVL').onclick=guardarVL; if($('bISIN'))$('bISIN').onclick=guardarISIN;
}
const pnum=s=>{ s=String(s||'').trim().replace(/\s/g,''); if(!s) return NaN; if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.'); return parseFloat(s); };
async function guardarMov(){
  const st=ESTADO, tipo=$('mt').value, imp=pnum($('mimp').value), fecha=$('mf').value; $('me').textContent='';
  if(isNaN(imp)||imp<=0){ $('me').textContent='Importe no válido.'; return; }
  const usaF=['Compra','Venta'].includes(tipo); let instId=null, ev=[];
  if(usaF){
    let mi=$('mi').value; const pre=pnum($('mpre').value);
    if(!mi){ $('me').textContent='Elige instrumento.'; return; }
    if(isNaN(pre)||pre<=0){ $('me').textContent='Falta el VL de compra.'; return; }
    if(mi==='__n'){ const nm=$('mnew').value.trim(); if(!nm){ $('me').textContent='Nombre del instrumento nuevo.'; return; } instId=crypto.randomUUID(); ev.push(['alta_instrumento',{id:instId,nombre:nm,tipo:'fondo',isin:($('mnewisin')?$('mnewisin').value.trim():'')}]); }
    else instId=mi;
    const tit=imp/pre;
    ev.push(['vl',{instrumento:instId,fecha,valor:pre}]); // valora al VL de compra si no hay otro
    ev.push(['movimiento',{cartera:SELC,fecha,instrumento:instId,titulos_delta:tipo==='Compra'?tit:-tit,efectivo_delta:tipo==='Compra'?-imp:imp,precio:pre}]);
  } else {
    const signo=['Aportación','Dividendo'].includes(tipo)?1:-1;
    ev.push(['movimiento',{cartera:SELC,fecha,efectivo_delta:signo*imp,titulos_delta:0}]);
  }
  await apuntar(ev); $('mimp').value=''; $('mpre').value=''; if($('mnew'))$('mnew').value=''; await recargarYrender();
}
async function guardarVL(){ const inst=$('vi').value, f=$('vf').value, v=pnum($('vv').value); if(isNaN(v)) return; await apuntar([['vl',{instrumento:inst,fecha:f,valor:v}]]); await recargarYrender(); }

async function guardarISIN(){
  const st=ESTADO; const cambios=[];
  document.querySelectorAll('[data-isin]').forEach(inp=>{ const id=inp.dataset.isin, v=inp.value.trim(); if((st.instrumentos[id]&&st.instrumentos[id].isin||'')!==v) cambios.push(['edit_instrumento',{id,isin:v}]); });
  if(cambios.length){ await apuntar(cambios); await recargarYrender(); if($('isinmsg'))$('isinmsg').textContent='Guardado.'; }
}
// ============ INFORMES ============
function renderInformes(){
  const st=ESTADO; const personas=Object.values(st.personas);
  if(!SELCLI && personas.length) SELCLI=personas[0].id;
  const cli=st.personas[SELCLI]; const carts=cli?cartsDe(st,SELCLI):[];
  $('view').innerHTML=`<h1>Informes</h1>
    <div class="card no-print"><div class="row"><label class="chk">Cliente
      <select id="ic">${personas.map(p=>`<option value="${p.id}" ${p.id===SELCLI?'selected':''}>${nom(p)}</option>`).join('')}</select></label>
      <span class="muted">Carteras:</span> ${carts.map(c=>`<label class="chk"><input type="checkbox" class="icart" value="${c.cid}" checked> ${c.nombre}</label>`).join('')||'<span class="muted">este cliente no tiene carteras</span>'}
      <button class="primary" id="bGen">Generar</button><button class="ghost" id="bPdf" style="margin-left:auto">Exportar a PDF</button></div></div>
    <div id="doc"></div>`;
  $('ic').onchange=e=>{ SELCLI=e.target.value; renderInformes(); };
  $('bGen').onclick=genInforme; $('bPdf').onclick=()=>window.print();
  genInforme();
}
function genInforme(){
  const st=ESTADO, cli=st.personas[SELCLI]; if(!cli){ $('doc').innerHTML=''; return; }
  const cids=[...document.querySelectorAll('.icart:checked')].map(i=>i.value);
  if(!cids.length){ $('doc').innerHTML='<div class="page"><div class="muted">Marca al menos una cartera.</div></div>'; return; }
  const e0=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:0,useGrouping:'always'}).format(Math.round(n||0))+' €';
  const p2=n=>(n>=0?'+':'')+new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format((n||0)*100)+' %';
  const p1=n=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1}).format((n||0)*100)+' %';
  const t4=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:4}).format(n||0);
  const patTotal=cids.reduce((a,c)=>a+Libro.patrimonio(st,c),0);
  const valF=patTotal-cids.reduce((a,c)=>a+(st.liquidez[c]||0),0);
  const prod=productos(st,cids);
  // agregar histórico anual por año
  const anualMap={};
  cids.forEach(c=>(st.hist[c]?.anual||[]).forEach(y=>{const o=anualMap[y.a]||(anualMap[y.a]={a:y.a,ini:0,fin:0,ap:0,re:0,res:0,rents:[]});o.ini+=y.ini||0;o.fin+=y.fin||0;o.ap+=y.ap||0;o.re+=y.re||0;o.res+=(y.res!=null?y.res:0);if(y.rent!=null)o.rents.push(y.rent);}));
  const A=Object.values(anualMap).sort((x,y)=>x.a-y.a).map(y=>({...y,rent:y.rents.length===1?y.rents[0]:(y.ini?y.res/y.ini:null)}));
  // mensual: la cartera con más meses
  let M=[]; cids.forEach(c=>{const m=st.hist[c]?.mensual||[]; if(m.length>M.length) M=m;});
  const ops=cids.flatMap(c=>st.hist[c]?.operaciones||[]);
  const last=A[A.length-1]||{};
  const desdeIni=A.reduce((a,y)=>a*(1+(y.rent||0)),1)-1;
  const apInicial=A.length?Math.abs(A[0].ini||0):0; const apPer=Math.abs(last.ap||0), rePer=Math.abs(last.re||0), apTot=apInicial+A.reduce((a,y)=>a+Math.abs(y.ap||0),0), reTot=A.reduce((a,y)=>a+Math.abs(y.re||0),0);
  const ultMes=M.length?M[M.length-1]:null;
  // charts
  const donut=(segs)=>{const tot=segs.reduce((s,x)=>s+x.v,0)||1,r=60,C=2*Math.PI*r;let off=0,g='';const col=['#8E7577','#E5D0D2','#575755','#B79A9C','#C9B9BA','#7d6a6b','#ddc8c9','#9c8788'];
    segs.forEach((sg,i)=>{const d=sg.v/tot*C;g+=`<circle cx="80" cy="80" r="${r}" fill="none" stroke="${col[i%col.length]}" stroke-width="28" stroke-dasharray="${d} ${C-d}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"/>`;off+=d;});
    const leg=segs.map((sg,i)=>`<div class="it"><span class="sw" style="background:${col[i%col.length]}"></span>${sg.n}<b> ${p1(sg.v/tot)}</b></div>`).join('');
    return `<div class="donut"><svg viewBox="0 0 160 160" style="width:150px">${g}<text x="80" y="76" text-anchor="middle" font-size="8" fill="#575755">TOTAL</text><text x="80" y="92" text-anchor="middle" font-size="12" font-weight="800">${e0(tot)}</text></svg><div class="leg">${leg}</div></div>`;};
  const linea=(vals)=>{if(!vals.length)return '<div class="muted">Sin evolución mensual.</div>';const W=720,H=250,pL=40,pR=14,pT=18,pB=24;const cum=[];let acc=1;vals.forEach(v=>{acc*=(1+v);cum.push(acc-1);});const lo=Math.min(0,...cum),hi=Math.max(...cum)+0.01;const X=i=>pL+i*((W-pL-pR)/(cum.length-1||1)),Y=v=>pT+(H-pT-pB)*(1-(v-lo)/((hi-lo)||1));let g='';for(let k=0;k<=3;k++){const v=lo+(hi-lo)*k/3;g+=`<line x1="${pL}" y1="${Y(v)}" x2="${W-pR}" y2="${Y(v)}" stroke="#EFE7E7"/><text x="${pL-5}" y="${Y(v)+3}" text-anchor="end" font-size="8" fill="#999">${p1(v)}</text>`;}const pts=cum.map((v,i)=>`${X(i)},${Y(v)}`).join(' ');g+=`<polygon points="${pL},${Y(lo)} ${pts} ${W-pR},${Y(lo)}" fill="#8E7577" fill-opacity="0.1"/><polyline points="${pts}" fill="none" stroke="#8E7577" stroke-width="2"/>`;cum.forEach((v,i)=>{g+=`<circle cx="${X(i)}" cy="${Y(v)}" r="2.5" fill="#8E7577"/><text x="${X(i)}" y="${Y(v)-7}" text-anchor="middle" font-size="8" font-weight="700">${p1(v)}</text>`;});return `<div class="chart"><svg viewBox="0 0 ${W} ${H}">${g}</svg></div>`;};
  const barras=(labels,vals)=>{if(!vals.length)return '';const W=560,H=230,pL=34,pR=10,pT=16,pB=22;const lo=Math.min(0,...vals),hi=Math.max(0,...vals),pad=(hi-lo)*0.15||0.02;const y0=lo-pad,y1=hi+pad,step=(W-pL-pR)/vals.length,bw=step*0.6,Y=v=>pT+(H-pT-pB)*(1-(v-y0)/((y1-y0)||1));let g=`<line x1="${pL}" y1="${Y(0)}" x2="${W-pR}" y2="${Y(0)}" stroke="#D9CFCF"/>`;vals.forEach((v,i)=>{const x=pL+i*step+step/2-bw/2,yt=Y(Math.max(0,v)),yb=Y(Math.min(0,v));g+=`<rect x="${x}" y="${yt}" width="${bw}" height="${Math.max(1,yb-yt)}" rx="2" fill="${v<0?'#575755':'#A98A8C'}"/><text x="${x+bw/2}" y="${v<0?yb+10:yt-3}" text-anchor="middle" font-size="8" font-weight="700">${p1(v)}</text><text x="${x+bw/2}" y="${H-8}" text-anchor="middle" font-size="8" fill="#575755">${labels[i]}</text>`;});return `<div class="chart"><svg viewBox="0 0 ${W} ${H}">${g}</svg></div>`;};
  const MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const kpi=(ic,k,v)=>`<div class="kpi"><div class="kic">${ic}</div><div class="ktx"><div class="k">${k}</div><div class="v">${v}</div></div></div>`;
  const secbar=(t,cap)=>`<div class="secbar"><span class="st">${t}</span>${cap?`<span class="cap">${cap}</span>`:''}</div>`;
  const AVISO='Documento informativo de carácter confidencial, para uso exclusivo del cliente. La información se ha elaborado a partir de fuentes consideradas fiables a la fecha de emisión y no constituye asesoramiento ni recomendación de inversión. Los datos se refieren al cierre indicado y pueden variar. Rentabilidades pasadas no garantizan rentabilidades futuras.';
  const HT=(sub)=>`<div class="htop"><div class="t">${nom(cli).toUpperCase()}<small>INFORME DE CARTERA</small></div><div class="r">${sub}</div></div>`;
  const FT=n=>`<div class="foot2"><span>Informe confidencial · uso exclusivo del cliente</span><span>31/08/2026 · ${n}/3</span></div>`;
  // Composición detallada (coste, valor actual, diferencia) desde el libro de movimientos
  const _set=new Set(cids), _agg={};
  for(const m of st.movimientos){ if(!_set.has(m.cartera)||!m.instrumento) continue; const a=_agg[m.instrumento]||(_agg[m.instrumento]={tit:0,cT:0,cTP:0}); a.tit+=m.titulos_delta||0; if((m.titulos_delta||0)>0&&m.precio){a.cT+=m.titulos_delta;a.cTP+=m.titulos_delta*m.precio;} }
  let det=[];
  for(const [inst,a] of Object.entries(_agg)){ if(Math.abs(a.tit)<1e-8) continue; const vl=vlUlt(st,inst); const pm=a.cT>0?a.cTP/a.cT:null; const vini=pm!=null?a.tit*pm:null; const vact=vl!=null?a.tit*vl:null; det.push({nombre:st.instrumentos[inst]?.nombre||'—',pm,vini,vact,dif:(vini!=null&&vact!=null)?vact-vini:null}); }
  const _tot=det.reduce((s,r)=>s+(r.vact||0),0)||1; det.forEach(r=>r.peso=(r.vact||0)/_tot); det.sort((a,b)=>(b.vact||0)-(a.vact||0));
  const compRows=det.map(r=>`<tr><td>${r.nombre}</td><td class="num">${r.pm!=null?t4(r.pm):'—'}</td><td class="num">${r.vini!=null?e0(r.vini):'—'}</td><td class="num">${r.vact!=null?e0(r.vact):'—'}</td><td class="num ${r.dif>=0?'pos':'neg'}">${r.dif!=null?e0(r.dif):'—'}</td><td class="num ${r.dif>=0?'pos':'neg'}">${(r.vini&&r.dif!=null)?p1(r.dif/r.vini):'—'}</td><td class="num">${p1(r.peso)}</td></tr>`).join('');
  const compTot=`<tr class="tot"><td>Total</td><td></td><td class="num">${e0(det.reduce((s,r)=>s+(r.vini||0),0))}</td><td class="num">${e0(det.reduce((s,r)=>s+(r.vact||0),0))}</td><td class="num">${e0(det.reduce((s,r)=>s+(r.dif||0),0))}</td><td></td><td class="num">100,0 %</td></tr>`;
  const compTable=`<table><thead><tr><th>Activo</th><th class="num">VL compra</th><th class="num">Valor inicial</th><th class="num">Valor actual</th><th class="num">Dif. €</th><th class="num">Dif. %</th><th class="num">Peso</th></tr></thead><tbody>${compRows}${compTot}</tbody></table>`;
  const p1html=`<div class="page">${HT('Cierre 31/08/2026')}<div class="body">
    <div class="kpirow">${kpi('€','Patrimonio',e0(patTotal))}${kpi('▦','Resultado 2026',last.res!=null?e0(last.res):'—')}${kpi('%','Rentabilidad 2026',last.rent!=null?p1(last.rent):'—')}${kpi('↗','Último mes',ultMes!=null?p1(ultMes):'—')}</div>
    <div>${secbar('Composición actual','Detalle de la inversión')}<div class="panel">${compTable}</div></div>
    <div class="cols2 grow"><div>${secbar('Distribución por pesos','Peso de cada instrumento')}<div class="panel pc">${donut(det.map(r=>({n:r.nombre,v:r.vact||0})))}</div></div>
      <div>${secbar('Evolución del año','Rentabilidad acumulada 2026')}<div class="panel">${linea(M)}</div></div></div>
    </div>${FT(1)}</div>`;
  const arows=A.map(y=>`<tr><td>${y.a}</td><td class="num">${e0(y.ini)}</td><td class="num">${e0(y.fin)}</td><td class="num">${y.ap?e0(Math.abs(y.ap)):'—'}</td><td class="num">${y.re?e0(-Math.abs(y.re)):'—'}</td><td class="num">${y.res!=null?e0(y.res):'—'}</td><td class="num">${y.rent!=null?p1(y.rent):'—'}</td><td>${y.a>=2026?'En curso':'Cerrado'}</td></tr>`).join('');
  const p2html=`<div class="page">${HT('Histórico anual')}<div class="body">
    <div>${secbar('Detalle anual','Aportaciones, retiradas y resultado')}<div class="panel"><table class="anual"><thead><tr><th>Año</th><th class="num">Inicio €</th><th class="num">Fin €</th><th class="num">Aport. €</th><th class="num">Retir. €</th><th class="num">Resultado €</th><th class="num">Rent.</th><th>Estado</th></tr></thead><tbody>${arows||'<tr><td colspan="8" class="muted">Sin histórico anual.</td></tr>'}</tbody></table>${A.length?`<p class="riesgo">Volatilidad anual: <b>${p1(stdev(A.map(y=>y.rent||0)))}</b> · Caída máxima: <b>${p1(maxDD(A.map(y=>y.rent||0)))}</b></p>`:''}</div></div>
    <div class="cols2 grow"><div>${secbar('Rentabilidad mensual 2026')}<div class="panel">${barras(MES,M)}</div></div><div>${secbar('Rentabilidad anual')}<div class="panel">${barras(A.map(y=>y.a),A.map(y=>y.rent||0))}</div></div></div>
    </div>${FT(2)}</div>`;
  const orows=ops.map(o=>`<tr><td>${o.fecha}</td><td>${o.op}</td><td>${o.inst}</td><td class="num">${o.imp!=null?new Intl.NumberFormat('es-ES',{maximumFractionDigits:0,useGrouping:'always'}).format(o.imp):''}</td><td class="num">${o.precio!=null?t4(o.precio):''}</td><td class="num">${o.tit!=null?t4(o.tit):''}</td></tr>`).join('');
  const p3html=`<div class="page">${HT('Operaciones y movimientos')}<div class="body">
    <div class="grow">${secbar('Operaciones desde inicio')}<div class="panel"><table><thead><tr><th>Fecha</th><th>Operación</th><th>Instrumento</th><th class="num">Importe €</th><th class="num">Precio</th><th class="num">Títulos</th></tr></thead><tbody>${orows||'<tr><td colspan="6" class="muted">Sin operaciones.</td></tr>'}</tbody></table></div></div>
    <div class="cols2"><div>${secbar('Aportaciones y disposiciones')}<div class="panel"><div class="card2"><div class="r2"><span>Aportaciones 2026</span><b>${e0(apPer)}</b></div><div class="r2"><span>Disposiciones 2026</span><b>${e0(rePer)}</b></div><div class="r2"><span>Aportación inicial (inicio de la relación)</span><b>${e0(apInicial)}</b></div><div class="r2"><span>Aportaciones totales desde inicio</span><b>${e0(apTot)}</b></div><div class="r2"><span>Disposiciones desde inicio</span><b>${e0(reTot)}</b></div></div></div></div>
      <div>${secbar('Aviso legal')}<div class="panel"><div class="aviso2">${AVISO}</div></div></div></div>
    </div>${FT(3)}</div>`;
  $('doc').innerHTML=p1html+p2html+p3html;
}

if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
boot();
