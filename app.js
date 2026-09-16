const $ = (id) => document.getElementById(id);
const eur = (n) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' €';
const nombreCompleto = (p) => p ? `${p.nombre || ''} ${p.apellidos || ''}`.trim() : '—';

let VAULT = null;         // handle de la carpeta de OneDrive
let AUTOR = localStorage.getItem('autor') || null;
let ESTADO = null;

// ---------------- Arranque ----------------
async function boot() {
  if (!('showDirectoryPicker' in window)) { pantallaNavegador(); return; }
  const h = await Libro.leerHandle();
  if (h && AUTOR && await Libro.permiso(h, false)) { VAULT = h; entrar(); }
  else pantallaConexion(h);
}

function pantallaNavegador() {
  document.body.innerHTML = `<div class="wrap"><div class="center"><h1>Abre esta app en Chrome</h1>
    <div class="card"><p>Esta aplicación necesita Chrome (o Edge) para poder guardar en tu carpeta de OneDrive.
    Safari y Firefox no lo permiten. Copia esta dirección y ábrela en Chrome.</p></div></div></div>`;
}

function pantallaConexion(handleGuardado) {
  document.body.innerHTML = `<div class="wrap"><div class="center">
    <h1>Gestor de Carteras</h1>
    <p class="muted">Primera vez en este equipo</p>
    <div class="card">
      <p><b>1.</b> Elige la carpeta <b>compartida</b> de OneDrive (la MISMA en tu Mac y en el equipo de Ana).</p>
      <div class="row"><button class="primary" id="btnPick">${handleGuardado ? 'Reconectar la carpeta' : 'Elegir carpeta de OneDrive…'}</button>
        <span class="muted" id="pickMsg"></span></div>
      <p style="margin-top:18px"><b>2.</b> ¿Quién usa este equipo?</p>
      <div class="users">
        <label><input type="radio" name="autor" value="jacobo" ${AUTOR==='jacobo'?'checked':''}> Jacobo</label>
        <label><input type="radio" name="autor" value="ana" ${AUTOR==='ana'?'checked':''}> Ana</label>
      </div>
      <div class="row" style="margin-top:14px"><button class="primary" id="btnGo" disabled>Entrar</button></div>
    </div></div></div>`;
  $('btnPick').onclick = async () => {
    try {
      if (handleGuardado) { if (await Libro.permiso(handleGuardado, true)) VAULT = handleGuardado; }
      else VAULT = await Libro.elegirCarpeta();
      if (VAULT) { $('pickMsg').textContent = '✓ carpeta conectada'; refrescarGo(); }
    } catch (e) { $('pickMsg').textContent = 'No se pudo conectar la carpeta.'; }
  };
  document.querySelectorAll('input[name=autor]').forEach(r => r.onchange = () => { AUTOR = r.value; refrescarGo(); });
  const refrescarGo = () => { $('btnGo').disabled = !(VAULT && AUTOR); };
  $('btnGo').onclick = () => { localStorage.setItem('autor', AUTOR); entrar(); };
  refrescarGo();
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
  // Refresco cuando OneDrive trae cambios (al volver el foco a la ventana)
  window.addEventListener('focus', recargarYrender);
}
function pintarTabs(){ document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.t===TAB)); }

async function recargarYrender() {
  try { ESTADO = Libro.reconstruir(await Libro.cargarEventos(VAULT)); } catch (e) { ESTADO = Libro.reconstruir([]); }
  render();
}
function render() {
  if (TAB === 'clientes') return renderClientes();
  if (TAB === 'actualizar') return $('view').innerHTML = `<h1>Actualizar</h1><div class="soon">Se conecta en la próxima entrega: registrar movimientos que escriben en el libro.</div>`;
  if (TAB === 'informes') return $('view').innerHTML = `<h1>Informes</h1><div class="soon">Se conecta en la próxima entrega: el informe de tres páginas leyendo de los datos reales.</div>`;
}

// ---------------- Clientes (conectado de verdad) ----------------
function renderClientes() {
  const st = ESTADO || Libro.reconstruir([]);
  const filas = [];
  for (const [cid, cart] of Object.entries(st.carteras)) {
    if (cart.baja) continue;
    const tits = [...(st.titulares[cid] || [])].map(pid => nombreCompleto(st.personas[pid])).join(', ');
    filas.push(`<tr><td>${tits || '—'}</td><td>${cart.nombre} <span class="badge">${cart.tipo}</span></td><td class="num">${eur(Libro.patrimonio(st, cid))}</td></tr>`);
  }
  $('view').innerHTML = `
    <h1>Clientes</h1>
    <div class="card"><h2>Nuevo cliente</h2>
      <div class="row">
        <input id="nom" placeholder="Nombre"><input id="ape" placeholder="Apellidos">
        <button class="primary" id="btnAlta">Añadir</button>
        <button class="ghost" id="btnRef">Refrescar</button>
      </div>
      <div class="muted" id="msg" style="margin-top:8px"></div>
    </div>
    <div class="card"><h2>Personas y carteras</h2>
      <table><thead><tr><th>Titular(es)</th><th>Cartera</th><th class="num">Patrimonio</th></tr></thead>
        <tbody>${filas.join('') || '<tr><td colspan="3" class="muted">Sin clientes todavía.</td></tr>'}</tbody></table>
      <div class="avisos">Al añadir un cliente se escribe un apunte en <b>tu</b> registro de OneDrive y el estado se reconstruye. Cuando OneDrive traiga el registro de Ana, sus altas aparecerán aquí (pulsa Refrescar o vuelve a la ventana).</div>
    </div>`;
  $('btnAlta').onclick = altaCliente;
  $('btnRef').onclick = recargarYrender;
}
async function altaCliente() {
  const nombre = $('nom').value.trim(); if (!nombre) return;
  const apellidos = $('ape').value.trim();
  const pid = crypto.randomUUID(), cid = crypto.randomUUID();
  $('msg').textContent = 'Guardando…';
  await Libro.anexar(VAULT, AUTOR, 'alta_persona', { id: pid, nombre, apellidos });
  await Libro.anexar(VAULT, AUTOR, 'alta_cartera', { id: cid, nombre: 'Cartera individual', tipo: 'individual' });
  await Libro.anexar(VAULT, AUTOR, 'titular', { cartera: cid, persona: pid });
  await recargarYrender();
  $('msg').textContent = 'Guardado en OneDrive.';
}

// Registrar el service worker (para poder instalarla como app)
if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
boot();
