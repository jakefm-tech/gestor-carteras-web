const $ = (id) => document.getElementById(id);
const eur = (n) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' €';
const nombreCompleto = (p) => p ? `${p.nombre || ''} ${p.apellidos || ''}`.trim() || '(sin nombre)' : '—';
const esc = (s) => String(s == null ? '' : s).replace(/"/g, '&quot;');
const IDIOMAS = { es: 'Español', ca: 'Català', en: 'English' };

let VAULT = null;
let AUTOR = localStorage.getItem('autor') || null;
let ESTADO = null;
let SEL = null; // persona seleccionada

// ---------------- Arranque ----------------
async function boot() {
  if (!('showDirectoryPicker' in window)) { pantallaNavegador(); return; }
  const h = await Libro.leerHandle();
  if (h && AUTOR && await Libro.permiso(h, false)) { VAULT = h; entrar(); }
  else pantallaConexion(h);
}
function pantallaNavegador() {
  document.body.innerHTML = `<div class="wrap"><div class="center"><h1>Abre esta app en Chrome</h1>
    <div class="card"><p>Esta aplicación necesita Chrome (o Edge) para guardar en tu carpeta de OneDrive. Safari y Firefox no lo permiten.</p></div></div></div>`;
}
function pantallaConexion(handleGuardado) {
  document.body.innerHTML = `<div class="wrap"><div class="center">
    <h1>Gestor de Carteras</h1><p class="muted">Primera vez en este equipo</p>
    <div class="card">
      <p><b>1.</b> Elige la carpeta <b>compartida</b> de OneDrive (la MISMA en tu Mac y en el de Ana).</p>
      <div class="row"><button class="primary" id="btnPick">${handleGuardado ? 'Reconectar la carpeta' : 'Elegir carpeta de OneDrive…'}</button>
        <span class="muted" id="pickMsg"></span></div>
      <p style="margin-top:18px"><b>2.</b> ¿Quién usa este equipo?</p>
      <div class="users">
        <label><input type="radio" name="autor" value="jacobo" ${AUTOR==='jacobo'?'checked':''}> Jacobo</label>
        <label><input type="radio" name="autor" value="ana" ${AUTOR==='ana'?'checked':''}> Ana</label>
      </div>
      <div class="row" style="margin-top:14px"><button class="primary" id="btnGo" disabled>Entrar</button></div>
    </div></div></div>`;
  const rg = () => { $('btnGo').disabled = !(VAULT && AUTOR); };
  $('btnPick').onclick = async () => {
    try {
      if (handleGuardado) { if (await Libro.permiso(handleGuardado, true)) VAULT = handleGuardado; }
      else VAULT = await Libro.elegirCarpeta();
      if (VAULT) { $('pickMsg').textContent = '✓ carpeta conectada'; rg(); }
    } catch (e) { $('pickMsg').textContent = 'No se pudo conectar la carpeta.'; }
  };
  document.querySelectorAll('input[name=autor]').forEach(r => r.onchange = () => { AUTOR = r.value; rg(); });
  $('btnGo').onclick = () => { localStorage.setItem('autor', AUTOR); entrar(); };
  rg();
}

// ---------------- App ----------------
let TAB = 'clientes';
function entrar() {
  document.body.innerHTML = `
    <div class="top"><span class="brand">Gestor de Carteras</span><span class="user">Usuario: ${AUTOR} · datos en OneDrive</span></div>
    <div class="tabs">
      <div class="tab" data-t="clientes">Clientes</div>
      <div class="tab" data-t="actualizar">Actualizar</div>
      <div class="tab" data-t="informes">Informes</div>
    </div>
    <div class="wrap" id="view"></div>`;
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => { TAB = t.dataset.t; pintarTabs(); render(); });
  pintarTabs(); recargarYrender();
  window.addEventListener('focus', recargarYrender);
}
function pintarTabs(){ document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.t===TAB)); }
async function recargarYrender() {
  try { ESTADO = Libro.reconstruir(await Libro.cargarEventos(VAULT)); } catch (e) { ESTADO = Libro.reconstruir([]); }
  render();
}
function render() {
  if (TAB === 'clientes') return renderClientes();
  if (TAB === 'actualizar') return $('view').innerHTML = `<h1>Actualizar</h1><div class="soon">En construcción — es la siguiente pantalla.</div>`;
  if (TAB === 'informes') return $('view').innerHTML = `<h1>Informes</h1><div class="soon">En construcción — después de Actualizar.</div>`;
}
async function apuntar(lista) { for (const [tipo, payload] of lista) await Libro.anexar(VAULT, AUTOR, tipo, payload); }
const titularesDe = (st, cid) => [...(st.titulares[cid] || [])];
const vlUlt = (st, inst) => { const m = st.vl[inst] || {}; const fs = Object.keys(m).sort(); return fs.length ? m[fs[fs.length-1]] : null; };
const cartsDe = (st, pid) => Object.entries(st.carteras).filter(([cid, c]) => !c.baja && titularesDe(st, cid).includes(pid)).map(([cid, c]) => ({ cid, ...c }));

