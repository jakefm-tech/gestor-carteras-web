const $ = (id) => document.getElementById(id);
const eur = (n) => new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0)+' €';
const pct = (n) => new Intl.NumberFormat('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1}).format((n||0)*100)+' %';
const nom = (p) => p ? `${p.nombre||''} ${p.apellidos||''}`.trim()||'(sin nombre)' : '—';
const esc = (s) => String(s==null?'':s).replace(/"/g,'&quot;');
const IDIOMAS = {es:'Español',ca:'Català',en:'English'};
const TIPOS_MOV = ['Compra','Venta','Aportación','Disposición','Dividendo','Comisión'];

let VAULT=null, AUTOR=localStorage.getItem('autor')||null, ESTADO=null, SEL=null, SELC=null, SELCLI=null;

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
function renderAnalisis(){
  const st=ESTADO; const act=carterasActivas(st);
  const patCart=act.map(c=>({...c,pat:Libro.patrimonio(st,c.cid)}));
  const patTotal=patCart.reduce((a,c)=>a+c.pat,0);
  const liqTotal=act.reduce((a,c)=>a+(st.liquidez[c.cid]||0),0);
  const prod=productos(st, act.map(c=>c.cid));
  // concentración: top clientes por patrimonio (sumando sus carteras)
  const porPersona={};
  for(const c of patCart) for(const pid of titularesDe(st,c.cid)) porPersona[pid]=(porPersona[pid]||0)+c.pat;
  const topCli=Object.entries(porPersona).sort((a,b)=>b[1]-a[1]).slice(0,5);
  $('view').innerHTML=`<h1>Análisis de la cartera</h1>
    <div class="card"><h2>Resumen</h2>
      <div class="kpis3">
        <div class="mini"><div class="k">Clientes</div><div class="v">${Object.keys(st.personas).length}</div></div>
        <div class="mini"><div class="k">Carteras</div><div class="v">${act.length}</div></div>
        <div class="mini"><div class="k">Patrimonio total</div><div class="v">${eur(patTotal)}</div></div>
        <div class="mini"><div class="k">Liquidez</div><div class="v">${pct(liqTotal/(patTotal||1))}</div></div>
      </div></div>
    <div class="card"><h2>Patrimonio por producto</h2>
      <table><thead><tr><th>Producto</th><th class="num">Valor</th><th class="num">Peso</th><th class="num">Carteras</th></tr></thead>
        <tbody>${prod.map(p=>`<tr><td>${p.nombre}</td><td class="num">${eur(p.valor)}</td><td class="num">${pct(p.pct)}</td><td class="num">${p.n}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">Sin datos.</td></tr>'}</tbody></table></div>
    <div class="card"><h2>Concentración</h2>
      <p class="muted" style="margin:0 0 8px">Mayores clientes por patrimonio (riesgo de dependencia). El producto más pesado es ${prod[0]?`<b>${prod[0].nombre}</b> con ${pct(prod[0].pct)} del total`:'—'}.</p>
      <table><thead><tr><th>Cliente</th><th class="num">Patrimonio</th><th class="num">% del total</th></tr></thead>
        <tbody>${topCli.map(([pid,v])=>`<tr><td>${nom(st.personas[pid])}</td><td class="num">${eur(v)}</td><td class="num">${pct(v/(patTotal||1))}</td></tr>`).join('')}</tbody></table>
      <div class="avisos">Los ratios de riesgo histórico (volatilidad, caída máxima, rentabilidad en el tiempo, Sharpe) necesitan la serie mensual de cada cartera, que aún no está migrada. Es el siguiente paso.</div></div>`;
}

// ============ CLIENTES ============
function renderClientes(){
  const st=ESTADO; const personas=Object.values(st.personas); if(SEL&&!st.personas[SEL]) SEL=null;
  const lista=personas.map(p=>`<div class="item ${p.id===SEL?'sel':''}" data-pid="${p.id}"><div class="n">${nom(p)}</div><div class="m">${cartsDe(st,p.id).length} cartera(s)</div></div>`).join('')||'<div class="muted">Sin personas.</div>';
  $('view').innerHTML=`<h1>Clientes</h1>
    <div class="split">
      <div class="card"><h2>Personas</h2><div id="lp">${lista}</div>
        <div style="margin-top:12px;border-top:1px solid var(--linea);padding-top:12px">
          <div class="row"><input id="nom" placeholder="Nombre"><input id="ape" placeholder="Apellidos"></div>
          <div class="row" style="margin-top:8px"><label class="chk"><input type="checkbox" id="ci" checked> con cartera individual</label>
            <button class="primary" id="bAlta">Añadir persona</button></div></div></div>
      <div class="card" id="ficha"></div></div>`;
  document.querySelectorAll('.item').forEach(e=>e.onclick=()=>{ SEL=e.dataset.pid; renderClientes(); });
  $('bAlta').onclick=altaPersona; renderFicha();
}
function renderFicha(){
  const st=ESTADO, c=$('ficha'); if(!SEL){ c.innerHTML=`<h2>Ficha</h2><p class="muted">Selecciona una persona, o crea una nueva.</p>`; return; }
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
        <div class="field" id="fNew" style="display:none"><label>Nombre instrumento nuevo</label><input id="mnew"></div>
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
          <button class="ghost" id="bVL">Guardar VL</button></div></div></div>`;
  $('selc').onchange=e=>{ SELC=e.target.value; renderActualizar(); };
  const t=$('mt'), usaF=()=>['Compra','Venta'].includes(t.value);
  const sync=()=>{ $('fInst').style.display=usaF()?'':'none'; $('fPre').style.display=usaF()?'':'none'; $('fNew').style.display=(usaF()&&$('mi').value==='__n')?'':'none'; };
  t.onchange=sync; $('mi').onchange=sync; sync();
  $('bMov').onclick=guardarMov; $('bVL').onclick=guardarVL;
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
    if(mi==='__n'){ const nm=$('mnew').value.trim(); if(!nm){ $('me').textContent='Nombre del instrumento nuevo.'; return; } instId=crypto.randomUUID(); ev.push(['alta_instrumento',{id:instId,nombre:nm,tipo:'fondo'}]); }
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
  const st=ESTADO; const cli=st.personas[SELCLI]; if(!cli){ $('doc').innerHTML=''; return; }
  const cids=[...document.querySelectorAll('.icart:checked')].map(i=>i.value);
  const patTotal=cids.reduce((a,cid)=>a+Libro.patrimonio(st,cid),0);
  const valF=cids.reduce((a,cid)=>a+Object.entries(st.posiciones).filter(([k,t])=>k.split('|')[0]===cid&&Math.abs(t)>1e-8).reduce((s,[k,t])=>{const vl=vlUlt(st,k.split('|')[1]); return s+(vl?t*vl:0);},0),0);
  const liq=cids.reduce((a,cid)=>a+(st.liquidez[cid]||0),0);
  const prod=productos(st,cids);
  const detalle=cids.map(cid=>{
    const c=st.carteras[cid]; const pat=Libro.patrimonio(st,cid);
    const rows=Object.entries(st.posiciones).filter(([k,t])=>k.split('|')[0]===cid&&Math.abs(t)>1e-8).map(([k,t])=>{const inst=k.split('|')[1]; const vl=vlUlt(st,inst); const val=vl?t*vl:null; return `<tr><td>${st.instrumentos[inst]?.nombre||'—'}</td><td class="num">${new Intl.NumberFormat('es-ES',{maximumFractionDigits:4}).format(t)}</td><td class="num">${vl?new Intl.NumberFormat('es-ES',{maximumFractionDigits:4}).format(vl):'—'}</td><td class="num">${val!=null?eur(val):'—'}</td><td class="num">${val!=null?pct(val/pat):'—'}</td></tr>`;}).join('');
    return `<h3 class="car">${c.nombre} · ${c.tipo} · ${titularesDe(st,cid).map(p=>nom(st.personas[p])).join(', ')}</h3>
      <table><thead><tr><th>Fondo</th><th class="num">Títulos</th><th class="num">VL</th><th class="num">Valor</th><th class="num">Peso</th></tr></thead>
        <tbody>${rows}<tr class="liq"><td>Liquidez</td><td class="num">—</td><td class="num">—</td><td class="num">${eur(st.liquidez[cid]||0)}</td><td class="num">${pct((st.liquidez[cid]||0)/pat)}</td></tr>
        <tr class="tot"><td>Total</td><td></td><td></td><td class="num">${eur(pat)}</td><td class="num">100,0 %</td></tr></tbody></table>`;
  }).join('');
  $('doc').innerHTML=`<div class="page"><div class="htop"><div class="t">${nom(cli).toUpperCase()}<small>INFORME DE CARTERA</small></div><div class="r">A 31/08/2026 · ${IDIOMAS[cli.idioma||'es']}</div></div>
    <div class="kpirow" style="margin-top:16px">
      <div class="kpi"><div class="k">Patrimonio</div><div class="v">${eur(patTotal)}</div></div>
      <div class="kpi"><div class="k">En fondos</div><div class="v">${eur(valF)}</div></div>
      <div class="kpi"><div class="k">Liquidez</div><div class="v">${eur(liq)}</div></div></div>
    <h2 class="sec2">Patrimonio por producto</h2>
    <table><thead><tr><th>Producto</th><th class="num">Valor</th><th class="num">Peso</th></tr></thead>
      <tbody>${prod.map(p=>`<tr><td>${p.nombre}</td><td class="num">${eur(p.valor)}</td><td class="num">${pct(p.pct)}</td></tr>`).join('')}</tbody></table>
    <h2 class="sec2">Detalle de posiciones</h2>${detalle}
    <div class="foot2">Informe confidencial · uso exclusivo del cliente · ${nom(cli)}</div></div>`;
}

if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
boot();
