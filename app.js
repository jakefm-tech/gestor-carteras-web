const $ = (id) => document.getElementById(id);
const FONDOS_UNIVERSO=[{"n": "GESIURIS EURO EQUITIES FI - CLASE A", "g": "G", "v": "RVE", "rv": 0}, {"n": "GESIURIS EURO EQUITIES FI - CLASE C", "g": "G", "v": "RVE", "rv": 0}, {"n": "GESIURIS HEALTHCARE CLASE A", "g": "G", "v": "RVI", "rv": 0}, {"n": "GESIURIS HEALTHCARE CLASE C", "g": "G", "v": "RVI", "rv": 0}, {"n": "GESIURIS CAT PATRIMONIS SICAV", "g": "G", "v": "GLOB", "rv": 0}, {"n": "GESIURIS PATRIMONIAL FI - CLASE A", "g": "G", "v": "GLOB", "rv": 0}, {"n": "GESIURIS PATRIMONIAL FI - CLASE C", "g": "G", "v": "GLOB", "rv": 0}, {"n": "GESIURIS BALANCED EURO FI", "g": "G", "v": "RVME", "rv": 0}, {"n": "CGI SICAV", "g": "G", "v": "GLOB", "rv": 0}, {"n": "GESIURIS IURISFOND FI", "g": "G", "v": "RFME", "rv": 0}, {"n": "GESIURIS MULTIGESTION FIXED INCOME", "g": "G", "v": "RFE", "rv": 0}, {"n": "GESIURIS MIXTO INT FI", "g": "G", "v": "RVMI", "rv": 0}, {"n": "GESIURIS I2 DESARROLLO SOSTENIBLE ISR FI", "g": "G", "v": "RFI", "rv": 0}, {"n": "HORMA - CLASE A", "g": "G", "v": "RVI", "rv": 0}, {"n": "HORMA - CLASE C", "g": "G", "v": "RVI", "rv": 0}, {"n": "REGATA FUND FIL", "g": "G", "v": "GLOB", "rv": 0}, {"n": "JAPAN DEEP VALUE FUND FI", "g": "G", "v": "RVI", "rv": 0}, {"n": "PANDA AGRICULTURE & WATER FUND FI", "g": "G", "v": "RVI", "rv": 0}, {"n": "KOALA FUND, FI", "g": "G", "v": "GLOB", "rv": 0}, {"n": "KOALA CAPITAL SICAV", "g": "G", "v": "GLOB", "rv": 0}, {"n": "ANNUALCYCLES - CLASE C", "g": "G", "v": "GLOB", "rv": 0}, {"n": "GOOD VALUE SICAV SA (D-1)", "g": "G", "v": "GLOB", "rv": 0}, {"n": "INTELLIGENT DATA & BOTS SICAV, SA (D-1)", "g": "G", "v": "GLOB", "rv": 0}];
const eur = (n) => new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'}).format(n||0)+' €';
const pct = (n) => new Intl.NumberFormat('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1}).format((n||0)*100)+' %';
const nom = (p) => p ? `${p.nombre||''} ${p.apellidos||''}`.trim()||'(sin nombre)' : '—';
const esc = (s) => String(s==null?'':s).replace(/"/g,'&quot;');
const IDIOMAS = {es:'Español',ca:'Català',en:'English'};
const TIPOS_MOV = ['Compra','Venta','Aportación','Disposición','Dividendo','Comisión'];

let VAULT=null, AUTOR=localStorage.getItem('autor')||null, ESTADO=null, SEL=null, SELC=null, SELCLI=null, SELFECHA='', NUEVO=false, FILTRO='';
const ASESORES={'AJ':'AJ (Ana y Jacobo)','Francisco Ragolta':'Paco Ragolta'};
const ASESOR_AUTOR={jacobo:'AJ',ana:'AJ',francisco:'Francisco Ragolta'};
const asesorActual=()=>ASESOR_AUTOR[AUTOR]||'AJ';

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
        <label><input type="radio" name="au" value="ana" ${AUTOR==='ana'?'checked':''}> Ana</label>
        <label><input type="radio" name="au" value="francisco" ${AUTOR==='francisco'?'checked':''}> Paco Ragolta</label></div>
      <div class="row" style="margin-top:14px"><button class="primary" id="bg" disabled>Entrar</button></div></div></div></div>`;
  const rg=()=>{ $('bg').disabled=!(VAULT&&AUTOR); };
  $('bp').onclick=async()=>{ try{ if(hg){ if(await Libro.permiso(hg,true)) VAULT=hg; } else VAULT=await Libro.elegirCarpeta(); if(VAULT){$('pm').textContent='✓ conectada'; rg();} }catch(e){ $('pm').textContent='No se pudo conectar.'; } };
  document.querySelectorAll('input[name=au]').forEach(r=>r.onchange=()=>{ AUTOR=r.value; rg(); });
  $('bg').onclick=()=>{ localStorage.setItem('autor',AUTOR); entrar(); }; rg();
}

let TAB='panel';
let CLIORD='pat';
let FICHATAB='detalle';
let DETMODE='ver';
function entrar(){
  document.body.innerHTML=`<div class="top"><span class="brand">Gestor de Carteras</span><span class="user">Usuario: ${AUTOR} · datos en OneDrive</span></div>
    <div class="tabs">
      <div class="tab" data-t="panel">Panel</div>
      <div class="tab" data-t="analisis">Análisis</div>
      <div class="tab" data-t="clientes">Clientes</div>
      <div class="tab" data-t="valores">Valores</div>
      <div class="tab" data-t="liquidativos">Liquidativos</div>
      <div class="tab" data-t="informes">Informes</div>
      <div class="tab" data-t="propuestas">Propuestas</div>
      <div class="tab" data-t="simulador">Simulador</div>
    </div><div class="wrap" id="view"></div>`;
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{ TAB=t.dataset.t; pintarTabs(); recargarYrender(); });
  pintarTabs(); recargarYrender(); window.addEventListener('focus',()=>{ const el=document.activeElement; if(el&&/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return; if(TAB==='clientes'||TAB==='actualizar'||TAB==='simulador'||TAB==='propuestas') return; recargarYrender(); });
}
function pintarTabs(){ document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.t===TAB)); }
async function recargarYrender(){ try{ ESTADO=Libro.reconstruir(await Libro.cargarEventos(VAULT)); }catch(e){ ESTADO=Libro.reconstruir([]); } render(); }
function render(){ ({panel:renderPanel,analisis:renderAnalisis,clientes:renderClientes,valores:renderValores,liquidativos:renderLiquidativos,informes:renderInformes,propuestas:renderPropuestas,simulador:renderSimulador}[TAB]||renderPanel)(); }

// ---- helpers ----
async function apuntar(l){ for(const [t,p] of l) await Libro.anexar(VAULT,AUTOR,t,p); }
const titularesDe=(st,cid)=>[...(st.titulares[cid]||[])];
const cartsDe=(st,pid)=>Object.entries(st.carteras).filter(([cid,c])=>!c.baja&&titularesDe(st,cid).includes(pid)).map(([cid,c])=>({cid,...c}));
const vlUlt=(st,inst)=>{ const m=st.vl[inst]||{}; const f=Object.keys(m).sort(); return f.length?m[f[f.length-1]]:null; };
// Factor de divisa del instrumento (unidades de divisa por 1 EUR; 1 si cotiza en EUR). Para valorar en EUR se divide por él.
const fxOf=(st,inst,fecha)=>Libro.fxA(st,(st.instrumentos[inst]||{}).moneda,fecha);
const vlUltF=(st,inst)=>{ const m=st.vl[inst]||{}; const f=Object.keys(m).sort(); return f.length?[f[f.length-1],m[f[f.length-1]]]:null; };
function finMesPrevio(iso){ const [y,m]=(iso||'').split('-').map(Number); if(!y||!m) return ''; return new Date(Date.UTC(y,m-1,0)).toISOString().slice(0,10); }
function rentMes(st,cid,P,F){ const Vend=Libro.patrimonio(st,cid,F), Vbeg=Libro.patrimonio(st,cid,P); if(!(Vbeg>0)) return null; let flow=0; for(const mv of st.movimientos){ if(mv.cartera!==cid||!mv.fecha) continue; if(mv.fecha>P && mv.fecha<=F && (mv.tipo==='Aportación'||mv.tipo==='Disposición')) flow+=(mv.efectivo_delta||0); } const den=Vbeg+0.5*flow; if(!(den>0)) return null; return (Vend-Vbeg-flow)/den; }
const carterasActivas=(st)=>Object.entries(st.carteras).filter(([,c])=>!c.baja).map(([cid,c])=>({cid,...c}));
// Asesores externos: sus clientes aparecen en Clientes/Informes pero NO suman en Panel ni Análisis
const EXT_ASESOR=new Set(['Francisco Ragolta']);
const esExterna=(st,cid)=>EXT_ASESOR.has((st.carteras[cid]||{}).asesor);
const carterasInternas=(st)=>carterasActivas(st).filter(c=>!esExterna(st,c.cid));
function productos(st, cids){
  const set=new Set(cids); const prod={};
  for(const [k,tit] of Object.entries(st.posiciones)){
    const [cid,inst]=k.split('|'); if(!set.has(cid)||Math.abs(tit)<1e-8) continue;
    const vl=vlUlt(st,inst); if(vl==null) continue;
    prod[inst]=prod[inst]||{valor:0,n:0}; prod[inst].valor+=tit*vl/fxOf(st,inst); prod[inst].n++;
  }
  const tot=Object.values(prod).reduce((a,b)=>a+b.valor,0)||1;
  return Object.entries(prod).sort((a,b)=>b[1].valor-a[1].valor).map(([inst,v])=>({inst,nombre:st.instrumentos[inst]?.nombre||'—',valor:v.valor,n:v.n,pct:v.valor/tot}));
}

// ============ PANEL ============
function sparkEUR(serie){
  if(!serie||serie.length<2) return '<p class="muted">Sin serie mensual.</p>';
  const W=640,H=170,pL=10,pR=10,pT=22,pB=26, vs=serie.map(s=>s[1]);
  const mn=Math.min(...vs),mx=Math.max(...vs),rg=(mx-mn)||1;
  const X=i=>pL+i*(W-pL-pR)/(serie.length-1), Y=v=>pT+(1-(v-mn)/rg)*(H-pT-pB);
  const pts=serie.map((s,i)=>X(i)+','+Y(s[1])).join(' ');
  const area=pL+','+(H-pB)+' '+pts+' '+(W-pR)+','+(H-pB);
  const M=['','ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return '<div class="chart"><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto">'
    +'<polygon points="'+area+'" fill="var(--salmon-pal)" opacity=".55"/>'
    +'<polyline points="'+pts+'" fill="none" stroke="var(--salmon-osc)" stroke-width="2.5"/>'
    +serie.map((s,i)=>{const mm=+s[0].slice(5);return '<circle cx="'+X(i)+'" cy="'+Y(s[1])+'" r="3" fill="var(--salmon-osc)"/>'
      +'<text x="'+X(i)+'" y="'+(H-9)+'" font-size="9" text-anchor="middle" fill="var(--gris)">'+(M[mm]||s[0].slice(5))+'</text>';}).join('')
    +'</svg></div>';
}
function renderPanel(){
  const st=ESTADO, act=carterasInternas(st);
  const EXCL_ASSET=new Set(['d4335f9f-0d4c-562d-9720-145355c08455']);
  const assetPat=act.filter(c=>!EXCL_ASSET.has(c.cid)).reduce((a,c)=>a+Libro.patrimonio(st,c.cid),0), assetN=new Set(act.flatMap(c=>titularesDe(st,c.cid))).size;
  const yrs={}; act.forEach(c=>(st.hist[c.cid]&&st.hist[c.cid].anual||[]).forEach(y=>{const o=yrs[y.a]||(yrs[y.a]={ini:0,res:0}); o.ini+=y.ini||0; o.res+=(y.res!=null?y.res:0); yrs[y.a]=o;}));
  const porFondo={};
  for(const [k,t] of Object.entries(st.posiciones)){ const [cc,ii]=k.split('|'); if(Math.abs(t)<1e-6)continue; if(EXCL_ASSET.has(cc)||esExterna(st,cc))continue; const m=st.vl[ii]||{}; const ks=Object.keys(m).sort(); const vl=ks.length?m[ks[ks.length-1]]:0; const nn2=st.instrumentos[ii]&&st.instrumentos[ii].nombre; if(!nn2)continue; (porFondo[nn2]=porFondo[nn2]||{asset:0,wealth:0,gdc:0}).asset+=t*(vl||0)/fxOf(st,ii); }
  for(const v of Object.values(st.svc.fondos||{})){ const nn2=v.fondo; const o=(porFondo[nn2]=porFondo[nn2]||{asset:0,wealth:0,gdc:0}); const sv=String(v.servicio||'').toLowerCase(); if(sv.indexOf('wealth')>=0)o.wealth+=+v.importe||0; else o.gdc+=+v.importe||0; }
  const fondosArr=Object.entries(porFondo).map(([n,o])=>({n,asset:o.asset,wealth:o.wealth,gdc:o.gdc,total:o.asset+o.wealth+o.gdc})).filter(x=>Math.abs(x.total)>1).sort((a,b)=>b.total-a.total);
  const sumF=k=>fondosArr.reduce((a,x)=>a+x[k],0);
  const assetRent=yrs[2026]&&yrs[2026].ini?yrs[2026].res/yrs[2026].ini:null;
  const rentsA=Object.keys(yrs).sort().map(a=>yrs[a].ini?yrs[a].res/yrs[a].ini:0);
  const volA=rentsA.length?stdev(rentsA):null, ddA=rentsA.length?maxDD(rentsA):null;
  const svc=(st.svc&&st.svc.clientes)?Object.values(st.svc.clientes):[];
  // Mes de cierre (último VL) y mes natural actual: el flujo "del mes" mira el mes en curso
  let _cierre=''; for(const i in st.vl)for(const f in st.vl[i])if(f>_cierre)_cierre=f; const cierreMes=_cierre.slice(0,7);
  const mesActual=new Date().toISOString().slice(0,7);
  const MESNOM=['','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const mesActualNom=(MESNOM[+mesActual.slice(5)]||'')+' '+mesActual.slice(0,4);
  // Serie mensual de captaciones (cap) y salidas (sal) para el cuadro de evolución
  const flujoMes={}; const addFlujo=(mm,ap)=>{ if(!mm)return; const o=flujoMes[mm]||(flujoMes[mm]={cap:0,sal:0}); if(ap>0)o.cap+=ap; else o.sal+=ap; };
  let apAnioC=0,reAnioC=0,apMesC=0,reMesC=0;
  for(const m of st.movimientos){ if(esExterna(st,m.cartera)) continue; const tp=(m.tipo||'').toLowerCase(), e=m.efectivo_delta||0, f=m.fecha||''; const esAp=(tp==='aportación'||tp==='aportacion')&&e>0, esRe=(tp==='disposición'||tp==='disposicion')&&e<0; if(!esAp&&!esRe) continue; addFlujo(f.slice(0,7),e); if(f>='2026-01-01'){ if(esAp)apAnioC+=e; else reAnioC+=e; } if(f.slice(0,7)===mesActual){ if(esAp)apMesC+=e; else reMesC+=e; } }
  // Los servicios (Wealth/Gestión) llevan la fecha del seguimiento: se clasifican en año y mes igual que los movimientos
  let svcApA=0,svcReA=0,svcApM=0,svcReM=0;
  for(const c of svc){ const ap=+c.aportaciones||0; if(!ap) continue; const f=c.fecha||''; addFlujo(f.slice(0,7),ap); const enAnio=!f||f>='2026-01-01', enMes=f.slice(0,7)===mesActual; if(ap>0){ if(enAnio)svcApA+=ap; if(enMes)svcApM+=ap; } else { if(enAnio)svcReA+=ap; if(enMes)svcReM+=ap; } }
  const dineroNuevoAnio=svcApA+apAnioC, retiradasAnio=svcReA+reAnioC;
  const dineroNuevoMes=svcApM+apMesC, retiradasMes=svcReM+reMesC;
  const dineroNuevo=dineroNuevoAnio, retiradas=retiradasAnio;
  const series=(st.svc&&st.svc.series)||{};
  const wl=svc.filter(c=>c.servicio==='wealth'), gs=svc.filter(c=>c.servicio==='gestion'||c.servicio==='gdc');
  const varServ=arr=>{let p=0,pv=0;arr.forEach(c=>{if(c.var!=null){p+=(c.patrimonio||0);pv+=(c.patrimonio||0)*c.var;}});return p?pv/p:null;};
  const sum=a=>a.reduce((x,c)=>x+(c.patrimonio||0),0);
  const liqA=assetPat-fondosArr.reduce((a,x)=>a+x.asset,0), liqW=sum(wl)-fondosArr.reduce((a,x)=>a+x.wealth,0), liqG=sum(gs)-fondosArr.reduce((a,x)=>a+x.gdc,0);
  if(Math.abs(liqA)>1||Math.abs(liqW)>1||Math.abs(liqG)>1) fondosArr.push({n:'Liquidez',asset:liqA,wealth:liqW,gdc:liqG,total:liqA+liqW+liqG});
  let wYtd=null; const ws=series.wealth; if(ws&&ws.length>=2&&ws[0][1]) wYtd=ws[ws.length-1][1]/ws[0][1]-1;
  const filas=[
    {n:'Asset (comercialización)',pat:assetPat,cli:assetN,rent:assetRent,varm:null,fecha:'en vivo'},
    {n:'Wealth (asesoramiento)',pat:sum(wl),cli:wl.length,rent:wYtd,varm:varServ(wl),fecha:'30/09/2026'},
    {n:'Gestión de Carteras',pat:sum(gs),cli:gs.length,rent:null,varm:varServ(gs),fecha:'30/09/2026'}
  ];
  const total=filas.reduce((a,f)=>a+f.pat,0)||1;
  const distinct=assetN + new Set(svc.map(c=>c.nombre)).size;
  const relaciones=assetN + svc.length;
  const nom2=c=>c.nombre;
  const listaWl=wl.slice().sort((a,b)=>b.patrimonio-a.patrimonio).map(c=>`<div class="r2"><span>${c.nombre}</span><b>${eur(c.patrimonio)}</b></div>`).join('');
  const listaGs=gs.map(c=>`<div class="r2"><span>${c.nombre}</span><b>${eur(c.patrimonio)}</b></div>`).join('');
  const medio=f=>f.cli?eur(f.pat/f.cli):'—';
  $('view').innerHTML=`<h1>Panel general</h1>
    <div class="card">
      <div class="hero">
        <div>
          <div class="aum">
            <div class="k">Patrimonio total bajo seguimiento (AUM)</div>
            <div class="v">${eur(total)}</div>
            <div class="d">${((dineroNuevoAnio+retiradasAnio)>=0?'+':'')+eur(dineroNuevoAnio+retiradasAnio)} en el año · ${((dineroNuevoMes+retiradasMes)>=0?'+':'')+eur(dineroNuevoMes+retiradasMes)} en el mes</div>
            <div class="x">${distinct} clientes distintos · ${relaciones} relaciones de servicio</div>
          </div>
          <div class="pills">
            <div class="pill"><div class="n"><i style="background:#8E7577"></i>Asset</div><div class="v">${eur(assetPat)}</div><div class="w">${pct(assetPat/total)} · ${assetN} cli.</div></div>
            <div class="pill"><div class="n"><i style="background:#E5D0D2"></i>Wealth</div><div class="v">${eur(sum(wl))}</div><div class="w">${pct(sum(wl)/total)} · ${wl.length} cli.</div></div>
            <div class="pill"><div class="n"><i style="background:#575755"></i>Gestión</div><div class="v">${eur(sum(gs))}</div><div class="w">${pct(sum(gs)/total)} · ${gs.length} cli.</div></div>
          </div>
        </div>
        <div class="hero-donut">${donutSVG(filas.filter(f=>f.pat>0).map(f=>({n:f.n.split(' ')[0],v:f.pat})))}</div>
      </div></div>
    <div class="card"><h2>Flujos de clientes</h2>
      <div class="flow">
        <div class="flowcol mes"><div class="hd"><span>ESTE MES</span><span class="t">${mesActualNom}</span></div>
          <div class="frow"><span class="lab">▲ Dinero nuevo</span><span class="val pos">${dineroNuevoMes?'+'+eur(dineroNuevoMes):'—'}</span></div>
          <div class="frow"><span class="lab">▼ Retiradas</span><span class="val neg">${retiradasMes?eur(retiradasMes):'—'}</span></div>
          <div class="frow net"><span class="lab">Flujo neto</span><span class="val">${(dineroNuevoMes+retiradasMes)?(((dineroNuevoMes+retiradasMes)>0?'+':'')+eur(dineroNuevoMes+retiradasMes)):'—'}</span></div>
        </div>
        <div class="flowcol anio"><div class="hd"><span>AÑO 2026</span><span class="t">acumulado</span></div>
          <div class="frow"><span class="lab">▲ Dinero nuevo</span><span class="val pos">${dineroNuevoAnio?'+'+eur(dineroNuevoAnio):'—'}</span></div>
          <div class="frow"><span class="lab">▼ Retiradas</span><span class="val neg">${retiradasAnio?eur(retiradasAnio):'—'}</span></div>
          <div class="frow net"><span class="lab">Flujo neto</span><span class="val">${(dineroNuevoAnio+retiradasAnio)?(((dineroNuevoAnio+retiradasAnio)>0?'+':'')+eur(dineroNuevoAnio+retiradasAnio)):'—'}</span></div>
        </div>
      </div>
      <p class="muted" style="margin-top:10px;font-size:11.5px">Cada aportación y retirada se clasifica por su fecha: el bloque <b>mes</b> recoge lo fechado en el mes en curso (${mesActualNom}); el bloque <b>año</b>, todo 2026. Asset se calcula en vivo desde la app.</p></div>
    <div class="card"><h2>Captaciones y salidas · mes a mes</h2>
      <p class="muted" style="margin-top:-6px;margin-bottom:8px">Dinero nuevo (verde) y retiradas (rojo) de cada mes de 2026. Faltan cierres por cargar; se completará al subir los movimientos mensuales.</p>
      ${flujoBarSVG(flujoMes)}</div>
    <div class="card"><h2>Patrimonio por servicio</h2>
      <div style="overflow-x:auto"><table><thead><tr><th>Servicio</th><th class="num">Patrimonio</th><th class="num">Peso</th><th class="num">Clientes</th><th class="num">Rent. 2026</th><th class="num">Var. mes</th><th class="num">Medio/cliente</th><th class="num">A fecha</th></tr></thead>
        <tbody>${filas.map(f=>`<tr><td>${f.n}</td><td class="num">${eur(f.pat)}</td><td class="num">${pct(f.pat/total)}</td><td class="num">${f.cli}</td><td class="num">${f.rent!=null?pct(f.rent):'—'}</td><td class="num">${f.varm!=null?pct(f.varm):'—'}</td><td class="num">${medio(f)}</td><td class="num" style="font-size:11px;color:var(--gris)">${f.fecha}</td></tr>`).join('')}
        <tr class="tot"><td>Total</td><td class="num">${eur(total)}</td><td class="num">100,0 %</td><td class="num">${relaciones}</td><td></td><td></td><td></td><td></td></tr></tbody></table></div></div>
    <div class="card"><h2>Patrimonio por fondo / SICAV</h2>
      <p class="muted" style="margin-top:-6px;margin-bottom:8px">Importe en cada IIC por servicio. Asset desde las carteras; Wealth y Gestión de Carteras desde el detalle por fondo (se rellena al cargar el cierre).</p>
      <div style="overflow-x:auto"><table><thead><tr><th>Fondo / SICAV</th><th class="num">Asset</th><th class="num">Wealth</th><th class="num">Gestión Carteras</th><th class="num">Total</th></tr></thead>
        <tbody>${fondosArr.map(x=>`<tr><td>${x.n}</td><td class="num">${x.asset?eur(x.asset):'—'}</td><td class="num">${x.wealth?eur(x.wealth):'—'}</td><td class="num">${x.gdc?eur(x.gdc):'—'}</td><td class="num"><b>${eur(x.total)}</b></td></tr>`).join('')}
        <tr class="tot"><td>Total</td><td class="num">${eur(sumF('asset'))}</td><td class="num">${eur(sumF('wealth'))}</td><td class="num">${eur(sumF('gdc'))}</td><td class="num"><b>${eur(sumF('total'))}</b></td></tr></tbody></table></div></div>
    <div class="card"><h2>Evolución mensual · Wealth</h2>
      <p class="muted" style="margin-top:-6px;margin-bottom:8px">Patrimonio de los 7 clientes Wealth con seguimiento mensual (Luis se incorpora en el total actual).</p>
      ${sparkEUR(series.wealth)}</div>
    <div class="card"><h2>Quién tiene qué</h2>
      <div class="cols2">
        <div><h3 style="font-size:13px;color:var(--salmon-osc);margin:4px 0 8px">Wealth (${wl.length})</h3><div class="card2">${listaWl||'<span class="muted">—</span>'}</div></div>
        <div><h3 style="font-size:13px;color:var(--salmon-osc);margin:4px 0 8px">Gestión de Carteras (${gs.length})</h3><div class="card2">${listaGs||'<span class="muted">—</span>'}</div>
          <h3 style="font-size:13px;color:var(--salmon-osc);margin:14px 0 8px">Asset (${assetN})</h3><p class="muted" style="font-size:11.5px">Los ${assetN} clientes de comercialización; detalle en la pestaña Clientes. Enric Coll figura aquí (es Wealth, pero se mantiene en Asset para su informe; no se duplica).</p></div>
      </div></div>
    <div class="card"><h2>Ratios</h2>
      <div class="kpis3">
        <div class="mini"><div class="k">Rent. 2026 Asset</div><div class="v">${assetRent!=null?pct(assetRent):'—'}</div></div>
        <div class="mini"><div class="k">Volatilidad anual Asset</div><div class="v">${volA!=null?pct(volA):'—'}</div></div>
        <div class="mini"><div class="k">Caída máxima Asset</div><div class="v">${ddA!=null?pct(ddA):'—'}</div></div>
      </div>
      <p class="muted" style="margin-top:10px;font-size:11.5px">Volatilidad y caída máxima calculadas sobre el histórico anual del conjunto Asset. Para Wealth y Gestión se mostrarán en cuanto haya varios cierres mensuales en la serie.</p></div>`;
}
// ============ ANÁLISIS ============
function stdev(a){if(a.length<2)return 0;const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)*(y-m),0)/(a.length-1));}
function maxDD(rents){let idx=1,peak=1,dd=0;for(const r of rents){idx*=(1+(r||0));peak=Math.max(peak,idx);dd=Math.min(dd,idx/peak-1);}return dd;}
function barSVG(labels,vals){if(!vals.length)return '';const W=560,H=210,pL=34,pR=10,pT=16,pB=22;const lo=Math.min(0,...vals),hi=Math.max(0,...vals),pad=(hi-lo)*0.15||0.02;const y0=lo-pad,y1=hi+pad,step=(W-pL-pR)/vals.length,bw=step*0.6,Y=v=>pT+(H-pT-pB)*(1-(v-y0)/((y1-y0)||1));let g=`<line x1="${pL}" y1="${Y(0)}" x2="${W-pR}" y2="${Y(0)}" stroke="#D9CFCF"/>`;vals.forEach((v,i)=>{const x=pL+i*step+step/2-bw/2,yt=Y(Math.max(0,v)),yb=Y(Math.min(0,v));g+=`<rect x="${x}" y="${yt}" width="${bw}" height="${Math.max(1,yb-yt)}" rx="2" fill="${v<0?'#575755':'#A98A8C'}"/><text x="${x+bw/2}" y="${v<0?yb+9:yt-3}" text-anchor="middle" font-size="8" font-weight="700">${(v>=0?'+':'')+(v*100).toFixed(1)}%</text><text x="${x+bw/2}" y="${H-7}" text-anchor="middle" font-size="8" fill="#575755">${labels[i]}</text>`;});return `<div class="chart"><svg viewBox="0 0 ${W} ${H}">${g}</svg></div>`;}
function donutSVG(segs){const tot=segs.reduce((s,x)=>s+x.v,0)||1,r=78,C=2*Math.PI*r;let off=0,g='';const col=['#8E7577','#E5D0D2','#575755','#B79A9C','#C9B9BA','#7d6a6b','#ddc8c9','#9c8788'];
  segs.forEach((sg,i)=>{const d=sg.v/tot*C;g+=`<circle cx="100" cy="100" r="${r}" fill="none" stroke="${col[i%col.length]}" stroke-width="34" stroke-dasharray="${d} ${C-d}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)"/>`;off+=d;});
  const leg=segs.map((sg,i)=>`<div class="it"><span class="sw" style="background:${col[i%col.length]}"></span>${sg.n} <b>${pct(sg.v/tot)}</b></div>`).join('');
  return `<div class="donut"><svg viewBox="0 0 200 200" style="width:210px;flex:none">${g}</svg><div class="leg">${leg}</div></div>`;}
function flujoBarSVG(fm){
  const now=new Date(), yr=2026, meses=[];
  for(let m=1;m<=12;m++){ if(new Date(yr,m-1,1)>now) break; meses.push(yr+'-'+String(m).padStart(2,'0')); }
  const data=meses.map(k=>fm[k]||{cap:0,sal:0});
  const maxV=Math.max(1,...data.map(d=>Math.max(d.cap,Math.abs(d.sal))));
  const W=760,H=190,pL=12,pR=12,pT=16,pB=26, half=(H-pT-pB)/2, mid=pT+half;
  const step=(W-pL-pR)/(meses.length||1), bw=Math.min(30,step*0.46);
  const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const fmt=v=>(v>=0?'+':'−')+Math.round(Math.abs(v)/1000)+'k';
  let g=`<line x1="${pL}" y1="${mid}" x2="${W-pR}" y2="${mid}" stroke="#D9CFCF"/>`;
  data.forEach((d,i)=>{ const cx=pL+i*step+step/2;
    if(d.cap>0){ const h=half*d.cap/maxV; g+=`<rect x="${cx-bw/2}" y="${mid-h}" width="${bw}" height="${Math.max(1,h)}" rx="2" fill="#3F7A5B"/><text x="${cx}" y="${mid-h-3}" text-anchor="middle" font-size="8" font-weight="700" fill="#3F7A5B">${fmt(d.cap)}</text>`; }
    if(d.sal<0){ const h=half*Math.abs(d.sal)/maxV; g+=`<rect x="${cx-bw/2}" y="${mid}" width="${bw}" height="${Math.max(1,h)}" rx="2" fill="#A2453B"/><text x="${cx}" y="${mid+h+11}" text-anchor="middle" font-size="8" font-weight="700" fill="#A2453B">${fmt(d.sal)}</text>`; }
    g+=`<text x="${cx}" y="${H-8}" text-anchor="middle" font-size="9" fill="#575755">${MES[+meses[i].slice(5)-1]||''}</text>`;
  });
  const leg=`<div style="display:flex;gap:18px;justify-content:center;font-size:11.5px;margin-top:2px"><span style="color:#3F7A5B">■ Captado</span><span style="color:#A2453B">■ Salido</span></div>`;
  return `<div class="chart" style="height:200px"><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%">${g}</svg></div>${leg}`;
}
function renderAnalisis(){
  const st=ESTADO; const act=carterasInternas(st);
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
  const nClientes=new Set(act.flatMap(c=>titularesDe(st,c.cid))).size;
  // riesgo del conjunto desde la serie anual (agregada por año)
  const bookY={};
  act.forEach(c=>(st.hist[c.cid]?.anual||[]).forEach(y=>{const o=bookY[y.a]||(bookY[y.a]={ini:0,res:0});o.ini+=y.ini||0;o.res+=(y.res!=null?y.res:0);}));
  const bookAnual=Object.keys(bookY).sort().map(a=>({a:+a,rent:bookY[a].ini?bookY[a].res/bookY[a].ini:0}));
  const rentsBook=bookAnual.map(y=>y.rent);
  const vol=stdev(rentsBook), dd=maxDD(rentsBook);
  // Rentabilidad YTD por producto (último VL vs último VL de 2025)
  const idPorNombre={}; for(const [id,i] of Object.entries(st.instrumentos)){ if(i&&i.nombre) idPorNombre[i.nombre]=id; }
  const ytdProd=nombre=>{ const id=idPorNombre[nombre]; if(!id) return null; const m=st.vl[id]||{}; const ks=Object.keys(m).sort(); if(ks.length<2) return null; const prev=ks.filter(f=>f<='2025-12-31'); const base=prev.length?m[prev[prev.length-1]]:m[ks[0]], last=m[ks[ks.length-1]]; return (base&&last)?last/base-1:null; };
  // Clase de activo por vocación del fondo (universo Gesiuris)
  const UNIV={}; FONDOS_UNIVERSO.forEach(f=>{ UNIV[f.n.toUpperCase().replace(/[^A-Z0-9]/g,'')]=f.v; });
  const claseDe=nombre=>{ const key=String(nombre).toUpperCase().replace(/[^A-Z0-9]/g,''); for(const k in UNIV){ if(k.length>6&&(key.includes(k)||k.includes(key))){ const v=UNIV[k]||''; if(v.startsWith('RV')) return 'Renta variable'; if(v.startsWith('RF')) return 'Renta fija'; return 'Mixtos / global'; } } return 'Sin clasificar'; };
  const claseAgg={}; prod.forEach(p=>{ if(p.nombre==='Liquidez') return; const c=claseDe(p.nombre); claseAgg[c]=(claseAgg[c]||0)+p.valor; }); if(liqTotal>0.5) claseAgg['Liquidez']=(claseAgg['Liquidez']||0)+liqTotal;
  const claseOrden=['Renta variable','Renta fija','Mixtos / global','Sin clasificar','Liquidez'];
  const claseCol={'Renta variable':'#8E7577','Renta fija':'#B79A9C','Mixtos / global':'#C9B9BA','Sin clasificar':'#ddc8c9','Liquidez':'#E5D0D2'};
  const claseTot=Object.values(claseAgg).reduce((a,b)=>a+b,0)||1;
  const claseBars=claseOrden.filter(c=>claseAgg[c]>0.5).map(c=>`<div class="lab"><span>${c}</span><b>${pct(claseAgg[c]/claseTot)}</b></div><div class="abar"><span style="width:${(claseAgg[c]/claseTot*100).toFixed(1)}%;background:${claseCol[c]}"></span></div>`).join('');
  // Donut de productos (top 6 + resto) sobre el patrimonio total
  const dcol=['#8E7577','#E5D0D2','#575755','#B79A9C','#C9B9BA','#7d6a6b','#ddc8c9'];
  const topProd=prod.slice(0,6), restoVal=prod.slice(6).reduce((a,p)=>a+p.valor,0);
  const dsegs=topProd.map(p=>p.valor).concat(restoVal>0.5?[restoVal]:[]);
  const Cc=2*Math.PI*78; let off=0; const dring=dsegs.map((v,i)=>{ const d=v/(patTotal||1)*Cc, s=`<circle cx="100" cy="100" r="78" fill="none" stroke="${dcol[i%dcol.length]}" stroke-width="32" stroke-dasharray="${d} ${Cc-d}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)"/>`; off+=d; return s; }).join('');
  // Tabla de productos (top 9 + otros + total)
  const topN=prod.slice(0,9), otros=prod.slice(9);
  const otrosVal=otros.reduce((a,p)=>a+p.valor,0), otrosPct=otros.reduce((a,p)=>a+p.pct,0);
  const ytdCell=r=>r==null?'<td class="num">—</td>':`<td class="num" style="color:${r>=0?'var(--ok)':'var(--error)'}">${(r>=0?'+':'')+pct(r)}</td>`;
  const prodRows=topN.map((p,i)=>`<tr><td><span class="asw" style="background:${dcol[i%dcol.length]}"></span>${p.nombre}</td><td class="num">${eur(p.valor)}</td><td class="num">${pct(p.pct)}</td><td class="num">${p.n}</td>${ytdCell(ytdProd(p.nombre))}</tr>`).join('')
    + (otros.length?`<tr><td>Otros (${otros.length} productos)</td><td class="num">${eur(otrosVal)}</td><td class="num">${pct(otrosPct)}</td><td class="num">—</td><td class="num">—</td></tr>`:'')
    + `<tr class="tot"><td>Total</td><td class="num">${eur(patTotal)}</td><td class="num">100,0 %</td><td class="num">—</td><td class="num">—</td></tr>`;
  $('view').innerHTML=`<div class="ana"><h1>Análisis de la cartera</h1>
    <p class="muted" style="margin:0 0 12px">Detalle del libro Asset: productos, asignación, riesgo y concentración.</p>
    <div class="card" style="margin-top:0"><div class="kstrip">
      <div class="kbox"><div class="k">Clientes</div><div class="v">${nClientes}</div></div>
      <div class="kbox"><div class="k">Carteras</div><div class="v">${act.length}</div></div>
      <div class="kbox"><div class="k">Patrimonio</div><div class="v">${patTotal>=1e6?(patTotal/1e6).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' M€':eur(patTotal)}</div></div>
      <div class="kbox"><div class="k">Liquidez</div><div class="v">${pct(liqTotal/patTotal)}</div></div>
      <div class="kbox"><div class="k">Medio/cartera</div><div class="v">${(patTotal/(act.length||1)/1000).toLocaleString('es-ES',{maximumFractionDigits:0})+' k€'}</div></div>
      <div class="kbox"><div class="k">Productos</div><div class="v">${prod.length}</div></div>
      <div class="kbox"><div class="k">Top-5 clientes</div><div class="v">${pct(top5pct)}</div></div>
    </div></div>
    <div class="ana-row2">
      <div class="card"><h2>Patrimonio por producto</h2>
        <table><thead><tr><th>Producto</th><th class="num">Valor</th><th class="num">Peso</th><th class="num">Cart.</th><th class="num">Rent. 2026</th></tr></thead><tbody>${prodRows}</tbody></table></div>
      <div class="card ana-col"><h2>Asignación</h2>
        <div class="donutwrap"><svg viewBox="0 0 200 200" width="168" height="168">${dring}<text x="100" y="95" text-anchor="middle" font-size="11" fill="#575755">Mayor</text><text x="100" y="114" text-anchor="middle" font-size="14" font-weight="800" fill="#2b2b2b">${prod[0]?pct(prod[0].pct):'—'}</text></svg></div>
        <div class="ana-clase"><div class="ct">Por clase de activo · vocación del fondo</div>${claseBars||'<p class="muted" style="margin:6px 0 0">Sin clasificación disponible.</p>'}</div></div>
    </div>
    <div class="ana-rowB">
      <div class="card ana-col"><h2>Riesgo · histórico anual del conjunto</h2>
        <div class="ana-tiles">
          <div class="ana-tile"><div class="k">Volatilidad</div><div class="v">${bookAnual.length?pct(vol):'—'}</div></div>
          <div class="ana-tile"><div class="k">Caída máx.</div><div class="v">${bookAnual.length?pct(dd):'—'}</div></div>
          <div class="ana-tile"><div class="k">Mejor año</div><div class="v">${bookAnual.length?pct(Math.max(...rentsBook)):'—'}</div></div>
          <div class="ana-tile"><div class="k">Peor año</div><div class="v">${bookAnual.length?pct(Math.min(...rentsBook)):'—'}</div></div>
        </div>
        <div class="ana-chart">${bookAnual.length?barSVG(bookAnual.map(y=>y.a),rentsBook):'<span class="muted">Sin serie anual.</span>'}</div>
        <div class="muted" style="font-size:11px;margin-top:4px">Volatilidad = desv. típica de las rentabilidades anuales · Caída máxima = mayor retroceso acumulado.</div></div>
      <div class="card ana-col"><h2>Concentración · mayores clientes</h2>
        <table><thead><tr><th>Cliente</th><th class="num">Patrimonio</th><th class="num">% total</th></tr></thead><tbody>${topCli.map(([pid,v])=>`<tr><td>${nom(st.personas[pid])}<div class="cbar"><span style="width:${Math.round(v/((topCli[0]&&topCli[0][1])||1)*100)}%"></span></div></td><td class="num">${eur(v)}</td><td class="num">${pct(v/patTotal)}</td></tr>`).join('')}</tbody></table>
        <div class="muted" style="font-size:11px;margin-top:8px">Las conjuntas se reparten entre sus titulares. El mayor producto, <b>${prod[0]?prod[0].nombre:'—'}</b>, pesa ${prod[0]?pct(prod[0].pct):'—'} del libro.</div></div>
    </div></div>`;
}


// ---- carta de transferencia (Word) ----
function apocope(w){ if(w==='uno')return 'un'; if(w.endsWith('veintiuno'))return w.slice(0,-9)+'veintiún'; if(w.endsWith(' uno'))return w.slice(0,-4)+' un'; return w; }
function enLetras(n){ n=Math.round(n*100)/100; const ent=Math.floor(n), cent=Math.round((n-ent)*100);
  const U=['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
  const D=['','','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
  const C=['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
  const c3=x=>{ if(x===0)return ''; if(x===100)return 'cien'; let r=''; const c=Math.floor(x/100),d=Math.floor((x%100)/10),u=x%10,dd=x%100; r+=C[c]; if(dd){ if(r)r+=' '; if(dd<30)r+=U[dd]; else { r+=D[d]; if(u)r+=' y '+U[u]; } } return r; };
  const mi=x=>{ if(x===0)return 'cero'; const M=Math.floor(x/1000000),ML=Math.floor((x%1000000)/1000),RE=x%1000; let r=''; if(M)r+=(M===1?'un millón':c3(M)+' millones'); if(ML){if(r)r+=' ';r+=(ML===1?'mil':c3(ML)+' mil');} if(RE){if(r)r+=' ';r+=c3(RE);} return r; };
  let s=mi(ent); const millon=s.endsWith('millón')||s.endsWith('millones'); s=apocope(s);
  let out=s+(ent===1?' euro':(millon?' de euros':' euros'));
  if(cent>0){ out+=' con '+apocope(c3(cent))+(cent===1?' céntimo':' céntimos'); }
  return out.charAt(0).toUpperCase()+out.slice(1); }
function fechaLarga(iso){ const M=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']; const [y,m,d]=(iso||'').split('-').map(Number); return (d&&m&&y)?`${d} de ${M[m-1]} de ${y}`:''; }
async function cargarDocx(){ if(window.docx) return window.docx; await new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src='https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js'; sc.onload=res; sc.onerror=rej; document.head.appendChild(sc); }); return window.docx; }
async function generarCarta(){
  const st=ESTADO, p=st.personas[SEL], msg=$('tmsg'); if(!p) return; msg.textContent='';
  const dni=$('fdni').value.trim(), origen=$('fori').value.trim(), banco=$('fban').value.trim(), iban=$('fiban').value.trim();
  const fecha=$('tfecha').value, importe=pnum($('timp').value);
  if(!dni||!origen||!banco||!iban){ msg.textContent='Faltan DNI o cuentas (rellénalos arriba).'; return; }
  if(!fecha){ msg.textContent='Falta la fecha.'; return; }
  if(isNaN(importe)||importe<=0){ msg.textContent='Importe no válido.'; return; }
  msg.textContent='Generando…';
  try{
    const D=await cargarDocx(), nombre=nom(p);
    const eur=n=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:(n%1?2:0),maximumFractionDigits:2}).format(n);
    const B=(t,o={})=>new D.Paragraph({children:[new D.TextRun({text:t,...o})],spacing:{after:120}}), V=()=>new D.Paragraph({children:[new D.TextRun('')]});
    const cuerpo=`Yo, ${nombre} con DNI ${dni} solicito que transfieran ${eur(importe)}€ (${enLetras(importe)}) de mi cuenta ${origen} a la cuenta en ${banco} a mi nombre ${iban}.`;
    const doc=new D.Document({styles:{default:{document:{run:{font:'Calibri',size:22}}}},sections:[{properties:{page:{margin:{top:1400,bottom:1400,left:1400,right:1400}}},children:[
      B(`Barcelona, ${fechaLarga(fecha)}`),V(),V(),B('RENTA 4',{bold:true}),V(),B('Buenos días,'),V(),B(cuerpo),V(),B('Muchas gracias.'),V(),B('Atentamente,'),V(),V(),V(),V(),B(`NOMBRE  ${nombre}`),B(`DNI       ${dni}`)]}]});
    const blob=await D.Packer.toBlob(doc), a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=`Transferencia_${nombre.replace(/\s+/g,'_')}_${fecha}.docx`; a.click(); URL.revokeObjectURL(a.href);
    const reg=$('tdisp')&&$('tdisp').checked&&$('tcart')&&$('tcart').value;
    if(reg){ await apuntar([['movimiento',{cartera:$('tcart').value,fecha,efectivo_delta:-importe,titulos_delta:0}]]); await recargarYrender(); }
    else { msg.textContent='✓ Word descargado'; }
  }catch(e){ msg.textContent='No se pudo generar (¿sin conexión?).'; }
}
// ============ CLIENTES ============
function renderClientes(){
  const st=ESTADO; if(SEL&&!st.personas[SEL]) SEL=null;
  // Nuevo cliente o ficha enfocada: a pantalla completa, con vuelta a la galería
  if(NUEVO || SEL){
    $('view').innerHTML=`<h1>Clientes</h1>
      <div id="volver" style="display:inline-block;font-size:13px;color:var(--gris);margin-bottom:10px;cursor:pointer">← Volver a la galería</div>
      <div class="card" id="ficha" style="margin-top:0"></div>`;
    $('volver').onclick=()=>{ NUEVO=false; SEL=null; renderClientes(); };
    if(NUEVO) renderFichaNueva(); else renderFicha();
    return;
  }
  // Galería de fichas
  const datos=Object.values(st.personas).map(p=>{ const carts=cartsDe(st,p.id); return {p,n:carts.length,pat:carts.reduce((a,c)=>a+Libro.patrimonio(st,c.cid),0),ext:carts.some(c=>esExterna(st,c.cid))}; });
  if(CLIORD==='nombre') datos.sort((a,b)=>nom(a.p).localeCompare(nom(b.p))); else datos.sort((a,b)=>b.pat-a.pat);
  const f=FILTRO.toLowerCase();
  const ini=p=>{ const a=(p.nombre||'').trim()[0]||'', b=(p.apellidos||'').trim()[0]||''; return ((a+b)||'?').toUpperCase(); };
  const cards=datos.filter(x=>nom(x.p).toLowerCase().includes(f)).map(x=>`<div class="ccard" data-pid="${x.p.id}">
      <div class="cardhd"><div class="av">${ini(x.p)}</div><div><div class="nm">${nom(x.p)}</div><div class="mt">${x.n} cartera${x.n===1?'':'s'}${x.ext?' · <span style="color:var(--error)">Paco</span>':''}</div></div></div>
      <div class="pat">${eur(x.pat)}</div></div>`).join('')||'<div class="muted" style="padding:14px">Sin resultados.</div>';
  const tot=datos.reduce((a,x)=>a+x.pat,0);
  $('view').innerHTML=`<h1>Clientes</h1>
    <div class="card" style="margin-top:0"><div class="cli-toolbar">
      <input id="buscar" placeholder="Buscar cliente…" value="${esc(FILTRO)}">
      <select id="cliord"><option value="pat" ${CLIORD!=='nombre'?'selected':''}>Ordenar: patrimonio</option><option value="nombre" ${CLIORD==='nombre'?'selected':''}>Ordenar: nombre</option></select>
      <span class="muted" style="margin-left:auto">${datos.length} clientes · ${eur(tot)}</span>
      <button class="primary" id="bNuevo">+ Nuevo cliente</button></div></div>
    <div class="cli-gallery">${cards}</div>`;
  document.querySelectorAll('.ccard').forEach(e=>e.onclick=()=>{ SEL=e.dataset.pid; NUEVO=false; FICHATAB='detalle'; DETMODE='ver'; renderClientes(); });
  $('bNuevo').onclick=()=>{ NUEVO=true; SEL=null; renderClientes(); };
  $('cliord').onchange=e=>{ CLIORD=e.target.value; renderClientes(); };
  const bb=$('buscar'); bb.oninput=()=>{ FILTRO=bb.value; const ff=FILTRO.toLowerCase(); document.querySelectorAll('.ccard').forEach(el=>{ el.style.display=nom(st.personas[el.dataset.pid]).toLowerCase().includes(ff)?'':'none'; }); };
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
  if($('nci').checked){ const cid=crypto.randomUUID(); l.push(['alta_cartera',{id:cid,nombre:'Cartera individual',tipo:'individual',asesor:asesorActual()}]); l.push(['titular',{cartera:cid,persona:pid}]); }
  await apuntar(l); NUEVO=false; SEL=pid; await recargarYrender();
}
function renderFicha(){
  const st=ESTADO, c=$('ficha'); if(!SEL){ c.innerHTML=`<h2>Ficha</h2><p class="muted">Selecciona una persona de la galería.</p>`; return; }
  SELCLI=SEL;
  const p=st.personas[SEL], otras=Object.values(st.personas).filter(x=>x.id!==SEL);
  const carts=cartsDe(st,SEL), patTot=carts.reduce((a,k)=>a+Libro.patrimonio(st,k.cid),0);
  const asesores=[...new Set(carts.map(k=>ASESORES[k.asesor||'AJ']||(k.asesor||'AJ')))].join(', ')||'—';
  const cuentas=`<div class="grid2f">
      <div class="fldf"><label>DNI</label><input id="fdni" value="${esc(p.dni||'')}" placeholder="00000000X"></div>
      <div class="fldf"><label>Cuenta origen (IBAN en el bróker)</label><input id="fori" value="${esc(p.cuentaOrigen||'')}" placeholder="ES.."></div>
      <div class="fldf"><label>Banco destino</label><input id="fban" value="${esc(p.bancoDestino||'')}"></div>
      <div class="fldf"><label>IBAN destino</label><input id="fiban" value="${esc(p.ibanDestino||'')}" placeholder="ES.."></div></div>`;
  // ===== Información personal =====
  const panelPersonal=`<div class="grid2f">
      <div class="fldf"><label>Nombre</label><input id="fn" value="${esc(p.nombre)}"></div>
      <div class="fldf"><label>Apellidos</label><input id="fa" value="${esc(p.apellidos)}"></div>
      <div class="fldf"><label>Email</label><input id="fe" value="${esc(p.email)}"></div>
      <div class="fldf"><label>Teléfono</label><input id="ft" value="${esc(p.telefono)}"></div>
      <div class="fldf"><label>Idioma</label><select id="fi">${Object.entries(IDIOMAS).map(([k,v])=>`<option value="${k}" ${(p.idioma||'es')===k?'selected':''}>${v}</option>`).join('')}</select></div></div>
    <div style="margin-top:12px;border-top:1px solid var(--linea);padding-top:10px"><div class="muted" style="font-size:11.5px;margin-bottom:6px">Datos para la carta de transferencia</div>${cuentas}</div>
    <div class="row" style="margin-top:12px"><button class="primary" id="bF">Guardar ficha</button><span class="muted" id="fm"></span></div>`;
  // ===== Solicitud de transferencia =====
  const panelTransf=`<p class="muted" style="margin:-2px 0 10px">Carta de transferencia a Renta 4. Puedes editar el DNI y las cuentas solo para esta carta; para guardarlos, ve a «Información personal».</p>
    ${cuentas}
    <div class="row" style="margin-top:12px"><label class="chk">Fecha <input id="tfecha" type="date" value="2026-08-31"></label><input id="timp" placeholder="Importe (€)" inputmode="decimal" style="max-width:160px"></div>
    <div class="row" style="margin-top:8px"><label class="chk">Cartera <select id="tcart">${carts.map(k=>`<option value="${k.cid}">${esc(k.nombre)}</option>`).join('')||'<option value="">(sin cartera)</option>'}</select></label><label class="chk"><input type="checkbox" id="tdisp" checked> registrar como Disposición (concilia el patrimonio)</label></div>
    <div class="row" style="margin-top:10px"><button class="primary" id="bCarta">Generar Word</button><span class="muted" id="tmsg"></span></div>`;
  // ===== Detalle cartera =====
  let panelDetalle;
  if(DETMODE==='gestionar'){
    const cart=carts.map(k=>{
      const t=titularesDe(st,k.cid);
      const chips=t.map(pid=>`<span class="chip">${nom(st.personas[pid])}${pid!==SEL?` <button data-q="${k.cid}" data-p="${pid}">×</button>`:''}</span>`).join('');
      const noT=otras.filter(x=>!t.includes(x.id));
      const add=noT.length?`<select data-add="${k.cid}"><option value="">+ titular…</option>${noT.map(x=>`<option value="${x.id}">${nom(x)}</option>`).join('')}</select>`:'';
      return `<div class="cartera"><div class="row"><input data-cn="${k.cid}" value="${esc(k.nombre)}" style="flex:1">
        <select data-ct="${k.cid}"><option value="individual" ${k.tipo==='individual'?'selected':''}>Individual</option><option value="conjunta" ${k.tipo==='conjunta'?'selected':''}>Conjunta</option></select>
        <select data-casr="${k.cid}" title="Asesor">${Object.keys(ASESORES).map(a=>`<option value="${a}" ${((k.asesor||'AJ')===a)?'selected':''}>${ASESORES[a]}</option>`).join('')}</select>
        <button class="ghost" data-gc="${k.cid}">Guardar</button><b class="num" style="margin-left:auto">${eur(Libro.patrimonio(st,k.cid))}</b></div>
        <div class="chips" style="margin-top:8px">${chips}</div>${add}
        <div style="margin-top:6px"><button class="danger" data-baja="${k.cid}">Dar de baja</button>
          <button class="danger" data-del="${k.cid}" style="margin-left:6px">Eliminar</button></div></div>`;}).join('')||'<p class="muted">Sin carteras.</p>';
    panelDetalle=`<div class="back2" id="bVolverDet">← Volver al detalle</div>${cart}
      <div class="gestbox"><div class="muted" style="font-size:11.5px;margin-bottom:6px"><b>Nueva cartera</b> para ${p.nombre}</div>
        <div class="row"><input id="ncn" placeholder="Nombre" value="Cartera individual" style="flex:1"></div>
        <p class="muted" style="margin:8px 0 4px">Otros titulares (marca para conjunta):</p>
        <div class="chks">${otras.map(x=>`<label class="chk"><input type="checkbox" class="co" value="${x.id}"> ${nom(x)}</label>`).join('')||'<span class="muted">no hay más personas</span>'}</div>
        <div class="row" style="margin-top:8px"><button class="primary" id="bNC">Crear cartera</button></div></div>`;
  } else if(DETMODE==='operar'){
    if(!SELC || !carts.some(k=>k.cid===SELC)) SELC=carts[0]?carts[0].cid:null;
    const insts=Object.entries(st.instrumentos).filter(([id,i])=>i&&i.nombre).sort((a,b)=>(a[1].nombre||'').localeCompare(b[1].nombre||''));
    panelDetalle=`<div class="back2" id="bVolverDet">← Volver al detalle</div>
      <div class="row" style="margin-bottom:10px"><label class="chk">Cartera <select id="selc">${carts.map(k=>`<option value="${k.cid}" ${k.cid===SELC?'selected':''}>${esc(k.nombre)}</option>`).join('')||'<option value="">(sin cartera)</option>'}</select></label></div>
      <div class="grid2f">
        <div class="fldf"><label>Tipo</label><select id="mt">${TIPOS_MOV.map(t=>`<option>${t}</option>`).join('')}</select></div>
        <div class="fldf" id="fInst"><label>Instrumento</label><select id="mi"><option value="">— Selecciona —</option>${insts.map(([id,i])=>`<option value="${id}">${i.nombre}</option>`).join('')}<option value="__n">+ Nuevo…</option></select></div>
        <div class="fldf"><label>Importe (€)</label><input id="mimp" inputmode="decimal"></div>
        <div class="fldf" id="fPre"><label>VL de compra</label><input id="mpre" inputmode="decimal"></div>
        <div class="fldf"><label>Fecha</label><input id="mf" type="date" value="2026-08-31"></div></div>
      <div id="fNew" style="display:none;margin-top:8px"><input id="mnew" placeholder="Instrumento nuevo"><input id="mnewisin" placeholder="ISIN (opcional)" style="margin-top:6px"></div>
      <div class="err" id="me"></div>
      <button class="primary" id="bMov">Guardar movimiento</button>`;
  } else {
    const posMap={}; let liq=0;
    for(const k of carts){ liq+=st.liquidez[k.cid]||0; for(const [key,t] of Object.entries(st.posiciones)){ const [cc,ii]=key.split('|'); if(cc!==k.cid||Math.abs(t)<1e-8)continue; posMap[ii]=(posMap[ii]||0)+t; } }
    const t4=x=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:4}).format(x);
    const rows=Object.entries(posMap).map(([ii,t])=>{ const vl=vlUlt(st,ii), valor=vl?t*vl/fxOf(st,ii):null; return {nombre:(st.instrumentos[ii]||{}).nombre||'—',t,vl,valor}; }).filter(r=>r.valor!=null).sort((a,b)=>b.valor-a.valor);
    const patF=rows.reduce((a,r)=>a+r.valor,0), patTotD=patF+liq;
    const segs=rows.map(r=>({n:r.nombre,v:r.valor})); if(liq>0.5) segs.push({n:'Liquidez',v:liq});
    const trs=rows.map(r=>`<tr><td>${r.nombre}</td><td class="num">${t4(r.t)}</td><td class="num">${r.vl?t4(r.vl):'—'}</td><td class="num">${eur(r.valor)}</td><td class="num">${pct(r.valor/(patTotD||1))}</td></tr>`).join('')
      +(liq>0.5?`<tr><td>Liquidez</td><td class="num">—</td><td class="num">—</td><td class="num">${eur(liq)}</td><td class="num">${pct(liq/(patTotD||1))}</td></tr>`:'')
      +`<tr class="tot"><td>Total</td><td class="num">—</td><td class="num">—</td><td class="num">${eur(patTotD)}</td><td class="num">100 %</td></tr>`;
    panelDetalle=`<div class="det-row"><div><table><thead><tr><th>Fondo</th><th class="num">Títulos</th><th class="num">VL</th><th class="num">Valor</th><th class="num">Peso</th></tr></thead><tbody>${trs||'<tr><td colspan="5" class="muted">Sin posiciones.</td></tr>'}</tbody></table></div>
      <div class="hero-donut">${segs.length?donutSVG(segs):'<span class="muted">—</span>'}</div></div>
      <div class="gestbox"><div class="muted" style="font-size:11.5px;margin-bottom:8px"><b>Administración</b> — operaciones y carteras de ${p.nombre}.</div>
        <button class="ghost" id="bOperar">Registrar operación</button> <button class="ghost" id="bGestionar">Gestionar carteras</button></div>`;
  }
  // ===== Informe =====
  const minF=(()=>{let m='';for(const i in st.vl)for(const f in st.vl[i])if(!m||f<m)m=f;return m;})();
  const maxF=(()=>{let m='';for(const i in st.vl)for(const f in st.vl[i])if(f>m)m=f;return m;})();
  const panelInforme=`<p class="muted" style="margin:0 0 10px">Informe de ${p.nombre} a la fecha que elijas (vacío = último cierre). Usa los VL del maestro de liquidativos.</p>
    <div class="row no-print" style="margin-bottom:8px"><span class="muted">Carteras:</span> ${carts.map(k=>`<label class="chk"><input type="checkbox" class="icart" value="${k.cid}" checked> ${esc(k.nombre)}</label>`).join('')||'<span class="muted">sin carteras</span>'}
      <label class="chk">Fecha <input id="ifecha" type="date" value="${SELFECHA||''}" min="${minF}" max="${maxF}" style="background:#fff;border-color:var(--linea)"></label>
      <button class="primary" id="bGen">Generar</button><button class="ghost" id="bPdf" style="margin-left:auto">Exportar a PDF</button></div>
    <div id="doc"></div>`;
  const panel = FICHATAB==='personal'?panelPersonal : FICHATAB==='transf'?panelTransf : FICHATAB==='informe'?panelInforme : panelDetalle;
  const ini=(((p.nombre||'')[0]||'')+((p.apellidos||'')[0]||'')||'?').toUpperCase();
  c.innerHTML=`<div class="ficha-head">
      <div class="av">${ini}</div>
      <div style="flex:1"><div class="ph1" style="font-size:18px;margin:0">${nom(p)}</div><div class="sub" style="margin:0">${carts.length} cartera${carts.length===1?'':'s'} · ${eur(patTot)} · ${asesores}</div></div>
      <button class="danger" id="bDP">Eliminar cliente…</button></div>
    <div class="ftabs">
      <div class="ftab ${FICHATAB==='personal'?'on':''}" data-ft="personal">Información personal</div>
      <div class="ftab ${FICHATAB==='transf'?'on':''}" data-ft="transf">Solicitud de transferencia</div>
      <div class="ftab ${FICHATAB==='detalle'?'on':''}" data-ft="detalle">Detalle cartera</div>
      <div class="ftab ${FICHATAB==='informe'?'on':''}" data-ft="informe">Informe</div></div>
    <div>${panel}</div>`;
  $('bDP').onclick=()=>borrarPersona(SEL);
  c.querySelectorAll('[data-ft]').forEach(t=>t.onclick=()=>{ FICHATAB=t.dataset.ft; DETMODE='ver'; renderFicha(); });
  if($('bF')) $('bF').onclick=guardarFicha;
  if($('bCarta')) $('bCarta').onclick=generarCarta;
  if($('bVolverDet')) $('bVolverDet').onclick=()=>{ DETMODE='ver'; renderFicha(); };
  if($('bOperar')) $('bOperar').onclick=()=>{ DETMODE='operar'; renderFicha(); };
  if($('bGestionar')) $('bGestionar').onclick=()=>{ DETMODE='gestionar'; renderFicha(); };
  if($('bNC')) $('bNC').onclick=nuevaCartera;
  if($('bMov')){ $('bMov').onclick=guardarMov; const sc=$('selc'); if(sc) sc.onchange=e=>{ SELC=e.target.value; };
    const t=$('mt'); if(t){ const usaF=()=>['Compra','Venta'].includes($('mt').value); const sync=()=>{ if($('fInst'))$('fInst').style.display=usaF()?'':'none'; if($('fPre'))$('fPre').style.display=usaF()?'':'none'; if($('fNew'))$('fNew').style.display=(usaF()&&$('mi')&&$('mi').value==='__n')?'':'none'; }; t.onchange=sync; if($('mi'))$('mi').onchange=sync; sync(); } }
  c.querySelectorAll('[data-gc]').forEach(b=>b.onclick=()=>guardarCartera(b.dataset.gc));
  c.querySelectorAll('[data-baja]').forEach(b=>b.onclick=()=>bajaCartera(b.dataset.baja));
  c.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>borrarCartera(b.dataset.del));
  c.querySelectorAll('[data-add]').forEach(s=>s.onchange=()=>{ if(s.value) addTitular(s.dataset.add,s.value); });
  c.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>quitaTitular(b.dataset.q,b.dataset.p));
  if(FICHATAB==='informe'){ $('bGen').onclick=()=>{ SELFECHA=($('ifecha').value||''); genInforme(); }; $('bPdf').onclick=()=>window.print(); genInforme(); }
}
async function altaPersona(){ const n=$('nom').value.trim(); if(!n) return; const a=$('ape').value.trim(); const pid=crypto.randomUUID();
  const l=[['alta_persona',{id:pid,nombre:n,apellidos:a,email:'',telefono:'',idioma:'es'}]];
  if($('ci').checked){ const cid=crypto.randomUUID(); l.push(['alta_cartera',{id:cid,nombre:'Cartera individual',tipo:'individual',asesor:asesorActual()}]); l.push(['titular',{cartera:cid,persona:pid}]); }
  await apuntar(l); SEL=pid; await recargarYrender(); }
