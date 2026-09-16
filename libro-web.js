// libro-web.js — motor de datos + acceso a OneDrive por el navegador (Chrome/Edge)
// Mismo principio que la versión de escritorio: libro de apuntes de solo-añadir,
// un fichero por usuario, estado reconstruido (nunca guardado).
const VERSION_EVENTO = 1;

// --- Guardar/recuperar el "permiso a la carpeta" entre sesiones (IndexedDB) ---
const IDB_DB = 'gestor-carteras', IDB_STORE = 'handles';
const idb = () => new Promise((res, rej) => {
  const r = indexedDB.open(IDB_DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
async function guardarHandle(h) { const db = await idb();
  return new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(h, 'vault'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
async function leerHandle() { const db = await idb();
  return new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, 'readonly');
    const rq = tx.objectStore(IDB_STORE).get('vault'); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error); }); }

async function elegirCarpeta() {
  const h = await window.showDirectoryPicker({ mode: 'readwrite', id: 'gestor-vault' });
  await guardarHandle(h); return h;
}
async function permiso(h, pedir = false) {
  const o = { mode: 'readwrite' };
  if ((await h.queryPermission(o)) === 'granted') return true;
  if (pedir && (await h.requestPermission(o)) === 'granted') return true;
  return false;
}

const subRegistros = (vault) => vault.getDirectoryHandle('registros', { create: true });

async function cargarEventos(vault) {
  const dir = await subRegistros(vault);
  const vistos = new Set(), eventos = [];
  for await (const [name, handle] of dir.entries()) {
    if (!name.endsWith('.jsonl') || handle.kind !== 'file') continue;
    const texto = await (await handle.getFile()).text();
    for (const linea of texto.split('\n')) {
      const s = linea.trim(); if (!s) continue;
      let ev; try { ev = JSON.parse(s); } catch { continue; }
      if (!ev || !ev.id || vistos.has(ev.id)) continue;
      vistos.add(ev.id); eventos.push(ev);
    }
  }
  eventos.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : (a.id < b.id ? -1 : 1)));
  return eventos;
}

async function anexar(vault, autor, tipo, payload) {
  const dir = await subRegistros(vault);
  const fh = await dir.getFileHandle(autor + '.jsonl', { create: true });
  const file = await fh.getFile();
  const ev = { v: VERSION_EVENTO, id: crypto.randomUUID(), ts: new Date().toISOString(), autor, tipo, payload };
  const w = await fh.createWritable({ keepExistingData: true });
  await w.write({ type: 'write', position: file.size, data: JSON.stringify(ev) + '\n' });
  await w.close();
  return ev;
}

function reconstruir(eventos) {
  const e = { personas: {}, instrumentos: {}, carteras: {}, titulares: {}, vl: {}, movimientos: [], planes: {}, conflictos: [] };
  const anuladas = new Set();
  for (const ev of eventos) {
    const p = ev.payload || {};
    switch (ev.tipo) {
      case 'alta_persona':     e.personas[p.id] = p; break;
      case 'edit_persona':     e.personas[p.id] = Object.assign(e.personas[p.id] || {}, p); break;
      case 'alta_instrumento': e.instrumentos[p.id] = p; break;
      case 'vl':               (e.vl[p.instrumento] ||= {})[p.fecha] = p.valor; break;
      case 'alta_cartera':     e.carteras[p.id] = p; break;
      case 'edit_cartera':     e.carteras[p.id] = Object.assign(e.carteras[p.id] || {}, p); break;
      case 'titular':          (e.titulares[p.cartera] ||= new Set()).add(p.persona); break;
      case 'quita_titular':    e.titulares[p.cartera]?.delete(p.persona); break;
      case 'plan':             e.planes[p.id] = p; break;
      case 'movimiento':       e.movimientos.push({ ...p, _id: ev.id, autor: ev.autor }); break;
      case 'correccion':
        if (p.anula) { if (anuladas.has(p.anula)) e.conflictos.push({ tipo: 'doble-correccion', objetivo: p.anula }); anuladas.add(p.anula); }
        if (p.movimiento) e.movimientos.push({ ...p.movimiento, _id: ev.id, autor: ev.autor });
        break;
      default: e.conflictos.push({ tipo: 'evento-desconocido', evento: ev.tipo });
    }
  }
  e.movimientos = e.movimientos.filter(m => !anuladas.has(m._id));
  e.posiciones = {}; e.liquidez = {};
  for (const m of e.movimientos) {
    e.liquidez[m.cartera] = (e.liquidez[m.cartera] || 0) + (m.efectivo_delta || 0);
    if (m.instrumento) { const k = m.cartera + '|' + m.instrumento; e.posiciones[k] = (e.posiciones[k] || 0) + (m.titulos_delta || 0); }
  }
  return e;
}
function patrimonio(estado, carteraId, fecha) {
  let vf = 0;
  for (const [k, tit] of Object.entries(estado.posiciones)) {
    const [c, inst] = k.split('|');
    if (c !== carteraId || Math.abs(tit) < 1e-8) continue;
    const vls = estado.vl[inst] || {};
    const fechas = Object.keys(vls).filter(f => !fecha || f <= fecha).sort();
    const ult = fechas[fechas.length - 1];
    if (ult != null) vf += tit * vls[ult];
  }
  return vf + (estado.liquidez[carteraId] || 0);
}
window.Libro = { VERSION_EVENTO, elegirCarpeta, permiso, leerHandle, cargarEventos, anexar, reconstruir, patrimonio };
