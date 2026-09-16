const $ = (id) => document.getElementById(id);
const eur = (n) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' €';
const nombreCompleto = (p) => p ? `${p.nombre || ''} ${p.apellidos || ''}`.trim() : '—';
const esc = (s) => String(s || '').replace(/"/g, '&quot;');

let VAULT = null;
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
    <div class="card"><p>Esta aplicación necesita Chrome (o Edge) para guardar en tu carpeta de OneDrive. Safari y Firefox no lo permiten.</p></div></div></div>`;
}
function pantallaConexion(handleGuardado) {
  document.body.innerHTML = `<div class="wrap"><div class="center">
    <h1>Gestor de Carteras</h1><p class="muted">Primera vez en este equipo</p>
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
  const refrescarGo = () => { $('btnGo').disabled = !(VAULT && AUTOR); };
  $('btnPick').onclick = async () => {
    try {
      if (handleGuardado) { if (await Libro.permiso(handleGuardado, true)) VAULT = handleGuardado; }
      else VAULT = await Libro.elegirCarpeta();
      if (VAULT) { $('pickMsg').textContent = '✓ carpeta conectada'; refrescarGo(); }
    } catch (e) { $('pickMsg').textContent = 'No se pudo conectar la carpeta.'; }
  };
  document.querySelectorAll('input[name=autor]').forEach(r => r.onchange = () => { AUTOR = r.value; refrescarGo(); });
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

// escribir varios apuntes en orden
async function apuntar(lista) { for (const [tipo, payload] of lista) await Libro.anexar(VAULT, AUTOR, tipo, payload); }

// ---------------- Clientes ----------------
function titularesDe(st, cid){ return [...(st.titulares[cid] || [])]; }

function renderClientes() {
  const st = ESTADO || Libro.reconstruir([]);
  const personas = Object.values(st.personas);
  const opcionesPersonas = personas.map(p => `<label class="chk"><input type="checkbox" value="${p.id}"> ${nombreCompleto(p)}</label>`).join('') || '<span class="muted">Añade personas primero.</span>';

  // filas de carteras
  const filas = Object.entries(st.carteras).filter(([,c]) => !c.baja).map(([cid, cart]) => {
    const tits = titularesDe(st, cid);
    const chips = tits.map(pid => `<span class="chip">${nombreCompleto(st.personas[pid])}
      <button title="Quitar" data-quita="${cid}" data-p="${pid}">×</button></span>`).join('') || '<span class="muted">sin titulares</span>';
    const noTit = personas.filter(p => !tits.includes(p.id));
    const addSel = noTit.length ? `<select data-add="${cid}"><option value="">+ añadir titular…</option>
      ${noTit.map(p => `<option value="${p.id}">${nombreCompleto(p)}</option>`).join('')}</select>` : '';
    return `<tr><td>${cart.nombre} <span class="badge">${cart.tipo}</span></td>
      <td><div class="chips">${chips}</div>${addSel}</td>
      <td class="num">${eur(Libro.patrimonio(st, cid))}</td></tr>`;
  }).join('');

  $('view').innerHTML = `
    <h1>Clientes</h1>
    <div class="card"><h2>Nueva persona</h2>
      <div class="row">
        <input id="nom" placeholder="Nombre"><input id="ape" placeholder="Apellidos">
        <label class="chk"><input type="checkbox" id="conInd" checked> con cartera individual</label>
        <button class="primary" id="btnPersona">Añadir persona</button>
      </div>
    </div>

    <div class="card"><h2>Nueva cartera (individual o conjunta)</h2>
      <div class="row">
        <input id="cnom" placeholder="Nombre de la cartera" value="Cartera conjunta">
      </div>
      <p class="muted" style="margin:10px 0 4px">Titulares (marca uno para individual, dos o más para conjunta):</p>
      <div class="chks" id="titSel">${opcionesPersonas}</div>
      <div class="row" style="margin-top:10px"><button class="primary" id="btnCartera">Crear cartera</button>
        <span class="muted" id="cmsg"></span></div>
    </div>

    <div class="card"><h2>Personas y carteras</h2>
      <table><thead><tr><th>Cartera</th><th>Titulares</th><th class="num">Patrimonio</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="3" class="muted">Sin carteras todavía.</td></tr>'}</tbody></table>
      <div class="avisos">Todo lo que añadas se escribe como apunte en <b>tu</b> registro de OneDrive. Cuando OneDrive traiga el registro de Ana, sus altas aparecerán aquí (Refrescar o volver a la ventana). Al añadir un segundo titular a una cartera, pasa a conjunta sola.</div>
    </div>`;

  $('btnPersona').onclick = altaPersona;
  $('btnCartera').onclick = crearCartera;
  document.querySelectorAll('[data-add]').forEach(s => s.onchange = () => { if (s.value) anadirTitular(s.dataset.add, s.value); });
  document.querySelectorAll('[data-quita]').forEach(b => b.onclick = () => quitarTitular(b.dataset.quita, b.dataset.p));
}

async function altaPersona() {
  const nombre = $('nom').value.trim(); if (!nombre) return;
  const apellidos = $('ape').value.trim();
  const pid = crypto.randomUUID();
  const lista = [['alta_persona', { id: pid, nombre, apellidos }]];
  if ($('conInd').checked) {
    const cid = crypto.randomUUID();
    lista.push(['alta_cartera', { id: cid, nombre: 'Cartera individual', tipo: 'individual' }]);
    lista.push(['titular', { cartera: cid, persona: pid }]);
  }
  await apuntar(lista); await recargarYrender();
}

async function crearCartera() {
  const nombre = $('cnom').value.trim() || 'Cartera';
  const sel = [...document.querySelectorAll('#titSel input:checked')].map(i => i.value);
  if (!sel.length) { $('cmsg').textContent = 'Marca al menos un titular.'; return; }
  const tipo = sel.length >= 2 ? 'conjunta' : 'individual';
  const cid = crypto.randomUUID();
  const lista = [['alta_cartera', { id: cid, nombre, tipo }]];
  for (const pid of sel) lista.push(['titular', { cartera: cid, persona: pid }]);
  await apuntar(lista); await recargarYrender();
}

async function anadirTitular(cid, pid) {
  const st = ESTADO;
  const nuevos = titularesDe(st, cid).length + 1;
  const lista = [['titular', { cartera: cid, persona: pid }]];
  if (nuevos >= 2 && st.carteras[cid]?.tipo === 'individual') lista.push(['edit_cartera', { id: cid, tipo: 'conjunta' }]);
  await apuntar(lista); await recargarYrender();
}
async function quitarTitular(cid, pid) {
  const st = ESTADO;
  const restantes = titularesDe(st, cid).filter(x => x !== pid).length;
  const lista = [['quita_titular', { cartera: cid, persona: pid }]];
  if (restantes <= 1 && st.carteras[cid]?.tipo === 'conjunta') lista.push(['edit_cartera', { id: cid, tipo: 'individual' }]);
  await apuntar(lista); await recargarYrender();
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
boot();