async function guardarFicha(){ await apuntar([['edit_persona',{id:SEL,nombre:$('fn').value.trim(),apellidos:$('fa').value.trim(),email:$('fe').value.trim(),telefono:$('ft').value.trim(),idioma:$('fi').value,dni:$('fdni').value.trim(),cuentaOrigen:$('fori').value.trim(),bancoDestino:$('fban').value.trim(),ibanDestino:$('fiban').value.trim()}]]); await recargarYrender(); if($('fm'))$('fm').textContent='Guardado.'; }
async function nuevaCartera(){ const nombre=$('ncn').value.trim()||'Cartera'; const otros=[...document.querySelectorAll('.co:checked')].map(i=>i.value); const cid=crypto.randomUUID(); const tipo=otros.length?'conjunta':'individual';
  const l=[['alta_cartera',{id:cid,nombre,tipo,asesor:asesorActual()}],['titular',{cartera:cid,persona:SEL}]]; for(const pid of otros) l.push(['titular',{cartera:cid,persona:pid}]); await apuntar(l); await recargarYrender(); }
async function guardarCartera(cid){ const asr=document.querySelector(`[data-casr="${cid}"]`); await apuntar([['edit_cartera',{id:cid,nombre:document.querySelector(`[data-cn="${cid}"]`).value.trim(),tipo:document.querySelector(`[data-ct="${cid}"]`).value,asesor:asr?asr.value:undefined}]]); await recargarYrender(); }
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
function catGuess(n){n=(n||'').toLowerCase();
  if(/japan|valentum|healthcare|invesco|s&p|equal weight|dividend|cgi|koala|equity/.test(n))return 'RV';
  if(/iurisfond|sigma|monetari|renta fija/.test(n))return 'RF';
  return 'Mixto';}
