const audio = new Audio();
const archivos = new Map();
let siguienteId = 1;
let urlActual = null;

export function init(dotnetRef) {
  audio.addEventListener('ended', () => dotnetRef.invokeMethodAsync('AlTerminar'));

  const avisarTiempo = () => dotnetRef.invokeMethodAsync(
    'AlActualizarTiempo',
    audio.currentTime,
    isFinite(audio.duration) ? audio.duration : 0
  );
  audio.addEventListener('timeupdate', avisarTiempo);
  audio.addEventListener('loadedmetadata', avisarTiempo);
}

const vistos = new Set();

function agregar(f, resultado) {
  const clave = `${f.name}|${f.size}|${f.lastModified}`;
  if (vistos.has(clave)) return;          // evita duplicados
  vistos.add(clave);
  const id = siguienteId++;
  archivos.set(id, f);
  resultado.push({ id, name: f.name });
}

export function registrarArchivos(input) {
  const resultado = [];
  for (const f of input.files) agregar(f, resultado);
  input.value = '';
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
    return resultado;                     // el usuario canceló o denegó el permiso
  }

  async function recorrer(dir) {
    for await (const [nombre, handle] of dir.entries()) {
      if (handle.kind === 'file') {
        if (EXT_AUDIO.test(nombre)) agregar(await handle.getFile(), resultado);
      } else {
        await recorrer(handle);
      }
    }
  }

  await recorrer(carpeta);
  return resultado;
}
export async function reproducir(id) {
  if (urlActual) URL.revokeObjectURL(urlActual);
  urlActual = URL.createObjectURL(archivos.get(id));
  audio.src = urlActual;
  await audio.play();
}

export function pausar() { audio.pause(); }
export function reanudar() { return audio.play(); }
export function buscar(segundos) { audio.currentTime = segundos; }
export function setVolumen(v) { audio.volume = v; }          // 0 a 1
export function setBucle(activo) { audio.loop = activo; }    // repetir una canción