// ---------------- Clientes ----------------
function renderClientes() {
  const st = ESTADO || Libro.reconstruir([]);
  const personas = Object.values(st.personas);
  if (SEL && !st.personas[SEL]) SEL = null;

  const lista = personas.map(p => `<div class="item ${p.id===SEL?'sel':''}" data-pid="${p.id}">
    <div class="n">${nombreCompleto(p)}</div>
    <div class="m">${cartsDe(st,p.id).length} cartera(s)</div></div>`).join('') || '<div class="muted">Sin personas todavía.</div>';

  // resumen
  const cActivas = Object.entries(st.carteras).filter(([,c]) => !c.baja);
  const patrTotal = cActivas.reduce((acc, [cid]) => acc + Libro.patrimonio(st, cid), 0);
  const prod = {};
  for (const [k, tit] of Object.entries(st.posiciones)) {
    const [cid, inst] = k.split('|');
    if (st.carteras[cid]?.baja || Math.abs(tit) < 1e-8) continue;
    const vl = vlUlt(st, inst); if (vl == null) continue;
    prod[inst] = (prod[inst] || 0) + tit * vl;
  }
  const totInv = Object.values(prod).reduce((a, b) => a + b, 0) || 1;
  const filasProd = Object.entries(prod).sort((a, b) => b[1] - a[1]).map(([inst, val]) =>
    `<tr><td>${st.instrumentos[inst]?.nombre || '—'}</td><td class="num">${eur(val)}</td><td class="num">${(val/totInv*100).toLocaleString('es-ES',{minimumFractionDigits:1,maximumFractionDigits:1})} %</td></tr>`).join('');

  $('view').innerHTML = `
    <h1>Clientes</h1>
    <div class="card"><h2>Resumen</h2>
      <div class="kpis3">
        <div class="mini"><div class="k">Clientes</div><div class="v">${personas.length}</div></div>
        <div class="mini"><div class="k">Carteras</div><div class="v">${cActivas.length}</div></div>
        <div class="mini"><div class="k">Patrimonio total</div><div class="v">${eur(patrTotal)}</div></div>
      </div>
      ${filasProd ? `<table style="margin-top:12px"><thead><tr><th>Producto</th><th class="num">Valor</th><th class="num">Peso</th></tr></thead><tbody>${filasProd}</tbody></table>` : '<p class="muted" style="margin-top:8px">Sin productos todavía.</p>'}
    </div>
    <div class="split">
      <div class="card">
        <h2>Personas</h2>
        <div id="listaP">${lista}</div>
        <div style="margin-top:12px;border-top:1px solid var(--linea);padding-top:12px">
          <div class="row"><input id="nom" placeholder="Nombre"><input id="ape" placeholder="Apellidos"></div>
          <div class="row" style="margin-top:8px">
            <label class="chk"><input type="checkbox" id="conInd" checked> con cartera individual</label>
            <button class="primary" id="btnPersona">Añadir persona</button></div>
        </div>
      </div>
      <div class="card" id="ficha"></div>
    </div>
    <div class="card"><h2>Todas las carteras</h2>
      <table><thead><tr><th>Cartera</th><th>Titulares</th><th class="num">Patrimonio</th></tr></thead>
      <tbody>${
        Object.entries(st.carteras).filter(([,c])=>!c.baja).map(([cid,c])=>`<tr>
          <td>${c.nombre} <span class="badge">${c.tipo}</span></td>
          <td>${titularesDe(st,cid).map(pid=>nombreCompleto(st.personas[pid])).join(', ')||'—'}</td>
          <td class="num">${eur(Libro.patrimonio(st,cid))}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Sin carteras.</td></tr>'
      }</tbody></table></div>`;

  document.querySelectorAll('.item').forEach(el => el.onclick = () => { SEL = el.dataset.pid; renderClientes(); });
  $('btnPersona').onclick = altaPersona;
  renderFicha();
}

function renderFicha() {
  const st = ESTADO; const cont = $('ficha');
  if (!SEL) { cont.innerHTML = `<h2>Ficha</h2><p class="muted">Selecciona una persona de la izquierda para ver y editar sus datos, o crea una nueva.</p>`; return; }
  const p = st.personas[SEL];
  const otras = Object.values(st.personas).filter(x => x.id !== SEL);

  const carteras = cartsDe(st, SEL).map(c => {
    const tits = titularesDe(st, c.cid);
    const chips = tits.map(pid => `<span class="chip">${nombreCompleto(st.personas[pid])}${pid!==SEL?` <button data-quita="${c.cid}" data-p="${pid}">×</button>`:''}</span>`).join('');
    const noTit = otras.filter(x => !tits.includes(x.id));
    const add = noTit.length ? `<select data-add="${c.cid}"><option value="">+ titular…</option>${noTit.map(x=>`<option value="${x.id}">${nombreCompleto(x)}</option>`).join('')}</select>` : '';
    return `<div class="cartera">
      <div class="row"><input data-cn="${c.cid}" value="${esc(c.nombre)}" style="flex:1">
        <select data-ct="${c.cid}"><option value="individual" ${c.tipo==='individual'?'selected':''}>Individual</option>
          <option value="conjunta" ${c.tipo==='conjunta'?'selected':''}>Conjunta</option></select>
        <button class="ghost" data-gc="${c.cid}">Guardar</button></div>
      <div class="chips" style="margin-top:8px">${chips}</div>${add}
      <div style="margin-top:6px"><button class="danger" data-baja="${c.cid}">Dar de baja</button>
        <button class="danger" data-del="${c.cid}" style="margin-left:6px">Eliminar</button>
        <span class="muted" style="margin-left:8px">${eur(Libro.patrimonio(st,c.cid))}</span></div>
    </div>`;
  }).join('') || '<p class="muted">Sin carteras. Crea una abajo.</p>';

  cont.innerHTML = `<h2>Ficha de ${nombreCompleto(p)}</h2>
    <div class="row"><input id="fn" value="${esc(p.nombre)}" placeholder="Nombre"><input id="fa" value="${esc(p.apellidos)}" placeholder="Apellidos"></div>
    <div class="row" style="margin-top:8px"><input id="fe" value="${esc(p.email)}" placeholder="Email"><input id="ft" value="${esc(p.telefono)}" placeholder="Teléfono"></div>
    <div class="row" style="margin-top:8px"><label class="chk">Idioma
      <select id="fi">${Object.entries(IDIOMAS).map(([k,v])=>`<option value="${k}" ${(p.idioma||'es')===k?'selected':''}>${v}</option>`).join('')}</select></label>
      <button class="primary" id="btnFicha">Guardar ficha</button>
      <button class="danger" id="btnDelP" style="margin-left:auto">Eliminar cliente…</button>
      <span class="muted" id="fmsg"></span></div>

    <div style="margin-top:16px"><h2>Carteras</h2>${carteras}</div>
    <div style="margin-top:12px;border-top:1px solid var(--linea);padding-top:12px">
      <div class="row"><input id="ncn" placeholder="Nombre de la nueva cartera" value="Cartera individual" style="flex:1"></div>
      <p class="muted" style="margin:8px 0 4px">Otros titulares (marca para hacerla conjunta):</p>
      <div class="chks">${otras.map(x=>`<label class="chk"><input type="checkbox" class="cotit" value="${x.id}"> ${nombreCompleto(x)}</label>`).join('') || '<span class="muted">no hay más personas</span>'}</div>
      <div class="row" style="margin-top:8px"><button class="primary" id="btnNuevaC">Crear cartera para ${p.nombre}</button></div>
    </div>`;

  $('btnFicha').onclick = guardarFicha;
  $('btnNuevaC').onclick = nuevaCarteraPara;
  cont.querySelectorAll('[data-gc]').forEach(b => b.onclick = () => guardarCartera(b.dataset.gc));
  cont.querySelectorAll('[data-baja]').forEach(b => b.onclick = () => bajaCartera(b.dataset.baja));
  cont.querySelectorAll('[data-del]').forEach(b => b.onclick = () => borrarCartera(b.dataset.del));
  $('btnDelP').onclick = () => borrarPersona(SEL);
  cont.querySelectorAll('[data-add]').forEach(s => s.onchange = () => { if (s.value) addTitular(s.dataset.add, s.value); });
  cont.querySelectorAll('[data-quita]').forEach(b => b.onclick = () => quitaTitular(b.dataset.quita, b.dataset.p));
}

async function altaPersona() {
  const nombre = $('nom').value.trim(); if (!nombre) return;
  const apellidos = $('ape').value.trim();
  const pid = crypto.randomUUID();
  const lista = [['alta_persona', { id: pid, nombre, apellidos, email: '', telefono: '', idioma: 'es' }]];
  if ($('conInd').checked) {
    const cid = crypto.randomUUID();
    lista.push(['alta_cartera', { id: cid, nombre: 'Cartera individual', tipo: 'individual' }]);
    lista.push(['titular', { cartera: cid, persona: pid }]);
  }
  await apuntar(lista); SEL = pid; await recargarYrender();
}
async function guardarFicha() {
  await apuntar([['edit_persona', { id: SEL, nombre: $('fn').value.trim(), apellidos: $('fa').value.trim(),
    email: $('fe').value.trim(), telefono: $('ft').value.trim(), idioma: $('fi').value }]]);
  await recargarYrender(); if ($('fmsg')) $('fmsg').textContent = 'Guardado.';
}
async function nuevaCarteraPara() {
  const nombre = $('ncn').value.trim() || 'Cartera';
  const otros = [...document.querySelectorAll('.cotit:checked')].map(i => i.value);
  const cid = crypto.randomUUID();
  const tipo = otros.length ? 'conjunta' : 'individual';
  const lista = [['alta_cartera', { id: cid, nombre, tipo }], ['titular', { cartera: cid, persona: SEL }]];
  for (const pid of otros) lista.push(['titular', { cartera: cid, persona: pid }]);
  await apuntar(lista); await recargarYrender();
}
async function guardarCartera(cid) {
  const nombre = document.querySelector(`[data-cn="${cid}"]`).value.trim();
  const tipo = document.querySelector(`[data-ct="${cid}"]`).value;
  await apuntar([['edit_cartera', { id: cid, nombre, tipo }]]); await recargarYrender();
}
async function bajaCartera(cid) { await apuntar([['edit_cartera', { id: cid, baja: true }]]); await recargarYrender(); }
async function addTitular(cid, pid) {
  const st = ESTADO; const n = titularesDe(st, cid).length + 1;
  const lista = [['titular', { cartera: cid, persona: pid }]];
  if (n >= 2 && st.carteras[cid]?.tipo === 'individual') lista.push(['edit_cartera', { id: cid, tipo: 'conjunta' }]);
  await apuntar(lista); await recargarYrender();
}
async function quitaTitular(cid, pid) {
  const st = ESTADO; const rest = titularesDe(st, cid).filter(x => x !== pid).length;
  const lista = [['quita_titular', { cartera: cid, persona: pid }]];
  if (rest <= 1 && st.carteras[cid]?.tipo === 'conjunta') lista.push(['edit_cartera', { id: cid, tipo: 'individual' }]);
  await apuntar(lista); await recargarYrender();
}


// predicado: apuntes de una cartera (definición, titulares, movimientos)
function esDeCartera(cid) {
  return (ev) => {
    const p = ev.payload || {};
    if ((ev.tipo === 'alta_cartera' || ev.tipo === 'edit_cartera') && p.id === cid) return true;
    if ((ev.tipo === 'titular' || ev.tipo === 'quita_titular' || ev.tipo === 'movimiento') && p.cartera === cid) return true;
    if (ev.tipo === 'correccion' && (p.cartera === cid || p.movimiento?.cartera === cid)) return true;
    return false;
  };
}
async function borrarCartera(cid) {
  const st = ESTADO; const nombre = st.carteras[cid]?.nombre || 'esta cartera';
  if (!confirm(`Eliminar "${nombre}" y todos sus movimientos, de forma permanente. Esto no se puede deshacer. ¿Continuar?`)) return;
  await Libro.purgar(VAULT, esDeCartera(cid));
  await recargarYrender();
}
async function borrarPersona(pid) {
  const st = ESTADO; const p = st.personas[pid]; if (!p) return;
  // carteras donde es el ÚNICO titular -> se eliminan en cascada
  const cascada = Object.keys(st.carteras).filter(cid => {
    const t = titularesDe(st, cid); return t.includes(pid) && t.length === 1;
  });
  const aviso = cascada.length
    ? `Eliminar a ${nombreCompleto(p)} y ${cascada.length} cartera(s) individual(es) suya(s), con sus datos y movimientos, de forma permanente. En las conjuntas solo dejará de ser titular. ¿Continuar?`
    : `Eliminar a ${nombreCompleto(p)} de forma permanente (dejará de ser titular en sus carteras conjuntas). ¿Continuar?`;
  if (!confirm(aviso)) return;
  const predsCarteras = cascada.map(esDeCartera);
  const deberiaEliminar = (ev) => {
    const pl = ev.payload || {};
    if ((ev.tipo === 'alta_persona' || ev.tipo === 'edit_persona') && pl.id === pid) return true;
    if ((ev.tipo === 'titular' || ev.tipo === 'quita_titular') && pl.persona === pid) return true;
    return predsCarteras.some(fn => fn(ev));
  };
  await Libro.purgar(VAULT, deberiaEliminar);
  SEL = null; await recargarYrender();
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
boot();