function renderActualizar(){
  const st=ESTADO; const act=carterasActivas(st);
  if(!SELC && act.length) SELC=act[0].cid;
  const cart=st.carteras[SELC];
  const insts=Object.entries(st.instrumentos).filter(([id,i])=>i&&i.nombre).sort((a,b)=>(a[1].nombre||'').localeCompare(b[1].nombre||''));
  const pos=SELC?Object.entries(st.posiciones).filter(([k,t])=>k.split('|')[0]===SELC&&Math.abs(t)>1e-8).map(([k,t])=>{const inst=k.split('|')[1]; const vl=vlUlt(st,inst); return {inst,tit:t,vl,valor:vl?t*vl/fxOf(st,inst):null};}):[];
  const liq=SELC?(st.liquidez[SELC]||0):0;
  $('view').innerHTML=`<h1>Operaciones</h1>
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
</div></div>`;
  $('selc').onchange=e=>{ SELC=e.target.value; renderActualizar(); };
  const t=$('mt'), usaF=()=>['Compra','Venta'].includes(t.value);
  const sync=()=>{ $('fInst').style.display=usaF()?'':'none'; $('fPre').style.display=usaF()?'':'none'; $('fNew').style.display=(usaF()&&$('mi').value==='__n')?'':'none'; };
  t.onchange=sync; $('mi').onchange=sync; sync();
  $('bMov').onclick=guardarMov;
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
    ev.push(['movimiento',{cartera:SELC,fecha,instrumento:instId,titulos_delta:tipo==='Compra'?tit:-tit,efectivo_delta:tipo==='Compra'?-imp:imp,precio:pre,tipo}]);
  } else {
    const signo=['Aportación','Dividendo'].includes(tipo)?1:-1;
    ev.push(['movimiento',{cartera:SELC,fecha,efectivo_delta:signo*imp,titulos_delta:0,tipo}]);
  }
  await apuntar(ev); $('mimp').value=''; $('mpre').value=''; if($('mnew'))$('mnew').value=''; await recargarYrender();
}
async function guardarVL(){ const inst=$('vi').value, f=$('vf').value, v=pnum($('vv').value); if(isNaN(v)) return; await apuntar([['vl',{instrumento:inst,fecha:f,valor:v}]]); await recargarYrender(); }
async function guardarVLs(){ const f=$('vfecha').value, m=$('vlmsg'); if(m)m.textContent=''; if(!f){ if(m)m.textContent='Pon la fecha de cierre.'; return; }
  const fmt=x=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:6}).format(x);
  const ev=[], avisos=[];
  document.querySelectorAll('[data-vl]').forEach(inp=>{ const v=pnum(inp.value); if(isNaN(v)||v<=0) return; const a=parseFloat(inp.dataset.actual); if(a && Math.abs(v/a-1)>0.15){ const nm=inp.closest('tr').children[0].textContent; avisos.push(`• ${nm}: ${fmt(a)} → ${fmt(v)} (${((v/a-1)*100).toFixed(1).replace('.',',')}%)`); } ev.push(['vl',{instrumento:inp.dataset.vl,fecha:f,valor:v}]); });
  if(!ev.length){ if(m)m.textContent='No has puesto ningún VL.'; return; }
  if(avisos.length && !confirm('Estos valores cambian más de un 15% respecto al anterior. ¿Seguro que son correctos?\n\n'+avisos.join('\n'))) return;
  await apuntar(ev); await recargarYrender();
  const st=ESTADO, P=finMesPrevio(f), mes=f.slice(0,7), rev=[];
  if(P) carterasActivas(st).forEach(c=>{ const r=rentMes(st,c.cid,P,f); if(r!=null && Math.abs(r)<=0.15) rev.push(['rent_mes',{cartera:c.cid,mes,rent:Math.round(r*1e6)/1e6,fecha:f}]); });
  if(rev.length){ await apuntar(rev); await recargarYrender(); }
  if($('vlmsg'))$('vlmsg').textContent='Guardado. Rentabilidad del mes calculada para '+rev.length+' carteras.'; }

