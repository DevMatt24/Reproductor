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

export function registrarArchivos(input) {
  const resultado = [];
  for (const f of input.files) {
    const id = siguienteId++;
    archivos.set(id, f);
    resultado.push({ id, name: f.name });
  }
  input.value = '';
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