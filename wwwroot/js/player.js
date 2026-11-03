const audio = new Audio();
const archivos = new Map();   // id -> File
const claves = new Map();     // id -> clave (para evitar duplicados)
const vistos = new Set();
let urlActual = null;
let dbPromesa = null;

// ---------- IndexedDB ----------
function db() {
  if (!dbPromesa) {
    dbPromesa = new Promise((ok, fallo) => {
      const r = indexedDB.open('reproductor', 1);
      r.onupgradeneeded = () =>
        r.result.createObjectStore('canciones', { keyPath: 'id', autoIncrement: true });
      r.onsuccess = () => ok(r.result);
      r.onerror = () => fallo(r.error);
    });
  }
  return dbPromesa;
}

async function guardar(registro) {
  const d = await db();
  return new Promise((ok, fallo) => {
    const tx = d.transaction('canciones', 'readwrite');
    const rq = tx.objectStore('canciones').add(registro);
    tx.oncomplete = () => ok(rq.result);
    tx.onerror = tx.onabort = () => fallo(tx.error);
  });
}

async function borrar(id) {
  const d = await db();
  return new Promise((ok, fallo) => {
    const tx = d.transaction('canciones', 'readwrite');
    tx.objectStore('canciones').delete(id);
    tx.oncomplete = () => ok();
    tx.onerror = tx.onabort = () => fallo(tx.error);
  });
}

// ---------- Inicio ----------
export function init(dotnetRef) {
  audio.addEventListener('ended', () => dotnetRef.invokeMethodAsync('AlTerminar'));

  const avisarTiempo = () => dotnetRef.invokeMethodAsync(
    'AlActualizarTiempo',
    audio.currentTime,
    isFinite(audio.duration) ? audio.duration : 0
  );
  audio.addEventListener('timeupdate', avisarTiempo);
  audio.addEventListener('loadedmetadata', avisarTiempo);

  // Pide al navegador que no borre los datos si falta espacio
  try { navigator.storage?.persist?.(); } catch { }
}

// ---------- Biblioteca ----------
export async function cargarBiblioteca() {
  const d = await db();
  const todos = await new Promise((ok, fallo) => {
    const rq = d.transaction('canciones').objectStore('canciones').getAll();
    rq.onsuccess = () => ok(rq.result);
    rq.onerror = () => fallo(rq.error);
  });

  const resultado = [];
  for (const r of todos) {
    archivos.set(r.id, r.archivo);
    claves.set(r.id, r.clave);
    vistos.add(r.clave);
    resultado.push({ id: r.id, name: r.name });
  }
  resultado.sort((a, b) => a.id - b.id);
  return resultado;
}

async function agregar(f, resultado) {
  const clave = `${f.name}|${f.size}|${f.lastModified}`;
  if (vistos.has(clave)) return;
  try {
    const id = await guardar({ name: f.name, clave, archivo: f });
    vistos.add(clave);
    claves.set(id, clave);
    archivos.set(id, f);
    resultado.push({ id, name: f.name });
  } catch (e) {
    console.warn('No se pudo guardar', f.name, e);   // por ejemplo, sin espacio
  }
}

export async function registrarArchivos(input) {
  const lista = Array.from(input.files);
  input.value = '';
  const resultado = [];
  for (const f of lista) await agregar(f, resultado);
  return resultado;
}

export function soportaCarpetas() {
  return 'showDirectoryPicker' in window;
}

const EXT_AUDIO = /\.(mp3|m4a|aac|wav|flac|ogg|opus|wma)$/i;

export async function importarCarpeta() {
  const resultado = [];
  let carpeta;
  try {
    carpeta = await window.showDirectoryPicker({ mode: 'read' });
  } catch {
    return resultado;
  }

  async function recorrer(dir) {
    for await (const [nombre, handle] of dir.entries()) {
      if (handle.kind === 'file') {
        if (EXT_AUDIO.test(nombre)) await agregar(await handle.getFile(), resultado);
      } else {
        await recorrer(handle);
      }
    }
  }

  await recorrer(carpeta);
  return resultado;
}

export async function eliminar(id) {
  await borrar(id);
  vistos.delete(claves.get(id));
  claves.delete(id);
  archivos.delete(id);
}

// ---------- Reproducción ----------
export async function reproducir(id) {
  if (urlActual) URL.revokeObjectURL(urlActual);
  urlActual = URL.createObjectURL(archivos.get(id));
  audio.src = urlActual;
  await audio.play();
}

export function pausar() { audio.pause(); }
export function reanudar() { return audio.play(); }
export function buscar(segundos) { audio.currentTime = segundos; }
export function setVolumen(v) { audio.volume = v; }
export function setBucle(activo) { audio.loop = activo; }