async function guardarISIN(){
  const st=ESTADO; const cambios=[];
  document.querySelectorAll('[data-isin]').forEach(inp=>{ const id=inp.dataset.isin, v=inp.value.trim(); const ce=document.querySelector(`[data-cat="${id}"]`); const cat=(ce&&ce.value!=='—')?ce.value:''; const cgEl=document.querySelector(`[data-cg="${id}"]`), cxEl=document.querySelector(`[data-cx="${id}"]`); const g=cgEl?pnum(cgEl.value):NaN, x=cxEl?pnum(cxEl.value):NaN; const ng=isNaN(g)?null:g, nx=isNaN(x)?null:x; const cur=st.instrumentos[id]||{}; if((cur.isin||'')!==v || (cur.categoria||'')!==cat || (cur.comGestion==null?null:cur.comGestion)!==ng || (cur.comExito==null?null:cur.comExito)!==nx) cambios.push(['edit_instrumento',{id,isin:v,categoria:cat,comGestion:ng,comExito:nx}]); });
  if(cambios.length){ await apuntar(cambios); await recargarYrender(); if($('isinmsg'))$('isinmsg').textContent='Guardado.'; }
}
function renderValores(){
  const st=ESTADO;
  const insts=Object.entries(st.instrumentos).filter(([id,i])=>i&&i.nombre).sort((a,b)=>(a[1].nombre||'').localeCompare(b[1].nombre||''));
  $('view').innerHTML=`<h1>Valores liquidativos</h1>
    <div class="card"><h2>Cierre de valores liquidativos</h2>
      <p class="muted" style="margin-top:-6px;margin-bottom:10px">Solo el precio de los fondos (seguimiento mensual), no las compras y ventas de clientes. Pon la fecha de cierre una vez y rellena solo los VL que cambien.</p>
      <div class="row" style="margin-bottom:8px;align-items:center"><label class="chk">Fecha de cierre <input id="vfecha" type="date" style="background:#fff;border-color:var(--linea)"></label><button class="primary" id="bVLs">Guardar VL</button><span class="muted" id="vlmsg"></span></div>
      <table><thead><tr><th>Fondo</th><th class="num">Último VL</th><th class="num">VL del cierre</th><th class="num">Variación</th></tr></thead>
        <tbody>${insts.map(([id,i])=>{const vf=vlUltF(st,id);return `<tr><td>${i.nombre}</td><td class="num muted">${vf?new Intl.NumberFormat('es-ES',{maximumFractionDigits:6}).format(vf[1])+' · '+vf[0].slice(8,10)+'/'+vf[0].slice(5,7):'—'}</td><td class="num"><input data-vl="${id}" data-actual="${vf?vf[1]:''}" inputmode="decimal" placeholder="—" style="width:130px;text-align:right;background:#fff;border-color:var(--linea)"></td><td class="num" data-var="${id}" style="font-size:11px;color:var(--gris)">—</td></tr>`;}).join('')}</tbody></table></div>
    <div class="card"><h2>Maestro de valores</h2>
      <p class="muted" style="margin-top:-6px;margin-bottom:12px">Categoría (RF/RV/Mixto), ISIN y comisiones (gestión y éxito) de cada producto. Uso interno. Las comisiones alimentan el cálculo de las propuestas.</p>
      <table><thead><tr><th>Instrumento</th><th>Tipo</th><th>Categoría</th><th>ISIN</th><th class="num">Gestión %</th><th class="num">Éxito %</th></tr></thead>
        <tbody>${insts.map(([id,i])=>`<tr><td>${i.nombre}</td><td class="muted">${i.tipo}</td><td><select data-cat="${id}" style="background:#fff;border-color:var(--linea)">${['—','RF','RV','Mixto'].map(o=>`<option ${((i.categoria||catGuess(i.nombre))===o)?'selected':''}>${o}</option>`).join('')}</select></td><td><input data-isin="${id}" value="${esc(i.isin||'')}" placeholder="ES0000000000" style="background:#fff;border-color:var(--linea);width:170px"></td><td class="num"><input data-cg="${id}" value="${i.comGestion!=null?String(i.comGestion).replace('.',','):''}" placeholder="—" style="background:#fff;border-color:var(--linea);width:58px;text-align:right"></td><td class="num"><input data-cx="${id}" value="${i.comExito!=null?String(i.comExito).replace('.',','):''}" placeholder="—" style="background:#fff;border-color:var(--linea);width:58px;text-align:right"></td></tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:12px"><button class="primary" id="bISIN">Guardar</button><span class="muted" id="isinmsg"></span></div></div>`;
  $('bVLs').onclick=guardarVLs; if($('bISIN'))$('bISIN').onclick=guardarISIN; $('vfecha').value=finMesPrevio(new Date().toISOString().slice(0,10));
  document.querySelectorAll('[data-vl]').forEach(inp=>{ inp.oninput=()=>{ const a=parseFloat(inp.dataset.actual), v=pnum(inp.value); const cell=document.querySelector(`[data-var="${inp.dataset.vl}"]`); if(!cell)return; if(isNaN(v)||!a){ cell.textContent='—'; cell.style.color='var(--gris)'; cell.style.fontWeight='400'; return; } const d=v/a-1, big=Math.abs(d)>0.15; cell.textContent=(d>=0?'+':'')+(d*100).toFixed(1).replace('.',',')+' %'; cell.style.color=big?'#B0453B':'var(--gris)'; cell.style.fontWeight=big?'700':'400'; }; });
}
// ============ LIQUIDATIVOS (maestro de VL por fecha) ============
let LIQEXTRA=[], LIQSOLOG=false;
const GESIKEY=['gesiuris','cat patrimonis','horma','iurisfond','healthcare','patrimonial','regata','japan deep','koala','panda','annualcycles','good value','intelligent data','balanced euro','euro equities','multigestion','mixto int','desarrollo sostenible'];
const esGesiuris=n=>{ n=(n||'').toLowerCase(); return GESIKEY.some(k=>n.includes(k)); };
function renderLiquidativos(){
  const st=ESTADO;
  let insts=Object.entries(st.instrumentos).filter(([id,i])=>i&&i.nombre);
  if(LIQSOLOG) insts=insts.filter(([id,i])=>esGesiuris(i.nombre));
  insts.sort((a,b)=>(a[1].nombre||'').localeCompare(b[1].nombre||''));
  const dset=new Set(LIQEXTRA);
  for(const [id] of insts){ const m=st.vl[id]||{}; for(const f in m) dset.add(f); }
  const fechas=[...dset].sort();
  const fmtVL=x=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:6}).format(x);
  const dcol=f=>f.slice(8,10)+'/'+f.slice(5,7)+'/'+f.slice(2,4);
  const hoy=new Date().toISOString().slice(0,10);
  const rows=insts.map(([id,i])=>{
    const m=st.vl[id]||{};
    const cells=fechas.map(f=>{ const v=m[f], falta=(v==null); return `<td class="num"><input data-li="${id}" data-f="${f}" value="${v!=null?String(v).replace('.',','):''}" placeholder="—" class="${falta?'liqgap':''}" inputmode="decimal" style="width:92px;text-align:right;background:#fff;border-color:var(--linea)"></td>`; }).join('');
    const uf=vlUltF(st,id);
    return `<tr><td>${i.nombre}</td>${cells}<td class="num muted">${uf?fmtVL(uf[1])+' · '+uf[0].slice(8,10)+'/'+uf[0].slice(5,7):'—'}</td></tr>`;
  }).join('');
  $('view').innerHTML=`<h1>Maestro de liquidativos</h1>
    <p class="muted" style="margin:0 0 12px">Histórico de VL por fondo y fecha. Es la fuente de los informes a fecha: cada informe valora con el último VL con fecha igual o anterior a la elegida.</p>
    <div class="card"><div class="row" style="align-items:center;gap:14px;flex-wrap:wrap">
      <label class="chk">Fecha de referencia (informes) <input id="liqref" type="date" value="${SELFECHA||''}" style="background:#fff;border-color:var(--linea)"></label>
      <label class="chk">Añadir fecha <input id="liqnew" type="date" value="${hoy}" style="background:#fff;border-color:var(--linea)"></label>
      <button class="ghost" id="bLiqAdd">+ Columna</button>
      <label class="chk" style="margin-left:auto"><input type="checkbox" id="liqsolog" ${LIQSOLOG?'checked':''}> Solo fondos Gesiuris</label></div>
      <p class="muted" style="margin:8px 0 0;font-size:11.5px">Las celdas en ámbar faltan: a esa fecha el informe tomaría el VL anterior. Añade una fecha puntual (hoy, intra-mes) y rellena solo los fondos que necesites.</p></div>
    <div class="card"><div style="overflow:auto;max-height:62vh"><table class="liqmat"><thead><tr><th>Fondo</th>${fechas.map(f=>`<th class="num">${dcol(f)}</th>`).join('')}<th class="num">Último</th></tr></thead>
      <tbody>${rows||'<tr><td class="muted">Sin fondos.</td></tr>'}</tbody></table></div>
      <div class="row" style="margin-top:12px"><button class="primary" id="bLiqSave">Guardar liquidativos</button><span class="muted" id="liqmsg"></span></div></div>`;
  $('bLiqAdd').onclick=()=>{ const f=$('liqnew').value; if(f && !LIQEXTRA.includes(f)){ LIQEXTRA.push(f); renderLiquidativos(); } };
  $('liqsolog').onchange=e=>{ LIQSOLOG=e.target.checked; renderLiquidativos(); };
  $('liqref').onchange=e=>{ SELFECHA=e.target.value; };
  $('bLiqSave').onclick=guardarLiq;
  document.querySelectorAll('[data-li]').forEach(inp=>{ inp.oninput=()=>{ inp.classList.toggle('liqgap', !inp.value.trim()); }; });
}
async function guardarLiq(){
  const st=ESTADO, ev=[], m=$('liqmsg'); if(m)m.textContent='';
  document.querySelectorAll('[data-li]').forEach(inp=>{ const v=pnum(inp.value); if(isNaN(v)||v<=0) return; const id=inp.dataset.li, f=inp.dataset.f, cur=(st.vl[id]||{})[f]; if(cur==null || Math.abs(v-cur)>1e-9) ev.push(['vl',{instrumento:id,fecha:f,valor:v}]); });
  if(!ev.length){ if(m)m.textContent='Sin cambios.'; return; }
  await apuntar(ev); LIQEXTRA=[]; await recargarYrender(); if($('liqmsg'))$('liqmsg').textContent=ev.length+' VL guardados.';
}
// ============ INFORMES ============
function pPROP(){ return window.PROP||(window.PROP={tipo:'asset',cliTipo:'exist',cli:'',fut:'',nif:'',edad:'',importe:'',tc:{},ti:{},sel:{},mercados:'',fundam:'',vista:'flujo'}); }
function propNorm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\b(gesiuris|fi|fil|sicav|fund|funds|clase|de|del|la|el|y)\b/g,' ').replace(/\s+/g,' ').trim(); }
function propInst(nombre){ const n=propNorm(nombre); for(const i of Object.values(ESTADO.instrumentos)){ const m=propNorm(i.nombre); if(!m)continue; if((n&&(n.includes(m)||m.includes(n)))){return i;} const kw=m.split(' ').filter(w=>w.length>3); if(kw.length&&kw.every(w=>n.includes(w))){return i;} } return null; }
function propFondos(){ const P=pPROP();
  const rvDef=v=>{v=String(v||'').toUpperCase(); if(v.startsWith('RVM'))return 60; if(v.startsWith('RV'))return 100; if(v==='GLOB')return 50; if(v.startsWith('RFM'))return 20; if(v.startsWith('RF'))return 0; return 50;};
  let fs=FONDOS_UNIVERSO.map(f=>{const i=propInst(f.n);return {n:f.n,g:f.g,v:f.v,rv:rvDef(f.v),gestion:i&&i.comGestion!=null?i.comGestion:null,exito:i&&i.comExito!=null?i.comExito:null};});
  if(P.tipo==='asset') fs=fs.filter(f=>f.g==='G');
  return fs;
}
function catFondo(v){ v=String(v||'').toUpperCase(); if(v.includes('FIL'))return 'FIL'; if(v.startsWith('RF'))return 'RF'; return 'RV'; }
function calcConv(){ const P=pPROP(),t=P.tc||{};
  const p1=(+t.est||0)+(+t.econ||0)+(+t.sector||0)+(+t.crf||0)+(+t.crv||0);
  const conv=f=>{const c=catFondo(f.v); if(c==='RF')return t.eRF||p1>=3; if(c==='RV')return t.eRV||p1>=5; return t.eFIL||p1>=7;};
  return {p1,conv};
}
function calcIdon(){ const P=pPROP(),t=P.ti||{},per=ESTADO.perfiles||{};
  const sk=['ingresos','act_inv','act_inm','horiz','obj','tol','exp_dep','exp_rf','exp_frf','exp_frv','exp_acc','exp_hf','frec','vol','con_cred','con_rent','con_div','con_liq','form'];
  const total=sk.reduce((a,k)=>a+(+t[k]||0),0);
  const def=[['Conservador',0,10,25],['Moderado',11,20,45],['Balanced',21,30,65],['Crecimiento',31,999,100]];
  let perfil='—',rvmax=100;
  for(const [n,a,b,rvm] of def){ const d=per[n]||{}; const lo=d.desde!=null?d.desde:a, hi=d.hasta!=null?d.hasta:(n==='Crecimiento'?999:b), rr=d.rvmax!=null?d.rvmax:rvm;
    if(total>=lo && total<=hi){ perfil=n; rvmax=rr; break; } }
  return {total,perfil,rvmax};
}

