// Configuración de Firebase, autenticación anónima
// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAAa0FMRmg69mhIBiHrpCoXvhXa8qBRFa0",
  authDomain: "auth.listadecompras.website",
  databaseURL: "https://lista-de-compras-8e59d-default-rtdb.firebaseio.com",
  projectId: "lista-de-compras-8e59d",
  storageBucket: "lista-de-compras-8e59d.firebasestorage.app",
  messagingSenderId: "708116875550",
  appId: "1:708116875550:web:ae6c6960c5807911d8e10f"
};

firebase.initializeApp(firebaseConfig);

// APP CHECK: demuestra a Firebase que las peticiones vienen de este sitio y no de un script externo.
// La clave de reCAPTCHA Enterprise es pública (no es un secreto). En localhost se usa un token
// de depuración: la consola del navegador lo muestra y hay que registrarlo en Firebase > App Check.
const RECAPTCHA_ENTERPRISE_SITE_KEY = '6LeuVNAtAAAAACGoKNj1oA_XUq40H1KZkgnw4-VK';
try {
  if (['localhost', '127.0.0.1'].includes(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  firebase.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY), true);
} catch (e) {
  console.warn('No se pudo activar App Check:', e);
}
const auth = firebase.auth();
const db = firebase.database();
let usuarioFirebase = null;
let errorAutenticacionFirebase = null;

const firebaseAuthReady = (async () => {
  try {
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    if (auth.currentUser) {
      usuarioFirebase = auth.currentUser;
      return usuarioFirebase;
    }
    const credencial = await auth.signInAnonymously();
    usuarioFirebase = credencial.user;
    return usuarioFirebase;
  } catch (error) {
    errorAutenticacionFirebase = error;
    console.error('No fue posible iniciar la autenticación anónima de Firebase:', error);
    return null;
  }
})();

async function obtenerUsuarioFirebase() {
  const user = usuarioFirebase || await firebaseAuthReady;
  if (!user) throw (errorAutenticacionFirebase || new Error('Firebase Authentication no disponible'));
  return user;
}

async function asegurarMembresiaLista(listaId) {
  if (!listaId) throw new Error('Lista inválida');
  // v5.8.2: con reglas basadas en auth != null, no se requiere escribir un nodo de membresía.
  // Solo aseguramos que exista una sesión anónima válida antes de tocar Realtime Database.
  return await obtenerUsuarioFirebase();
}

async function migrarMembresiasLocales() {
  // Conservada por compatibilidad con llamadas antiguas.
  // Ya no escribe en /miembros; solo verifica que Authentication esté disponible.
  if (!navigator.onLine) return;
  try { await obtenerUsuarioFirebase(); }
  catch (e) { console.warn('Firebase Authentication aún no está disponible.', e); }
}
