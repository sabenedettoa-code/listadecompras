// Estado global de la aplicación
let coleccionListas = [];
let idListaActiva = null;
let filtroProductos = 'pendientes';
let pasoActualTutorial = 0;
let esEscuchandoVoz = false;
let escalaFuenteActual = 1;
let wakeLockSentinel = null;
let ultimaAccionDeshacer = null;
let timerToast = null;
let timerFeedbackPop = null;
let diferidoPromptInstalacion = null;
let textoBusquedaActual = '';
let dbListenerRef = null;
let presenceRef = null;
let myPresenceRef = null; // Guardará la conexión activa de este usuario
let listaIdSuscrito = null; // Controla qué lista ya está siendo escuchada
const presenceSessionId = (() => {
  const existente = sessionStorage.getItem('misListasPresenceId');
  if (existente) return existente;
  const nuevo = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  sessionStorage.setItem('misListasPresenceId', nuevo);
  return nuevo;
})();
let html5QrcodeScanner = null;
let chartGastosInstance = null;
let limitePresupuestoActual = 0;
let objetoReconocimientoVoz = null;
let dictadoVozDebeContinuar = false;
let dictadoVozEsMovil = false;
let timerReinicioDictadoVoz = null;
let reconocimientoVozIA = null;
let productoPendienteDuplicado = null;
let escanerProcesando = false;
let modoFocusActivo = false;
let imagenBase64Cargada = null;
let resultadoIAPendiente = [];
let mensajeIAPendiente = "";
let targetIdIAPendiente = null;
let estadisticasFrecuencia = {};
let historialCompras = [];
let estadisticasAnualesLocal = { version: 1, inicioRegistro: null, anios: {} };
const tokensCompraSesion = new Map();
let compraCompletadaRegistrada = new Set();
const estadoSonidoPresupuesto = new Map();
let colaSyncPendiente = {};