function renderPropuestas(){
  const st=ESTADO, P=pPROP(); const t=P.ti||{};
  if(P.vista==='doc'){ return genPropuestaDoc(); }
  const fdb=st.fondos||{}, per=st.perfiles||{};
  const voc={RFME:'RF mixta euro',RFE:'RF euro',RFI:'RF internacional',RFMI:'RF mixta int.',GLOB:'Global',RVE:'RV euro',RVME:'RV mixta euro',RVMI:'RV mixta int.',RVI:'RV internacional'};
  const personas=Object.values(st.personas).map(p=>({id:p.id,n:(p.nombre+' '+(p.apellidos||'')).trim()})).sort((a,b)=>a.n.localeCompare(b.n));
  const sel='style="background:#fff;border-color:var(--linea)"';
  const fs=propFondos();
  const cv=calcConv(), id=calcIdon();
  const disponibles=fs;
  // resumen cartera
  let sumw=0,rvp=0,gesp=0; const selArr=Object.entries(P.sel||{}).filter(([n,w])=>fs.some(f=>f.n===n)&&(+w)>0);
  selArr.forEach(([n,w])=>{const f=fs.find(x=>x.n===n);w=+w;sumw+=w;rvp+=w*(f.rv||0);gesp+=w*(f.gestion||0);});
  const rvPond=sumw?rvp/sumw:0, gesPond=sumw?gesp/sumw:0;
  const aviso=(P.tipo==='wealth' && sumw>0 && rvPond>id.rvmax);
  const nn='style="width:56px;padding:5px;border:1px solid var(--linea);border-radius:6px;background:#fff;text-align:right"';
  const perfiles=[['Conservador',0,10,25],['Moderado',11,20,45],['Balanced',21,30,65],['Crecimiento',31,40,100]];
  $('view').innerHTML=`<h1>Propuestas</h1>
  <div class="card" style="max-width:820px"><h2>1 · Datos de la propuesta</h2>
    <div class="row" style="gap:20px;flex-wrap:wrap;align-items:flex-end">
      <label>Tipo<br><select id="pTipo" ${sel} style="margin-top:4px"><option value="asset" ${P.tipo==='asset'?'selected':''}>Asset — Gesiuris (conveniencia)</option><option value="wealth" ${P.tipo==='wealth'?'selected':''}>Wealth — idoneidad (desde 100.000 €)</option></select></label>
      <label>Cliente<br><select id="pCliTipo" ${sel} style="margin-top:4px"><option value="exist" ${P.cliTipo==='exist'?'selected':''}>Existente</option><option value="fut" ${P.cliTipo==='fut'?'selected':''}>Futuro</option></select></label>
      ${P.cliTipo==='exist'?`<label>Seleccionar<br><select id="pCli" ${sel} style="margin-top:4px;min-width:200px"><option value="">—</option>${personas.map(p=>`<option value="${p.id}" ${P.cli===p.id?'selected':''}>${p.n}</option>`).join('')}</select></label>`:`<label>Futuro cliente<br><input id="pFut" value="${P.fut||''}" placeholder="Nombre y apellidos" ${sel} style="margin-top:4px;min-width:200px"></label>`}
      <label>Edad<br><input id="pEdad" value="${P.edad||''}" placeholder="años" ${sel} style="margin-top:4px;width:80px"></label>
      ${P.tipo==='wealth'?`<label>Importe (€)<br><input id="pImp" value="${P.importe||''}" placeholder="100.000" ${sel} style="margin-top:4px;width:120px"></label>`:''}
    </div>
    ${P.tipo==='wealth'&&P.importe&&(pnum(String(P.importe).replace(/\./g,''))<100000)?`<p class="muted" style="margin-top:10px;color:#B0453B">Aviso: Wealth requiere un mínimo de 100.000 €.</p>`:''}
  </div>

  <div class="card" style="max-width:820px"><h2>2 · ${P.tipo==='asset'?'Test de conveniencia':'Test de idoneidad'}</h2>
  ${P.tipo==='asset'?`
    <div class="row" style="gap:18px;flex-wrap:wrap">
      <label>Estudios<br><select data-tc="est" ${sel}><option value="0">Primarios / sin estudios</option><option value="1">Secundarios</option><option value="2" ${P.tc.est==2?'selected':''}>Universitarios</option></select></label>
      <label>¿Formación en economía?<br><select data-tc="econ" ${sel}><option value="0">No</option><option value="1" ${P.tc.econ==1?'selected':''}>Sí</option></select></label>
      <label>¿Sector financiero?<br><select data-tc="sector" ${sel}><option value="0">No</option><option value="1" ${P.tc.sector==1?'selected':''}>Sí</option></select></label>
      <label>Conocimiento RF<br><select data-tc="crf" ${sel}><option value="0">Bajo</option><option value="1">Medio</option><option value="2">Alto</option></select></label>
      <label>Conocimiento RV<br><select data-tc="crv" ${sel}><option value="0">Bajo</option><option value="1">Medio</option><option value="2">Alto</option></select></label>
    </div>
    <div class="row" style="gap:18px;margin-top:10px"><span class="muted">Experiencia previa:</span>
      <label class="chk"><input type="checkbox" data-tc="eRF" ${P.tc.eRF?'checked':''}> Renta fija</label>
      <label class="chk"><input type="checkbox" data-tc="eRV" ${P.tc.eRV?'checked':''}> Renta variable</label>
      <label class="chk"><input type="checkbox" data-tc="eFIL" ${P.tc.eFIL?'checked':''}> FIL</label></div>
    <p id="pResult" class="muted" style="margin-top:12px"></p>`
  :`
    <div class="muted" style="font-weight:700;margin-bottom:6px">Situación financiera</div>
    <div class="row" style="gap:18px;flex-wrap:wrap">
      <label>Fuente de ingresos<br><select data-tis="fuente" ${sel}>${['Trabajador cuenta ajena','Trabajador cuenta propia','Pensionista/Rentista','Empresario/Empresa','Sin remuneración periódica'].map(o=>`<option ${t.fuente===o?'selected':''}>${o}</option>`).join('')}</select></label>
      <label>Ingresos anuales<br><select data-ti="ingresos" ${sel}><option value="0" ${t.ingresos=='0'?'selected':''}>&lt; 20.000 €</option><option value="1" ${t.ingresos=='1'?'selected':''}>20.000–54.000 €</option><option value="2" ${t.ingresos=='2'?'selected':''}>&gt; 54.000 €</option></select></label>
      <label>Compromisos (hipoteca, créditos…)<br><select data-tis="compromisos" ${sel}>${['No','Sí, menos del 30% de ingresos','Sí, más del 30% de ingresos'].map(o=>`<option ${t.compromisos===o?'selected':''}>${o}</option>`).join('')}</select></label>
    </div>
    <div class="row" style="gap:16px;margin-top:8px"><span class="muted">Otros activos financieros:</span><label class="chk"><input type="checkbox" data-tic="act_inv" data-pts="2" ${t.act_inv?'checked':''}> Inversiones</label> <label class="chk"><input type="checkbox" data-tic="act_inm" data-pts="1" ${t.act_inm?'checked':''}> Inmuebles</label> <label class="chk"><input type="checkbox" data-tic="act_liq" data-pts="0" ${t.act_liq?'checked':''}> Activos líquidos</label></div>
    <div class="muted" style="font-weight:700;margin:14px 0 6px">Objetivos de inversión</div>
    <div class="row" style="gap:18px;flex-wrap:wrap">
      <label>Horizonte<br><select data-ti="horiz" ${sel}><option value="0" ${t.horiz=='0'?'selected':''}>&lt; 6 meses</option><option value="2" ${t.horiz=='2'?'selected':''}>6 m – 2 años</option><option value="5" ${t.horiz=='5'?'selected':''}>2 – 5 años</option><option value="8" ${t.horiz=='8'?'selected':''}>&gt; 5 años</option></select></label>
      <label>Finalidad<br><select data-ti="obj" ${sel}><option value="0" ${t.obj=='0'?'selected':''}>Protección del capital</option><option value="2" ${t.obj=='2'?'selected':''}>Rent. moderada, riesgo limitado</option><option value="6" ${t.obj=='6'?'selected':''}>Oportunidades asumiendo riesgo</option><option value="8" ${t.obj=='8'?'selected':''}>Crecimiento fuerte</option></select></label>
      <label>Tolerancia a pérdida<br><select data-ti="tol" ${sel}><option value="0" ${t.tol=='0'?'selected':''}>Muy baja (sin pérdida)</option><option value="2" ${t.tol=='2'?'selected':''}>Baja (hasta 3%)</option><option value="5" ${t.tol=='5'?'selected':''}>Media (hasta 10%)</option><option value="8" ${t.tol=='8'?'selected':''}>Elevada (&gt;10%)</option></select></label>
    </div>
    <div class="muted" style="font-weight:700;margin:14px 0 6px">Experiencia y conocimientos</div>
    <div class="row" style="gap:14px;flex-wrap:wrap"><span class="muted">Familiarizado con:</span><label class="chk"><input type="checkbox" data-tic="exp_dep" data-pts="1" ${t.exp_dep?'checked':''}> Depósitos</label> <label class="chk"><input type="checkbox" data-tic="exp_rf" data-pts="1" ${t.exp_rf?'checked':''}> Renta fija</label> <label class="chk"><input type="checkbox" data-tic="exp_frf" data-pts="1" ${t.exp_frf?'checked':''}> Fondos RF</label> <label class="chk"><input type="checkbox" data-tic="exp_frv" data-pts="1" ${t.exp_frv?'checked':''}> Fondos RV</label> <label class="chk"><input type="checkbox" data-tic="exp_acc" data-pts="1" ${t.exp_acc?'checked':''}> Acciones</label> <label class="chk"><input type="checkbox" data-tic="exp_hf" data-pts="1" ${t.exp_hf?'checked':''}> Hedge funds</label></div>
    <div class="row" style="gap:18px;margin-top:8px;flex-wrap:wrap">
      <label>Operaciones/año<br><select data-ti="frec" ${sel}><option value="1" ${t.frec=='1'?'selected':''}>0–2</option><option value="2" ${t.frec=='2'?'selected':''}>2–5</option><option value="3" ${t.frec=='3'?'selected':''}>&gt; 5</option></select></label>
      <label>Volumen operado<br><select data-ti="vol" ${sel}><option value="1" ${t.vol=='1'?'selected':''}>0–500.000 €</option><option value="1" ${t.vol=='1'?'selected':''}>&gt; 500.000 €</option></select></label>
    </div>
    <div class="row" style="gap:14px;margin-top:8px;flex-wrap:wrap"><span class="muted">De acuerdo con:</span><label class="chk"><input type="checkbox" data-tic="con_cred" data-pts="1" ${t.con_cred?'checked':''}> Riesgo de crédito = impago del emisor</label> <label class="chk"><input type="checkbox" data-tic="con_rent" data-pts="1" ${t.con_rent?'checked':''}> Más rentabilidad esperada = más riesgo</label> <label class="chk"><input type="checkbox" data-tic="con_div" data-pts="1" ${t.con_div?'checked':''}> Cartera diversificada = menos riesgo</label> <label class="chk"><input type="checkbox" data-tic="con_liq" data-pts="1" ${t.con_liq?'checked':''}> Escasa liquidez = difícil deshacer posición</label></div>
    <div style="margin-top:8px"><label>Actividad laboral / formación<br><select data-ti="form" ${sel}><option value="0" ${t.form=='0'?'selected':''}>Sin formación univ. ni sector</option><option value="1" ${t.form=='1'?'selected':''}>Sector financiero (sin univ.)</option><option value="1" ${t.form=='1'?'selected':''}>Universitaria (sin sector)</option><option value="2" ${t.form=='2'?'selected':''}>Universitaria y sector</option></select></label></div>
    <div class="muted" style="font-weight:700;margin:14px 0 6px">Preferencias de sostenibilidad</div>
    <div class="row"><label>¿Tiene preferencias de sostenibilidad?<br><select data-tis="sost" ${sel}>${['No','Sí','Delego en la Entidad'].map(o=>`<option ${t.sost===o?'selected':''}>${o}</option>`).join('')}</select></label></div>
    <p id="pResult" class="muted" style="margin-top:12px"></p>`}
  </div>

  <div class="card"><h2>3 · Cartera propuesta</h2>
    <p class="muted" style="margin-top:-6px;margin-bottom:10px">Añade los fondos e indica su <b>importe (€)</b>; el peso se calcula automáticamente. ${P.tipo==='asset'?'Universo Gesiuris.':'Gesiuris y terceros.'}</p>
    <table><thead><tr><th>Fondo</th><th>Vocación</th><th class="num">RV %</th><th class="num">Importe €</th><th class="num">Peso %</th><th></th></tr></thead><tbody>
    ${Object.keys(P.sel||{}).filter(n=>fs.some(f=>f.n===n)).map(n=>{const f=fs.find(x=>x.n===n);const imp=P.sel[n];return `<tr><td>${n}</td><td class="muted">${voc[f.v]||f.v||'—'}</td><td class="num muted">${f.rv!=null?f.rv:'—'}</td><td class="num"><input data-seli="${n}" value="${imp?new Intl.NumberFormat('es-ES').format(imp):''}" placeholder="€" style="width:120px;padding:5px 8px;border:1px solid var(--linea);border-radius:6px;background:#fff;text-align:right"></td><td class="num muted" data-peso="${n}">—</td><td class="num"><button data-selx="${n}" title="Quitar" style="border:none;background:none;color:#B0453B;cursor:pointer;font-size:16px;line-height:1">×</button></td></tr>`;}).join('')||'<tr><td colspan="6" class="muted">Aún no has añadido fondos. Usa el desplegable de abajo.</td></tr>'}
    </tbody></table>
    <div class="row" style="margin-top:10px;gap:10px;align-items:center"><select id="wAdd" style="background:#fff;border-color:var(--linea);min-width:300px"><option value="">— Añadir fondo a la cartera —</option>${fs.filter(f=>!(P.sel&&P.sel[f.n]!=null)).map(f=>`<option value="${f.n}">${f.n}</option>`).join('')}</select><input id="wW" placeholder="importe €" style="width:120px;padding:6px 8px;border:1px solid var(--linea);border-radius:6px;background:#fff;text-align:right"><button class="primary" id="bWAdd">Añadir</button></div>
    <div id="pCartResumen" style="margin-top:12px"></div>
  </div>

  <div class="card" style="max-width:820px"><h2>4 · Situación de mercados y fundamentación</h2>
    <p class="muted" style="margin-top:-6px;margin-bottom:10px">Redactado por el asesor. Fundamenta la propuesta según perfil de riesgo, entorno de mercado y edad del cliente.</p>
    <div class="muted" style="font-size:12px;margin-bottom:4px">Situación de mercados</div>
    <textarea id="pMerc" rows="4" style="width:100%;padding:8px;border:1px solid var(--linea);border-radius:8px;background:#fff" placeholder="Contexto actual de mercados…">${P.mercados||''}</textarea>
    <div class="muted" style="font-size:12px;margin:10px 0 4px">Fundamentación de la propuesta</div>
    <textarea id="pFund" rows="4" style="width:100%;padding:8px;border:1px solid var(--linea);border-radius:8px;background:#fff" placeholder="Por qué esta cartera para este perfil, entorno y edad…">${P.fundam||''}</textarea>
    <div class="row" style="margin-top:14px"><button class="primary" id="bDoc">Generar documento de propuesta</button></div>
  </div>

  <div class="card" style="max-width:820px"><h2 class="muted" style="color:var(--gris)">Configuración</h2>
    <details><summary class="muted" style="cursor:pointer">Perfiles de idoneidad</summary>
    <div style="margin-top:12px">
    <h3 style="margin-top:18px">Perfiles de idoneidad <span class="muted" style="font-weight:400;font-size:12px">— tramos provisionales, a validar con Gesiuris</span></h3>
    <table><thead><tr><th>Perfil</th><th class="num">Desde</th><th class="num">Hasta</th><th class="num">RV máx %</th></tr></thead><tbody>
    ${perfiles.map(([n,a,b,rvm])=>{const d=per[n]||{};return `<tr><td>${n}</td><td class="num"><input data-pa="${n}" value="${d.desde!=null?d.desde:a}" ${nn}></td><td class="num"><input data-pb="${n}" value="${d.hasta!=null?d.hasta:b}" ${nn}></td><td class="num"><input data-pr="${n}" value="${d.rvmax!=null?d.rvmax:rvm}" ${nn}></td></tr>`;}).join('')}
    </tbody></table>
    <div class="row" style="margin-top:10px"><button class="primary" id="bPer">Guardar perfiles</button><span class="muted" id="perMsg"></span></div>
    </div></details>
  </div>`;

  // --- bindings ---
  const re=()=>renderPropuestas();
  $('pTipo').onchange=e=>{P.tipo=e.target.value;re();};
  $('pCliTipo').onchange=e=>{P.cliTipo=e.target.value;re();};
  if($('pCli'))$('pCli').onchange=e=>{P.cli=e.target.value;};
  if($('pFut'))$('pFut').oninput=e=>{P.fut=e.target.value;};
  if($('pEdad'))$('pEdad').oninput=e=>{P.edad=e.target.value;};
  if($('pImp'))$('pImp').oninput=e=>{P.importe=e.target.value;};
  document.querySelectorAll('[data-tc]').forEach(el=>{const k=el.dataset.tc; el.onchange=()=>{P.tc[k]=el.type==='checkbox'?el.checked:el.value; re();};});
  document.querySelectorAll('[data-ti]').forEach(el=>{const k=el.dataset.ti; el.onchange=()=>{P.ti[k]=el.value; re();};});
  document.querySelectorAll('[data-tic]').forEach(el=>{const k=el.dataset.tic; el.onchange=()=>{P.ti[k]=el.checked?(+el.dataset.pts||0):0; re();};});
  document.querySelectorAll('[data-tis]').forEach(el=>{const k=el.dataset.tis; el.onchange=()=>{P.ti[k]=el.value; actualizarResumenCartera();};});
  document.querySelectorAll('[data-seli]').forEach(el=>{const n=el.dataset.seli; el.oninput=()=>{ let x=String(el.value||'').trim().replace(/\s/g,''); if(x.includes(','))x=x.replace(/\./g,'').replace(',','.'); else if((x.match(/\./g)||[]).length>1||/\.\d{3}$/.test(x))x=x.replace(/\./g,''); const v=parseFloat(x); P.sel[n]=isNaN(v)?0:v; actualizarResumenCartera(); };});
  document.querySelectorAll('[data-selx]').forEach(el=>{el.onclick=()=>{ delete P.sel[el.dataset.selx]; re(); };});
  if($('bWAdd'))$('bWAdd').onclick=()=>{ const n=$('wAdd').value; if(!n)return; let x=String($('wW').value||'').trim().replace(/\s/g,''); if(x.includes(','))x=x.replace(/\./g,'').replace(',','.'); else if((x.match(/\./g)||[]).length>1||/\.\d{3}$/.test(x))x=x.replace(/\./g,''); const w=parseFloat(x); P.sel[n]=isNaN(w)?0:w; re(); };
  if($('pMerc'))$('pMerc').oninput=e=>{P.mercados=e.target.value;};
  if($('pFund'))$('pFund').oninput=e=>{P.fundam=e.target.value;};
  $('bDoc').onclick=()=>{ P.vista='doc'; renderPropuestas(); };
  // resultado test
  const pr=$('pResult');
  if(pr){ if(P.tipo==='asset'){ pr.innerHTML=`Puntuación de conocimientos: <b>${cv.p1}</b> · Fondos convenientes: <b>${fs.filter(f=>cv.conv(f)).length}</b> de ${fs.length}.`; }
    else { pr.innerHTML=`Puntuación total: <b>${id.total}</b> · Perfil: <b>${id.perfil}</b> · RV máx.: <b>${id.rvmax}%</b>.`; } }
  actualizarResumenCartera();
  // config saves
  if($('bPer'))$('bPer').onclick=async()=>{const camb=[];const q=(a,n)=>document.querySelector('['+a+'="'+(window.CSS?CSS.escape(n):n)+'"]');
    perfiles.forEach(row=>{const n=row[0],d=(st.perfiles||{})[n]||{};const a=pnum(q('data-pa',n).value),b=pnum(q('data-pb',n).value),r=pnum(q('data-pr',n).value);
      const nv={desde:isNaN(a)?null:a,hasta:isNaN(b)?null:b,rvmax:isNaN(r)?null:r};
      if((d.desde==null?null:d.desde)!==nv.desde||(d.hasta==null?null:d.hasta)!==nv.hasta||(d.rvmax==null?null:d.rvmax)!==nv.rvmax)camb.push(['perfil',{perfil:n,...nv}]);});
    if(camb.length){await apuntar(camb);await recargarYrender();if($('perMsg'))$('perMsg').textContent='Guardado.';}};
}
function actualizarResumenCartera(){ const P=pPROP(),fs=propFondos(),idn=calcIdon();
  const ne=v=>{let x=String(v||'').trim().replace(/\s/g,''); if(!x)return 0; if(x.includes(','))x=x.replace(/\./g,'').replace(',','.'); else if((x.match(/\./g)||[]).length>1||/\.\d{3}$/.test(x))x=x.replace(/\./g,''); return parseFloat(x)||0; };
  const ent=Object.entries(P.sel||{}).map(([n,imp])=>{const f=fs.find(x=>x.n===n);return {n,f,imp:+imp||0};}).filter(e=>e.f);
  let tot=0,rv=0,ges=0; ent.forEach(e=>{tot+=e.imp;rv+=e.imp*(e.f.rv||0);ges+=e.imp*(e.f.gestion||0);});
  ent.forEach(e=>{const c=document.querySelector('[data-peso="'+(window.CSS?CSS.escape(e.n):e.n)+'"]'); if(c)c.textContent=(tot?e.imp/tot*100:0).toFixed(1).replace('.',',')+'%';});
  const rvPond=tot?rv/tot:0,gesPond=tot?ges/tot:0;
  const el=$('pCartResumen'); if(!el)return;
  const avisoRV=(P.tipo==='wealth'&&tot>0&&rvPond>idn.rvmax);
  const fmt=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(n||0)+' €';
  el.innerHTML=`<div class="muted">Importe total: <b>${fmt(tot)}</b> · RV ponderada: <b>${rvPond.toFixed(0)}%</b> · Comisión gestión ponderada: <b>${gesPond.toFixed(2).replace('.',',')}%</b></div>
  ${avisoRV?`<div style="margin-top:8px;padding:8px 12px;background:#FBEDEA;border-radius:8px;color:#B0453B">⚠ La RV ponderada (${rvPond.toFixed(0)}%) supera el límite del perfil ${idn.perfil} (${idn.rvmax}%). Ajusta la cartera.</div>`:''}
  ${(P.tipo==='wealth'&&P.importe&&tot>0&&Math.abs(tot-ne(P.importe))>1)?`<div style="margin-top:6px" class="muted">El importe declarado (${fmt(ne(P.importe))}) no coincide con la suma de fondos (${fmt(tot)}).</div>`:''}`;
}

