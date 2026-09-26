// Service worker de Mis Listas.
// - Archivos propios: primero la red, pero si tarda más de TIEMPO_MAXIMO_RED se usa la copia
//   guardada (la señal en el supermercado suele ser mala, no nula). La red igual actualiza la copia.
// - Librerías externas (Firebase, Chart.js, escáner, fuentes): tienen versión fija en la URL,
//   así que se sirven desde la caché y solo se descargan la primera vez.
// - Todo lo demás (base de datos, login, anuncios, analítica, ListAI) no se intercepta.
const VERSION = 'v52';
const CACHE_APP = `mis-listas-app-${VERSION}`;
const CACHE_LIBRERIAS = 'mis-listas-librerias-v1'; // cambiarlo solo si cambian las URLs de librerías
const TIEMPO_MAXIMO_RED = 3000;

const ARCHIVOS_APP = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-512.png',
  '/css/styles.css',
  '/js/gtag.js',
  '/js/boot.js',
  '/js/firebase.js',
  '/js/cuenta.js',
  '/js/estado.js',
  '/js/almacenamiento.js',
  '/js/utilidades.js',
  '/js/listai.js',
  '/js/precios.js',
  '/js/estadisticas.js',
  '/js/voz.js',
  '/js/escaner.js',
  '/js/presupuesto.js',
  '/js/recetas.js',
  '/js/ui.js',
  '/js/sincronizacion.js',
  '/js/listas.js',
  '/js/productos.js',
  '/js/init.js'
];

const LIBRERIAS = [
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check-compat.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

function esLibreria(url) {
  return (url.host === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))
    || url.host === 'cdn.jsdelivr.net'
    || url.host === 'unpkg.com'
    || url.host === 'fonts.googleapis.com'
    || url.host === 'fonts.gstatic.com';
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const app = await caches.open(CACHE_APP);
    await app.addAll(ARCHIVOS_APP);
    // Una librería que falle no debe impedir instalar el service worker: se reintenta al usarla.
    const librerias = await caches.open(CACHE_LIBRERIAS);
    await Promise.allSettled(LIBRERIAS.map(async (url) => {
      if (!(await librerias.match(url))) await librerias.add(new Request(url, { mode: 'cors' }));
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const vigentes = [CACHE_APP, CACHE_LIBRERIAS];
    const nombres = await caches.keys();
    await Promise.all(nombres.filter((n) => !vigentes.includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Todas las páginas (incluido "/?id=CODIGO") son el mismo index.html.
    const clave = req.mode === 'navigate' ? '/index.html' : url.pathname;
    event.respondWith(redConLimite(event, req, clave));
  } else if (esLibreria(url)) {
    event.respondWith(primeroCache(req));
  }
});

async function redConLimite(event, req, clave) {
  const cache = await caches.open(CACHE_APP);
  let guardado = null;
  const desdeRed = fetch(req).then((res) => {
    // Una respuesta redirigida no se puede reutilizar para una navegación.
    if (res.ok && !res.redirected) guardado = cache.put(clave, res.clone());
    return res;
  });
  // Mantiene vivo el service worker hasta guardar la copia, aunque ya se haya respondido con la anterior.
  event.waitUntil(desdeRed.then(() => guardado).catch(() => {}));

  let temporizador;
  const limite = new Promise((_, rechazar) => { temporizador = setTimeout(() => rechazar(new Error('lento')), TIEMPO_MAXIMO_RED); });
  try {
    return await Promise.race([desdeRed, limite]);
  } catch (e) {
    const copia = await cache.match(clave);
    if (copia) return copia;
    return desdeRed; // sin copia guardada: esperar a la red de todos modos
  } finally {
    clearTimeout(temporizador);
  }
}

async function primeroCache(req) {
  const cache = await caches.open(CACHE_LIBRERIAS);
  // ignoreVary: la copia se guardó con una petición CORS y el <script> la pide sin CORS.
  const copia = await cache.match(req, { ignoreVary: true });
  if (copia) return copia;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}