function genPropuestaDoc(){
  const st=ESTADO, P=pPROP(), fs=propFondos();
  const voc={RFME:'RF mixta euro',RFE:'RF euro',RFI:'RF internacional',RFMI:'RF mixta int.',GLOB:'Global',RVE:'RV euro',RVME:'RV mixta euro',RVMI:'RV mixta int.',RVI:'RV internacional'};
  const cv=calcConv(), id=calcIdon();
  const nombre=P.cliTipo==='exist'?(st.personas[P.cli]?((st.personas[P.cli].nombre+' '+(st.personas[P.cli].apellidos||'')).trim()):'—'):(P.fut||'—');
  const hoy=new Date().toLocaleDateString('es-ES');
  const selArr=Object.entries(P.sel||{}).map(([n,imp])=>({f:fs.find(x=>x.n===n),imp:+imp||0})).filter(x=>x.f&&x.imp>0);
  let tot=0,rvp=0,gesp=0; selArr.forEach(s=>{tot+=s.imp;rvp+=s.imp*(s.f.rv||0);gesp+=s.imp*(s.f.gestion||0);});
  const rvPond=tot?rvp/tot:0, gesPond=tot?gesp/tot:0; const fmtE=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(n||0)+' €';
  const esc=t=>String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>');
  const regimen=P.tipo==='asset'?'conveniencia':'idoneidad (asesoramiento)';
  $('view').innerHTML=`
  <div class="no-print" style="margin-bottom:14px"><button id="pbVolver">← Volver</button> <button class="primary" id="pbImprimir">Imprimir / PDF</button></div>
  <div id="pdoc" style="max-width:900px;margin:0 auto;background:#fff;border:1px solid var(--linea);border-radius:8px;padding:32px 36px">
    <div style="border-bottom:2px solid var(--salmon-osc);padding-bottom:12px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-end">
      <div><div style="font-size:13px;letter-spacing:3px;color:var(--salmon-osc);font-weight:700">HITCH CAPITAL</div>
      <div style="font-size:24px;font-weight:700;color:var(--gris-osc);margin-top:4px">Propuesta de inversión</div></div>
      <div class="muted" style="text-align:right;font-size:12px">${hoy}<br>Régimen de ${regimen}<br>${P.tipo==='asset'?'Asset · fondos Gesiuris':'Wealth · cartera asesorada'}</div>
    </div>
    <table style="width:100%;margin-bottom:22px"><tbody>
      <tr><td class="muted" style="width:140px">Cliente</td><td><b>${esc(nombre)}</b>${P.cliTipo==='fut'?' <span class="muted">(futuro cliente)</span>':''}</td>
      <td class="muted" style="width:90px">Edad</td><td>${P.edad?esc(P.edad)+' años':'—'}</td></tr>
      ${P.tipo==='wealth'?`<tr><td class="muted">Importe</td><td colspan="3">${P.importe?esc(P.importe)+' €':'—'}</td></tr>`:''}
    </tbody></table>

    <h3 style="color:var(--salmon-osc);border-bottom:1px solid var(--linea);padding-bottom:4px">Perfil del cliente</h3>
    ${P.tipo==='asset'
      ?`<p>Evaluado mediante <b>test de conveniencia</b>. Puntuación de conocimientos y experiencia: <b>${cv.p1}</b>. La propuesta se limita a instrumentos para los que el producto resulta <b>conveniente</b> para el cliente.</p>`
      :`<p>Evaluado mediante <b>test de idoneidad</b>. Puntuación total: <b>${id.total}</b>. Perfil de riesgo asignado: <b>${id.perfil}</b> (límite de renta variable: ${id.rvmax}%).</p>`}

    <h3 style="color:var(--salmon-osc);border-bottom:1px solid var(--linea);padding-bottom:4px">Situación de mercados</h3>
    <p>${P.mercados?esc(P.mercados):'<span class="muted">— pendiente de redactar —</span>'}</p>
    <h3 style="color:var(--salmon-osc);border-bottom:1px solid var(--linea);padding-bottom:4px">Fundamentación de la propuesta</h3>
    <p>${P.fundam?esc(P.fundam):'<span class="muted">— pendiente de redactar —</span>'}</p>

    <h3 style="color:var(--salmon-osc);border-bottom:1px solid var(--linea);padding-bottom:4px">Cartera propuesta</h3>
    <table style="width:100%"><thead><tr><th>Fondo</th><th>Vocación</th><th class="num">RV %</th><th class="num">Importe €</th><th class="num">Peso %</th></tr></thead><tbody>
    ${selArr.map(s=>`<tr><td>${s.f.n}</td><td class="muted">${voc[s.f.v]||s.f.v||'—'}</td><td class="num">${s.f.rv!=null?s.f.rv:'—'}</td><td class="num">${fmtE(s.imp)}</td><td class="num">${tot?(s.imp/tot*100).toFixed(1).replace('.',','):'0,0'}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">Sin fondos seleccionados.</td></tr>'}
    <tr class="tot"><td><b>Total</b></td><td></td><td class="num"><b>${rvPond.toFixed(0)}%</b></td><td class="num"><b>${fmtE(tot)}</b></td><td class="num"><b>100,0%</b></td></tr>
    </tbody></table>
    ${(P.tipo==='wealth'&&tot>0&&rvPond>id.rvmax)?`<p style="color:#B0453B"><b>Nota:</b> la renta variable ponderada (${rvPond.toFixed(0)}%) supera el límite del perfil ${id.perfil} (${id.rvmax}%); requiere ajuste.</p>`:''}

    <h3 style="color:var(--salmon-osc);border-bottom:1px solid var(--linea);padding-bottom:4px">Comisiones</h3>
    ${P.tipo==='asset'
      ?`<p>La comisión de la cartera es la media ponderada de la comisión de gestión de cada fondo por su peso: <b>${gesPond.toFixed(2).replace('.',',')}%</b> anual${gesPond===0?' <span class="muted">(completa el maestro de comisiones)</span>':''}.</p>`
      :`<p>Cartera asesorada: comisión de gestión y, en su caso, comisión de éxito con marca de agua según la tarifa de Wealth acordada (ver simulador).</p>`}

    <div style="margin-top:28px;border-top:1px solid var(--linea);padding-top:12px">
      <div style="font-size:12px;color:var(--gris)"><b>Aviso legal.</b> Documento informativo de carácter confidencial, para uso exclusivo del cliente, elaborado en régimen de ${regimen}. Hitch Capital presta servicios de asesoramiento y no gestiona ni custodia los instrumentos; los servicios reservados los prestan entidades habilitadas. La información se basa en lo facilitado por el cliente, que no se audita. Rentabilidades pasadas no garantizan rentabilidades futuras.</div>
      <div style="font-size:11px;color:var(--gris);margin-top:8px">HITCH GROUP PARTNERS, S.L. · CIF B42750109 · Av. Diagonal 448, Planta 4, 08006 Barcelona</div>
      <div style="margin-top:14px">Gianni Bertran · Partner</div>
    </div>
  </div>`;
  $('pbVolver').onclick=()=>{ P.vista='flujo'; renderPropuestas(); };
  $('pbImprimir').onclick=()=>window.print();
}

function renderSimulador(){
  const S=window.SIM||(window.SIM={});
  const inp='style="width:200px;padding:9px 11px;border:1px solid var(--linea);border-radius:8px;background:#fff;font-size:14px"';
  $('view').innerHTML=`<h1>Simulador de comisiones</h1>
  <div class="card" style="max-width:600px">
    <h2>Cartera asesorada &middot; Wealth</h2>
    <p class="muted" style="margin-top:-6px;margin-bottom:16px">La comisión de gestión se cobra mensualmente; la comisión de éxito, con marca de agua, se cobra anualmente sobre la ganancia que supere el máximo anterior.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 18px">
      <div><div class="muted" style="font-size:12px;margin-bottom:4px">Importe de la cartera (€)</div><input id="simImp" type="text" value="${S.imp||''}" placeholder="1.000.000" ${inp}></div>
      <div><div class="muted" style="font-size:12px;margin-bottom:4px">Rentabilidad anual estimada (%)</div><input id="simRent" type="text" value="${S.rent||''}" placeholder="5,0" ${inp}></div>
      <div><div class="muted" style="font-size:12px;margin-bottom:4px">Comisión de gestión (% anual)</div><input id="simGes" type="text" value="${S.ges||''}" placeholder="1,00" ${inp}></div>
      <div><div class="muted" style="font-size:12px;margin-bottom:4px">Comisión de éxito (% &middot; marca de agua)</div><input id="simExi" type="text" value="${S.exi||''}" placeholder="9,00" ${inp}></div>
      <div><div class="muted" style="font-size:12px;margin-bottom:4px">Reparto asesor (%)</div><input id="simRep" type="text" value="${S.rep||''}" placeholder="60" ${inp}></div>
    </div>
    <div id="simOut" style="margin-top:20px"></div>
  </div>`;
  const f=n=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'}).format(n||0)+' €';
  const pc=n=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format((n||0)*100)+' %';
  const num=v=>{ let x=String(v||'').trim().replace(/\s/g,''); if(!x) return 0;
    if(x.includes(',')) x=x.replace(/\./g,'').replace(',','.');
    else if((x.match(/\./g)||[]).length>1 || /\.\d{3}$/.test(x)) x=x.replace(/\./g,'');
    return parseFloat(x)||0; };
  const calc=()=>{
    const imp=num($('simImp').value), r=num($('simRent').value)/100,
          ges=num($('simGes').value)/100, exi=num($('simExi').value)/100, rep=(num($('simRep').value)||60)/100;
    const gesMes=imp*ges/12, gesAnio=imp*ges, ganancia=imp*r, exiAnio=exi*Math.max(0,ganancia);
    const totAnio=gesAnio+exiAnio, neta=imp>0?(ganancia-totAnio)/imp:0;
    $('simOut').innerHTML=`<table style="width:100%"><tbody>
      <tr><td>Comisión de gestión</td><td class="num"><b>${f(gesMes)}</b> <span class="muted">/ mes</span></td><td class="num">${f(gesAnio)} <span class="muted">/ año</span></td></tr>
      <tr><td>Comisión de éxito <span class="muted">(sobre ganancia de ${f(ganancia)})</span></td><td class="num">—</td><td class="num"><b>${f(exiAnio)}</b> <span class="muted">/ año</span></td></tr>
      <tr class="tot"><td><b>Al mes</b></td><td class="num"><b>${f(gesMes)}</b></td><td></td></tr>
      <tr class="tot"><td><b>Al año</b> <span class="muted">(gestión + éxito)</span></td><td></td><td class="num"><b>${f(totAnio)}</b></td></tr>
      <tr><td class="muted">Reparto &middot; Asesor</td><td></td><td class="num">${f(totAnio*rep)} <span class="muted">/ año</span></td></tr>
      <tr><td class="muted">Reparto &middot; Gesiuris</td><td></td><td class="num">${f(totAnio*(1-rep))} <span class="muted">/ año</span></td></tr>
      <tr><td class="muted">Coste total sobre patrimonio</td><td></td><td class="num muted">${imp>0?pc(totAnio/imp):'—'}</td></tr>
      <tr><td class="muted">Rentabilidad neta estimada</td><td></td><td class="num muted">${pc(neta)}</td></tr>
    </tbody></table>`;
  };
  ['simImp','simRent','simGes','simExi','simRep'].forEach(id=>{ if($(id)) $(id).oninput=()=>{ S.imp=$('simImp').value;S.rent=$('simRent').value;S.ges=$('simGes').value;S.exi=$('simExi').value;S.rep=$('simRep').value; calc(); }; });
  calc();
}

function renderInformes(){
  const st=ESTADO; const personas=Object.values(st.personas);
  if(!SELCLI && personas.length) SELCLI=personas[0].id;
  const cli=st.personas[SELCLI]; const carts=cli?cartsDe(st,SELCLI):[];
  $('view').innerHTML=`<h1>Informes</h1>
    <div class="card no-print"><div class="row"><label class="chk">Cliente
      <select id="ic">${personas.map(p=>`<option value="${p.id}" ${p.id===SELCLI?'selected':''}>${nom(p)}</option>`).join('')}</select></label>
      <span class="muted">Carteras:</span> ${carts.map(c=>`<label class="chk"><input type="checkbox" class="icart" value="${c.cid}" checked> ${c.nombre}</label>`).join('')||'<span class="muted">este cliente no tiene carteras</span>'}
      <label class="chk">Fecha <input id="ifecha" type="date" value="${SELFECHA||''}" min="${(()=>{let m='';for(const i in st.vl)for(const f in st.vl[i])if(!m||f<m)m=f;return m;})()}" max="${(()=>{let m='';for(const i in st.vl)for(const f in st.vl[i])if(f>m)m=f;return m;})()}" title="Fecha de valoración (vacío = último cierre)"></label>
      <button class="primary" id="bGen">Generar</button><button class="ghost" id="bPdf" style="margin-left:auto">Exportar a PDF</button></div></div>
    <div id="doc"></div>`;
  $('ic').onchange=e=>{ SELCLI=e.target.value; renderInformes(); };
  $('bGen').onclick=()=>{ SELFECHA=($('ifecha').value||''); genInforme(); }; $('bPdf').onclick=()=>window.print();
  genInforme();
}
function genInforme(){
  const st=ESTADO, cli=st.personas[SELCLI]; if(!cli){ $('doc').innerHTML=''; return; }
  const marcadas=[...document.querySelectorAll('.icart:checked')].map(i=>i.value);
  if(!marcadas.length){ $('doc').innerHTML='<div class="page"><div class="muted" style="padding:40px">Marca al menos una cartera.</div></div>'; return; }
  // Un informe independiente por cartera (individuales y conjuntas se generan por separado)
  $('doc').innerHTML=marcadas.map(cid=>armarInforme([cid])).join('');
  const _F=(SELFECHA&&/^\d{4}-\d{2}-\d{2}$/.test(SELFECHA))?SELFECHA:(()=>{let mx='';for(const i in st.vl)for(const k in st.vl[i])if(k>mx)mx=k;return mx||'2026-08-31';})();
  document.title=(nom(cli)||'Informe').replace(/[^\wÀ-ſ]+/g,'_').replace(/^_+|_+$/g,'')+'_'+_F;
}
function armarInforme(cids){
  const st=ESTADO, cli=st.personas[SELCLI]; if(!cli) return '';
  const lang=(cli&&cli.idioma==='ca')?'ca':'es';
  const LBL={es:{y:"y",informe:"INFORME DE CARTERA",cierre:"Cierre",patrimonio:"Patrimonio",resultado:"Resultado 2026",rentabilidad:"Rentabilidad 2026",ultmes:"Último mes",comp:"Composición actual",compcap:"Detalle de la inversión",activo:"Activo",vlc:"VL compra",vlact:"VL actual",vini:"Valor inicial",vact:"Valor actual",dife:"Dif. €",difp:"Dif. %",peso:"Peso",total:"Total",distrib:"Distribución por pesos",distribcap:"Peso de cada instrumento",evol:"Evolución del año",evolcap:"Rentabilidad acumulada 2026",sinmes:"Sin datos mensuales para este cliente.",histanual:"Histórico anual",detanual:"Detalle anual",detanualcap:"Aportaciones, retiradas y resultado",anio:"Año",inicio:"Inicio €",fin:"Fin €",aport:"Aport. €",retir:"Retir. €",resultadoe:"Resultado €",rent:"Rent.",estado:"Estado",encurso:"En curso",cerrado:"Cerrado",sinhist:"Sin histórico anual.",vol:"Volatilidad anual",caida:"Caída máxima",rmens:"Rentabilidad mensual 2026",ranual:"Rentabilidad anual",opsmov:"Operaciones y movimientos",opsinicio:"Operaciones desde inicio",fecha:"Fecha",operacion:"Operación",instrumento:"Instrumento",importe:"Importe €",precio:"Precio",titulos:"Títulos",sinops:"Sin operaciones.",apdisp:"Aportaciones y disposiciones",ap2026:"Aportaciones 2026",disp2026:"Disposiciones 2026",apini:"Aportación inicial (inicio de la relación)",aptot:"Aportaciones totales desde inicio",disptot:"Disposiciones desde inicio",aviso:"Aviso legal",confid:"Informe confidencial · uso exclusivo del cliente",sinevol:"Sin evolución mensual.",avisotxt:"Documento informativo de carácter confidencial, para uso exclusivo del cliente. La información se ha elaborado a partir de fuentes consideradas fiables a la fecha de emisión y no constituye asesoramiento ni recomendación de inversión. Los datos se refieren al cierre indicado y pueden variar. Rentabilidades pasadas no garantizan rentabilidades futuras."},
  ca:{y:"i",informe:"INFORME DE CARTERA",cierre:"Tancament",patrimonio:"Patrimoni",resultado:"Resultat 2026",rentabilidad:"Rendibilitat 2026",ultmes:"Últim mes",comp:"Composició actual",compcap:"Detall de la inversió",activo:"Actiu",vlc:"VL compra",vlact:"VL actual",vini:"Valor inicial",vact:"Valor actual",dife:"Dif. €",difp:"Dif. %",peso:"Pes",total:"Total",distrib:"Distribució per pesos",distribcap:"Pes de cada instrument",evol:"Evolució de l'any",evolcap:"Rendibilitat acumulada 2026",sinmes:"Sense dades mensuals per a aquest client.",histanual:"Històric anual",detanual:"Detall anual",detanualcap:"Aportacions, retirades i resultat",anio:"Any",inicio:"Inici €",fin:"Fi €",aport:"Aport. €",retir:"Retir. €",resultadoe:"Resultat €",rent:"Rend.",estado:"Estat",encurso:"En curs",cerrado:"Tancat",sinhist:"Sense històric anual.",vol:"Volatilitat anual",caida:"Caiguda màxima",rmens:"Rendibilitat mensual 2026",ranual:"Rendibilitat anual",opsmov:"Operacions i moviments",opsinicio:"Operacions des de l'inici",fecha:"Data",operacion:"Operació",instrumento:"Instrument",importe:"Import €",precio:"Preu",titulos:"Títols",sinops:"Sense operacions.",apdisp:"Aportacions i disposicions",ap2026:"Aportacions 2026",disp2026:"Disposicions 2026",apini:"Aportació inicial (inici de la relació)",aptot:"Aportacions totals des de l'inici",disptot:"Disposicions des de l'inici",aviso:"Avís legal",confid:"Informe confidencial · ús exclusiu del client",sinevol:"Sense evolució mensual.",avisotxt:"Document informatiu de caràcter confidencial, per a ús exclusiu del client. La informació s'ha elaborat a partir de fonts considerades fiables a la data d'emissió i no constitueix assessorament ni recomanació d'inversió. Les dades es refereixen al tancament indicat i poden variar. Les rendibilitats passades no garanteixen rendibilitats futures."}};
  const L=LBL[lang];
  const titNombres=[...new Set(cids.flatMap(c=>titularesDe(st,c)))].map(pid=>nom(st.personas[pid])).filter(Boolean);
  const fmtN=a=>a.length<=1?(a[0]||''):(a.length===2?a.join(' '+L.y+' '):a.slice(0,-1).join(', ')+' '+L.y+' '+a[a.length-1]);
  const titulo=(titNombres.length?fmtN(titNombres):nom(cli)).toUpperCase();
  const FECHA=(SELFECHA&&/^\d{4}-\d{2}-\d{2}$/.test(SELFECHA))?SELFECHA:null;
  const ultVL=(()=>{const held=new Set();for(const m of st.movimientos){if(cids.includes(m.cartera)&&m.instrumento)held.add(m.instrumento);}let mx='';for(const inst of held){const mm=st.vl[inst]||{};for(const _k in mm)if(_k>mx)mx=_k;}if(!mx){for(const _i in st.vl){for(const _k in st.vl[_i])if(_k>mx)mx=_k;}}return mx||'2026-08-31';})();
  const cierreISO=FECHA||ultVL;
  const cierreFmt=cierreISO.slice(8,10)+'/'+cierreISO.slice(5,7)+'/'+cierreISO.slice(0,4);
  // Valoración a la fecha elegida: VL, títulos y liquidez considerando solo lo ocurrido hasta esa fecha
  const vlF=(inst)=>{ const m=st.vl[inst]||{}; const ks=Object.keys(m).filter(f=>!FECHA||f<=FECHA).sort(); return ks.length?m[ks[ks.length-1]]:null; };
  const liqAFecha=(cid)=>{ let v=0; for(const m of st.movimientos){ if(m.cartera!==cid)continue; if(FECHA&&m.fecha&&m.fecha>FECHA)continue; v+=m.efectivo_delta||0; } return v; };
  if(!cids.length) return '';
  const e0=n=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'}).format(n||0)+' €';
  const p2=n=>(n>=0?'+':'')+new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format((n||0)*100)+' %';
  const p1=n=>{let x=(n||0)*100; if(Math.abs(x)<0.05) x=0; return new Intl.NumberFormat('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1}).format(x)+' %';};
  const t4=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:4}).format(n||0);
  const patTotal=(()=>{ let v=0; const pos={}; for(const m of st.movimientos){ if(!cids.includes(m.cartera)||!m.instrumento)continue; if(FECHA&&m.fecha&&m.fecha>FECHA)continue; pos[m.instrumento]=(pos[m.instrumento]||0)+(m.titulos_delta||0); } for(const [inst,t] of Object.entries(pos)){ if(Math.abs(t)<1e-8)continue; const vl=vlF(inst); if(vl!=null)v+=t*vl/fxOf(st,inst); } return v+cids.reduce((a,c)=>a+liqAFecha(c),0); })();
  const valF=patTotal-cids.reduce((a,c)=>a+liqAFecha(c),0);
  if(FECHA && Math.abs(patTotal)<0.01){ const primerVL=(()=>{let mn='';for(const _i in st.vl)for(const _k in st.vl[_i])if(!mn||_k<mn)mn=_k;return mn;})(); const _f=d=>d?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):''; return `<div class="page"><div class="htop"><div class="t">${titulo}<small>${L.informe}</small></div><div class="r">${cierreFmt}</div></div><div style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;color:var(--gris);font-size:14px;padding:40px">No hay posiciones valorables a ${cierreFmt}.<br>El primer cierre con datos es el ${_f(primerVL)}; elige esa fecha o una posterior.</div></div>`; }
  const prod=productos(st,cids);
  // agregar histórico anual por año
  const anualMap={};
  cids.forEach(c=>(st.hist[c]?.anual||[]).forEach(y=>{const o=anualMap[y.a]||(anualMap[y.a]={a:y.a,ini:0,fin:0,ap:0,re:0,res:0,rents:[]});o.ini+=y.ini||0;o.fin+=y.fin||0;o.ap+=y.ap||0;o.re+=y.re||0;o.res+=(y.res!=null?y.res:0);if(y.rent!=null)o.rents.push(y.rent);}));
  const A=Object.values(anualMap).sort((x,y)=>x.a-y.a).map(y=>({...y,rent:y.rents.length===1?y.rents[0]:(y.ini?y.res/y.ini:null)}));
  // mensual: la cartera con más meses
  let base=[], cidMain=cids[0]; cids.forEach(c=>{const m=st.hist[c]?.mensual||[]; if(m.length>base.length){base=m;cidMain=c;}});
  const rm=(st.rentmes&&st.rentmes[cidMain])||{}; let M=[],MLAB=[];
  const _MES=lang==='ca'?['Gen','Feb','Març','Abr','Maig','Juny','Jul','Ago','Set','Oct','Nov','Des']:['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  for(let i=0;i<12;i++){ const mm='2026-'+String(i+1).padStart(2,'0'); let v=null; if(rm[mm]!=null && Math.abs(rm[mm])<=0.15) v=rm[mm]; else if(i<base.length && base[i]!=null) v=base[i]; if(v!=null){M.push(v);MLAB.push(_MES[i]);} }
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
  const linea=(vals)=>{if(!vals.length)return '<div class="muted">'+L.sinevol+'</div>';const W=720,H=300,pL=44,pR=16,pT=20,pB=26;const cum=[];let acc=1;vals.forEach(v=>{acc*=(1+v);cum.push(acc-1);});const lo=Math.min(0,...cum),hi=Math.max(...cum)+0.01;const X=i=>pL+i*((W-pL-pR)/(cum.length-1||1)),Y=v=>pT+(H-pT-pB)*(1-(v-lo)/((hi-lo)||1));let g='';for(let k=0;k<=3;k++){const v=lo+(hi-lo)*k/3;g+=`<line x1="${pL}" y1="${Y(v)}" x2="${W-pR}" y2="${Y(v)}" stroke="#EFE7E7"/><text x="${pL-5}" y="${Y(v)+3}" text-anchor="end" font-size="8" fill="#999">${p1(v)}</text>`;}const pts=cum.map((v,i)=>`${X(i)},${Y(v)}`).join(' ');g+=`<polygon points="${pL},${Y(lo)} ${pts} ${W-pR},${Y(lo)}" fill="#8E7577" fill-opacity="0.1"/><polyline points="${pts}" fill="none" stroke="#8E7577" stroke-width="2"/>`;cum.forEach((v,i)=>{g+=`<circle cx="${X(i)}" cy="${Y(v)}" r="2.5" fill="#8E7577"/><text x="${X(i)}" y="${Y(v)-7}" text-anchor="middle" font-size="8" font-weight="700">${p1(v)}</text>`;});return `<div class="chart"><svg viewBox="0 0 ${W} ${H}">${g}</svg></div>`;};
  const barras=(labels,vals)=>{if(!vals.length)return '';const W=560,H=240,pL=34,pR=10,pT=16,pB=22;const lo=Math.min(0,...vals),hi=Math.max(0,...vals),pad=(hi-lo)*0.15||0.02;const y0=lo-pad,y1=hi+pad,step=(W-pL-pR)/vals.length,bw=step*0.6,Y=v=>pT+(H-pT-pB)*(1-(v-y0)/((y1-y0)||1));let g=`<line x1="${pL}" y1="${Y(0)}" x2="${W-pR}" y2="${Y(0)}" stroke="#D9CFCF"/>`;vals.forEach((v,i)=>{const x=pL+i*step+step/2-bw/2,yt=Y(Math.max(0,v)),yb=Y(Math.min(0,v));g+=`<rect x="${x}" y="${yt}" width="${bw}" height="${Math.max(1,yb-yt)}" rx="2" fill="${v<0?'#575755':'#A98A8C'}"/><text x="${x+bw/2}" y="${v<0?yb+10:yt-3}" text-anchor="middle" font-size="8" font-weight="700">${p1(v)}</text><text x="${x+bw/2}" y="${H-8}" text-anchor="middle" font-size="8" fill="#575755">${labels[i]}</text>`;});return `<div class="chart"><svg viewBox="0 0 ${W} ${H}">${g}</svg></div>`;};
  const MES=lang==='ca'?['Gen','Feb','Març','Abr','Maig','Juny','Jul','Ago','Set','Oct','Nov','Des']:['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const kpi=(ic,k,v)=>`<div class="kpi"><div class="ktx"><div class="k">${k}</div><div class="v">${v}</div></div></div>`;
  const secbar=(t,cap)=>`<div class="secbar"><span class="st">${t}</span>${cap?`<span class="cap">${cap}</span>`:''}</div>`;
  const AVISO='Documento informativo de carácter confidencial, para uso exclusivo del cliente. La información se ha elaborado a partir de fuentes consideradas fiables a la fecha de emisión y no constituye asesoramiento ni recomendación de inversión. Los datos se refieren al cierre indicado y pueden variar. Rentabilidades pasadas no garantizan rentabilidades futuras.';
  const HT=(sub)=>`<div class="htop"><div class="t">${titulo}<small>${L.informe}</small></div><div class="r">${sub}</div></div>`;
  const FT=n=>`<div class="foot2"><span>${L.confid}</span><span>${cierreFmt} · ${n}/3</span></div>`;
  // Composición detallada (coste, valor actual, diferencia) desde el libro de movimientos
  const _set=new Set(cids), _agg={};
  for(const m of st.movimientos){ if(!_set.has(m.cartera)||!m.instrumento) continue; if(FECHA&&m.fecha&&m.fecha>FECHA) continue; const a=_agg[m.instrumento]||(_agg[m.instrumento]={tit:0,cT:0,cTP:0,cEUR:0}); a.tit+=m.titulos_delta||0; if((m.titulos_delta||0)>0){ if(m.precio){a.cT+=m.titulos_delta;a.cTP+=m.titulos_delta*m.precio;} a.cEUR += (m.coste!=null ? +m.coste : (m.precio? m.titulos_delta*m.precio/fxOf(st,m.instrumento) : 0)); } }
  let det=[];
  for(const [inst,a] of Object.entries(_agg)){ if(Math.abs(a.tit)<1e-8) continue; const vl=vlF(inst); const fx=fxOf(st,inst); const pm=a.cT>0?a.cTP/a.cT:null; /* valor inicial = coste prorrateado a los títulos que quedan (las ventas/retiradas no penalizan) */ const vini=a.cT>0?a.tit*(a.cEUR/a.cT):(a.cEUR>0?a.cEUR:null); const vact=vl!=null?a.tit*vl/fx:null; det.push({nombre:st.instrumentos[inst]?.nombre||'—',pm,vlact:vl,vini,vact,dif:(vini!=null&&vact!=null)?vact-vini:null}); }
  det.sort((a,b)=>(b.vact||0)-(a.vact||0));
  const _liq=cids.reduce((s,c)=>s+liqAFecha(c),0);
  // Liquidez: no tiene valor inicial (las aportaciones se invirtieron; el saldo actual son dividendos/remanente). El valor inicial del total = lo invertido en fondos.
  if(Math.abs(_liq)>0.005){ det.push({nombre:'Liquidez',pm:null,vlact:null,vini:null,vact:_liq,dif:null}); }
  const _tot=det.reduce((s,r)=>s+(r.vact||0),0)||1; det.forEach(r=>r.peso=(r.vact||0)/_tot);
  const compRows=det.map(r=>`<tr><td>${r.nombre}</td><td class="num">${r.pm!=null?t4(r.pm):'—'}</td><td class="num">${r.vini!=null?e0(r.vini):'—'}</td><td class="num">${r.vlact!=null?t4(r.vlact):'—'}</td><td class="num">${r.vact!=null?e0(r.vact):'—'}</td><td class="num ${r.dif>=0?'pos':'neg'}">${r.dif!=null?e0(r.dif):'—'}</td><td class="num ${r.dif>=0?'pos':'neg'}">${(r.vini&&r.dif!=null&&r.nombre!=='Liquidez')?p1(r.dif/r.vini):'—'}</td><td class="num">${p1(r.peso)}</td></tr>`).join('');
  const _tVini=det.reduce((s,r)=>s+(r.vini||0),0), _tVact=det.reduce((s,r)=>s+(r.vact||0),0), _tDif=_tVact-_tVini;
  const compTot=`<tr class="tot"><td>${L.total}</td><td></td><td class="num">${e0(_tVini)}</td><td></td><td class="num">${e0(_tVact)}</td><td class="num ${_tDif>=0?'pos':'neg'}">${e0(_tDif)}</td><td class="num ${_tDif>=0?'pos':'neg'}">${_tVini>0?p1(_tDif/_tVini):'—'}</td><td class="num">100,0 %</td></tr>`;
  const compTable=`<table class="comp"><thead><tr><th>${L.activo}</th><th class="num">${L.vlc}</th><th class="num">${L.vini}</th><th class="num">${L.vlact}</th><th class="num">${L.vact}</th><th class="num">${L.dife}</th><th class="num">${L.difp}</th><th class="num">${L.peso}</th></tr></thead><tbody>${compRows}${compTot}</tbody></table>`;
  // ---- Cuerpos de página (el marco .page y el pie numerado se añaden al ensamblar) ----
  const bodyP1=`<div class="kpirow">${kpi('€',L.patrimonio,e0(patTotal))}${kpi('▦',L.resultado,last.res!=null?e0(last.res):'—')}${kpi('%',L.rentabilidad,last.rent!=null?p1(last.rent):'—')}${kpi('↗',L.ultmes,ultMes!=null?p1(ultMes):'—')}</div>
    <div>${secbar(L.comp,L.compcap)}<div class="panel">${compTable}</div></div>
    <div class="cols2 grow"><div>${secbar(L.distrib,L.distribcap)}<div class="panel pc">${donut(det.map(r=>({n:r.nombre,v:r.vact||0})))}</div></div>
      <div>${secbar(L.evol,L.evolcap)}<div class="panel">${M&&M.length?linea(M):'<p class=\'muted\' style=\'padding:22px;text-align:center\'>'+L.sinmes+'</p>'}</div></div></div>`;
  const arows=A.map(y=>`<tr><td>${y.a}</td><td class="num">${e0(y.ini)}</td><td class="num">${e0(y.fin)}</td><td class="num">${y.ap?e0(Math.abs(y.ap)):'—'}</td><td class="num">${y.re?e0(-Math.abs(y.re)):'—'}</td><td class="num">${y.res!=null?e0(y.res):'—'}</td><td class="num">${y.rent!=null?p1(y.rent):'—'}</td><td>${y.a>=2026?L.encurso:L.cerrado}</td></tr>`).join('');
  const bodyP2=`<div>${secbar(L.detanual,L.detanualcap)}<div class="panel"><table class="anual"><thead><tr><th>${L.anio}</th><th class="num">${L.inicio}</th><th class="num">${L.fin}</th><th class="num">${L.aport}</th><th class="num">${L.retir}</th><th class="num">${L.resultadoe}</th><th class="num">${L.rent}</th><th>${L.estado}</th></tr></thead><tbody>${arows||'<tr><td colspan="8" class="muted">'+L.sinhist+'</td></tr>'}</tbody></table>${A.length?`<p class="riesgo">${L.vol}: <b>${p1(stdev(A.map(y=>y.rent||0)))}</b> · ${L.caida}: <b>${p1(maxDD(A.map(y=>y.rent||0)))}</b></p>`:''}</div></div>
    <div class="cols2 grow"><div>${secbar(L.rmens)}<div class="panel">${M&&M.length?barras(MLAB,M):'<p class=\'muted\' style=\'padding:22px;text-align:center\'>'+L.sinmes+'</p>'}</div></div><div>${secbar(L.ranual)}<div class="panel">${barras(A.map(y=>y.a),A.map(y=>y.rent||0))}</div></div></div>`;
  const orow=o=>`<tr><td>${o.fecha}</td><td>${o.op}</td><td>${o.inst}</td><td class="num">${o.imp!=null?new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'}).format(o.imp):''}</td><td class="num">${o.precio!=null?t4(o.precio):''}</td><td class="num">${o.tit!=null?t4(o.tit):''}</td></tr>`;
  // Paginación de operaciones: troceamos para que no se corten (máx ~30 por página)
  // Operaciones: ~50 por hoja (aprovechando el A4 apaisado); la última hoja lleva el bloque de aportaciones si queda sitio
  const OPP=50, opsChunks=[]; for(let i=0;i<ops.length;i+=OPP) opsChunks.push(ops.slice(i,i+OPP)); if(!opsChunks.length) opsChunks.push([]);
  const clsOps=ops.length>26?'ops-xs':ops.length>18?'ops-s':'';
  const opsBody=(chunk,parte,grow)=>`<div class="${grow?'grow col':'col'}">${secbar(L.opsinicio+(opsChunks.length>1?' ('+parte+'/'+opsChunks.length+')':''))}<div class="panel"><table class="ops ${clsOps}"><thead><tr><th>${L.fecha}</th><th>${L.operacion}</th><th>${L.instrumento}</th><th class="num">${L.importe}</th><th class="num">${L.precio}</th><th class="num">${L.titulos}</th></tr></thead><tbody>${chunk.map(orow).join('')||'<tr><td colspan="6" class="muted">'+L.sinops+'</td></tr>'}</tbody></table></div></div>`;
  const bodyApd=`<div class="cols2" style="margin-top:8px"><div>${secbar(L.apdisp)}<div class="panel"><div class="card2"><div class="r2"><span>${L.ap2026}</span><b>${e0(apPer)}</b></div><div class="r2"><span>${L.disp2026}</span><b>${e0(rePer)}</b></div><div class="r2"><span>${L.apini}</span><b>${e0(apInicial)}</b></div><div class="r2"><span>${L.aptot}</span><b>${e0(apTot)}</b></div><div class="r2"><span>${L.disptot}</span><b>${e0(reTot)}</b></div></div></div></div>
      <div>${secbar(L.aviso)}<div class="panel"><div class="aviso2">${L.avisotxt}</div></div></div></div>`;
  // ---- Pla d'acumulació de capital: periòdic (DCA) vs inversió única ----
  function planHtml(){
    const planes=Object.values(st.planes||{}).filter(pl=>cids.includes(pl.cartera)&&(pl.aportaciones||[]).length);
    if(!planes.length) return '';
    const T=lang==='ca'?{tit:"Pla d'acumulació vs inversió única",cap:'Capital aportat',pla:'Pla periòdic',uni:'Inversió única',comp:'Comparativa',capital:'Capital',pmed:'Preu mitjà',part:'Participacions',valact:'Valor actual',rend:'Rendiment',avan:'Avantatge del pla'}:{tit:'Plan de acumulación vs inversión única',cap:'Capital aportado',pla:'Plan periódico',uni:'Inversión única',comp:'Comparativa',capital:'Capital',pmed:'Precio medio',part:'Participaciones',valact:'Valor actual',rend:'Rendimiento',avan:'Ventaja del plan'};
    return planes.map(pl=>{
      const ap=(pl.aportaciones||[]).filter(a=>!FECHA||a.fecha<=FECHA); if(!ap.length) return '';
      const precioAct=vlF(pl.instrumento)||ap[ap.length-1].precio, precioIni=ap[0].precio;
      let partAcum=0,cap=0; const sPlan=[],sUni=[],sCap=[];
      ap.forEach(a=>{ partAcum+=a.imp/a.precio; cap+=a.imp; sPlan.push(partAcum*a.precio); sUni.push((cap/precioIni)*a.precio); sCap.push(cap); });
      const capTot=cap, partUni=capTot/precioIni, valPlan=partAcum*precioAct, valUni=partUni*precioAct;
      const rPlan=valPlan/capTot-1, rUni=valUni/capTot-1, pmPlan=capTot/partAcum;
      const W=1040,H=330,pL=74,pR=20,pT=18,pB=34, n=ap.length;
      const all=[...sPlan,...sUni,...sCap], lo=Math.min(...all)*0.97, hi=Math.max(...all)*1.03;
      const X=i=>pL+i*((W-pL-pR)/(n-1||1)), Y=v=>pT+(H-pT-pB)*(1-(v-lo)/((hi-lo)||1));
      const poly=(s,col,w)=>`<polyline points="${s.map((v,i)=>X(i)+','+Y(v)).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
      let grid=''; for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4;grid+=`<line x1="${pL}" y1="${Y(v)}" x2="${W-pR}" y2="${Y(v)}" stroke="#EFE7E7"/><text x="${pL-6}" y="${Y(v)+3}" text-anchor="end" font-size="9" fill="#999">${e0(v)}</text>`;}
      let xl=''; ap.forEach((a,i)=>{ if(i===0||a.fecha.slice(0,4)!==ap[i-1].fecha.slice(0,4)) xl+=`<text x="${X(i)}" y="${H-10}" text-anchor="middle" font-size="9" fill="#575755">${a.fecha.slice(0,4)}</text>`; });
      const svg=`<div class="chart"><svg viewBox="0 0 ${W} ${H}">${grid}<polygon points="${pL},${Y(lo)} ${sCap.map((v,i)=>X(i)+','+Y(v)).join(' ')} ${W-pR},${Y(lo)}" fill="#C9B9BA" fill-opacity="0.22"/>${poly(sCap,'#B79A9C',1.5)}${poly(sUni,'#575755',2)}${poly(sPlan,'#8E7577',2.6)}${xl}</svg></div>`;
      const leg=`<div style="display:flex;gap:20px;justify-content:center;font-size:11px;margin-top:4px"><span style="color:#8E7577">▬ <b>${T.pla}</b></span><span style="color:#575755">▬ ${T.uni}</span><span style="color:#B79A9C">▬ ${T.cap}</span></div>`;
      const resumen=`<table class="comp"><thead><tr><th></th><th class="num">${T.capital}</th><th class="num">${T.pmed}</th><th class="num">${T.part}</th><th class="num">${T.valact}</th><th class="num">${T.rend}</th></tr></thead><tbody>
        <tr><td>${T.pla}</td><td class="num">${e0(capTot)}</td><td class="num">${t4(pmPlan)}</td><td class="num">${t4(partAcum)}</td><td class="num">${e0(valPlan)}</td><td class="num pos">${p1(rPlan)}</td></tr>
        <tr><td>${T.uni}</td><td class="num">${e0(capTot)}</td><td class="num">${t4(precioIni)}</td><td class="num">${t4(partUni)}</td><td class="num">${e0(valUni)}</td><td class="num">${p1(rUni)}</td></tr>
        <tr class="tot"><td>${T.avan}</td><td></td><td></td><td class="num">+${t4(partAcum-partUni)}</td><td class="num">${e0(valPlan-valUni)}</td><td class="num pos">${p1(rPlan-rUni)}</td></tr></tbody></table>`;
      return `<div>${secbar(pl.titulo||T.tit,T.tit)}<div class="panel">${svg}${leg}</div></div>
        <div style="margin-top:8px">${secbar(T.comp)}<div class="panel">${resumen}</div></div>`;
    }).join('');
  }
  // ---- Ensamblar páginas con pie numerado dinámico ----
  const PAG=[{s:L.cierre+' '+cierreFmt,b:bodyP1},{s:L.histanual,b:bodyP2}];
  opsChunks.forEach((ch,i)=>{ const ult=i===opsChunks.length-1; const conApd=ult&&ch.length<=34; PAG.push({s:L.opsmov,b:opsBody(ch,i+1,!conApd)+(conApd?bodyApd:'')}); });
  if(opsChunks[opsChunks.length-1].length>34) PAG.push({s:L.opsmov,b:bodyApd});
  if(typeof planHtml==='function'){ const ph=planHtml(); if(ph) PAG.push({s:"Pla d'acumulació",b:ph}); }
  const TOT=PAG.length;
  return PAG.map((p,i)=>`<div class="page">${HT(p.s)}<div class="body">${p.b}</div><div class="foot2"><span>${L.confid}</span><span>${cierreFmt} · ${i+1}/${TOT}</span></div></div>`).join('');
}

if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
boot();
