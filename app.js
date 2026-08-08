import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
  query, 
  where,
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- CONFIGURACIÓN DE EMAILJS ---
const EMAILJS_PUBLIC_KEY = "e_uovUaQx61cm7X24"; 
const EMAILJS_SERVICE_ID = "service_v89l5mz"; 
const EMAILJS_TEMPLATE_ID = "template_qiaonxj"; 

// Imagen transparente en Base64 por defecto
const IMAGEN_VACIA = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

if (typeof emailjs !== "undefined") {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAtECy4MkyBnzYG_ZtIGDLl_75Yedo66NM",
  authDomain: "gastoshogarapp-1bbae.firebaseapp.com",
  projectId: "gastoshogarapp-1bbae",
  storageBucket: "gastoshogarapp-1bbae.firebasestorage.app",
  messagingSenderId: "1040938444301",
  appId: "1:1040938444301:web:e5563e8662aa950551d744",
  measurementId: "G-JMS3FCFM4L"
};

const VERCEL_APP_URL = "https://appcuentasclaras.vercel.app";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// DOM
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnSubmit = document.getElementById('btn-submit');
const btnToggle = document.getElementById('btn-toggle');
const btnGoogle = document.getElementById('btn-google');
const btnLogout = document.getElementById('btn-logout');
const authTitle = document.getElementById('auth-title');
const toggleText = document.getElementById('toggle-text');
const authMessage = document.getElementById('auth-message');

const welcomeUserTitle = document.getElementById('welcome-user-title');
const btnInstallPwa = document.getElementById('btn-install-pwa');
const selectMoneda = document.getElementById('select-moneda');

const modalTutorial = document.getElementById('modal-tutorial');
const btnTutorial = document.getElementById('btn-tutorial');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnEntendido = document.getElementById('btn-entendido');

const modalPrivacy = document.getElementById('modal-privacy');
const btnPrivacyAuth = document.getElementById('btn-privacy-auth');
const btnPrivacyApp = document.getElementById('btn-privacy-app');
const btnClosePrivacy = document.getElementById('btn-close-privacy');
const btnEntendidoPrivacy = document.getElementById('btn-entendido-privacy');

const modalPago = document.getElementById('modal-pago');
const formPago = document.getElementById('form-pago');
const btnClosePago = document.getElementById('btn-close-pago');
const btnOmitirPago = document.getElementById('btn-omitir-pago');
const inputPagoParaEmail = document.getElementById('pago-para-email');
const inputPagoTituloGasto = document.getElementById('pago-titulo-gasto');
const inputPagoMontoCuota = document.getElementById('pago-monto-cuota');
const inputPagoNotiId = document.getElementById('pago-noti-id');
const fileComprobantePago = document.getElementById('file-comprobante-pago');
const fileComprobanteGasto = document.getElementById('file-comprobante-gasto');

const modalConfirm = document.getElementById('modal-confirm');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmIcon = document.getElementById('confirm-icon');
const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
const btnConfirmAccept = document.getElementById('btn-confirm-accept');

const selectGrupos = document.getElementById('select-grupos');
const sinHogarBox = document.getElementById('sin-hogar-box');
const conHogarBox = document.getElementById('con-hogar-box');
const btnCrearHogar = document.getElementById('btn-crear-hogar');
const btnUnirseHogar = document.getElementById('btn-unirse-hogar');
const btnCompartir = document.getElementById('btn-compartir');
const nombreHogarInput = document.getElementById('nombre-hogar-input');
const codigoUnirseInput = document.getElementById('codigo-unirse-input');

const btnRenombrarGrupo = document.getElementById('btn-renombrar-grupo');
const btnEliminarGrupo = document.getElementById('btn-eliminar-grupo');

const balanceSection = document.getElementById('balance-section');
const gastoSection = document.getElementById('gasto-section');
const historialSection = document.getElementById('historial-section');
const balanceDisplay = document.getElementById('balance-display');
const desgloseBox = document.getElementById('desglose-integrantes-box');
const listaDesglose = document.getElementById('lista-desglose-integrantes');

const btnSaldar = document.getElementById('btn-saldar');
const gastoForm = document.getElementById('gasto-form');
const listaGastos = document.getElementById('lista-gastos');

const filterSearch = document.getElementById('filter-search');
const filterCategoria = document.getElementById('filter-categoria');
const btnExportarCsv = document.getElementById('btn-exportar-csv');

const tipoGastoSelect = document.getElementById('tipo-gasto');
const categoriaSelect = document.getElementById('categoria');
const grupoCorreoDeudor = document.getElementById('grupo-correo-deudor');
const restauranteItemsBox = document.getElementById('restaurante-items-box');
const contenedorItemsRestaurante = document.getElementById('contenedor-items-restaurante');
const btnAgregarItemRestaurante = document.getElementById('btn-agregar-item-restaurante');
const inputMontoGasto = document.getElementById('monto');

let currentUser = null;
let currentHogar = null;
let listaMisGrupos = [];
let todosLosGastosGrupo = [];
let isLogin = true;
let unsubscribeGastos = null;
let unsubscribeHogar = null;
let deferredPrompt = null;
let monedaSeleccionada = 'CLP';

selectMoneda.addEventListener('change', (e) => {
  monedaSeleccionada = e.target.value;
  if (currentHogar) escucharGastosEnTiempoReal();
});

function formatearMoneda(monto) {
  const configs = {
    CLP: { locale: 'es-CL', currency: 'CLP', decimals: 0 },
    USD: { locale: 'en-US', currency: 'USD', decimals: 2 },
    EUR: { locale: 'de-DE', currency: 'EUR', decimals: 2 },
    ARS: { locale: 'es-AR', currency: 'ARS', decimals: 2 },
    MXN: { locale: 'es-MX', currency: 'MXN', decimals: 2 },
    COP: { locale: 'es-CO', currency: 'COP', decimals: 0 }
  };
  const cfg = configs[monedaSeleccionada] || configs.CLP;
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.currency,
    maximumFractionDigits: cfg.decimals
  }).format(monto);
}

function obtenerNombreUsuario(user) {
  if (user && user.displayName && user.displayName.trim() !== "") {
    return user.displayName;
  }
  if (user && user.email) {
    const parte = user.email.split('@')[0];
    return parte.charAt(0).toUpperCase() + parte.slice(1);
  }
  return "Usuario";
}

// COMPRESIÓN ULTRA LIGERA PARA CORREOS (<10KB)
function comprimirImagenABase64(archivo) {
  return new Promise((resolve) => {
    if (!archivo) return resolve(null);
    
    if (archivo.type === 'application/pdf') {
      const reader = new FileReader();
      reader.readAsDataURL(archivo);
      reader.onload = () => resolve(reader.result);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(archivo);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 280; 
        const scaleSize = MAX_WIDTH / img.width;
        
        canvas.width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
        canvas.height = (img.width > MAX_WIDTH) ? img.height * scaleSize : img.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.25)); 
      };
    };
  });
}

function verificarMostrarRestaurante() {
  const esRestaurante = categoriaSelect.value === 'Restaurante';
  const esCompartido = tipoGastoSelect.value === 'compartido';

  if (esRestaurante && esCompartido) {
    restauranteItemsBox.classList.remove('hidden');
    if (contenedorItemsRestaurante.children.length === 0) {
      agregarFilaRestaurante();
    }
  } else {
    restauranteItemsBox.classList.add('hidden');
  }
}

categoriaSelect.addEventListener('change', verificarMostrarRestaurante);
tipoGastoSelect.addEventListener('change', (e) => {
  if (e.target.value === 'personal') {
    grupoCorreoDeudor.classList.add('hidden');
  } else {
    grupoCorreoDeudor.classList.remove('hidden');
  }
  verificarMostrarRestaurante();
});

function agregarFilaRestaurante() {
  const div = document.createElement('div');
  div.className = 'item-restaurante-row';
  div.innerHTML = `
    <input type="text" class="item-persona" placeholder="Persona (Ej: Ana)">
    <input type="text" class="item-nombre" placeholder="Platillo (Ej: Pizza)">
    <input type="number" class="item-precio" placeholder="Precio" min="0" step="1">
    <button type="button" class="btn-delete btn-eliminar-item">&times;</button>
  `;

  div.querySelector('.btn-eliminar-item').addEventListener('click', () => {
    div.remove();
    calcularTotalRestaurante();
  });

  div.querySelector('.item-precio').addEventListener('input', calcularTotalRestaurante);
  contenedorItemsRestaurante.appendChild(div);
}

btnAgregarItemRestaurante.addEventListener('click', agregarFilaRestaurante);

function calcularTotalRestaurante() {
  let suma = 0;
  document.querySelectorAll('.item-precio').forEach(inp => {
    const val = parseFloat(inp.value);
    if (!isNaN(val)) suma += val;
  });
  if (suma > 0) inputMontoGasto.value = suma;
}

// PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstallPwa.classList.remove('hidden');
});

btnInstallPwa.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') btnInstallPwa.classList.add('hidden');
    deferredPrompt = null;
  }
});

// MODAL CONFIRMACIÓN
function mostrarConfirmacion({ titulo, mensaje, icono = '⚠️', textoBoton = 'Confirmar' }) {
  return new Promise((resolve) => {
    confirmTitle.textContent = titulo;
    confirmMessage.textContent = mensaje;
    confirmIcon.textContent = icono;
    btnConfirmAccept.textContent = textoBoton;

    modalConfirm.classList.remove('hidden');

    const handleAccept = () => { cleanup(); resolve(true); };
    const handleCancel = () => { cleanup(); resolve(false); };
    const cleanup = () => {
      modalConfirm.classList.add('hidden');
      btnConfirmAccept.removeEventListener('click', handleAccept);
      btnConfirmCancel.removeEventListener('click', handleCancel);
    };

    btnConfirmAccept.addEventListener('click', handleAccept);
    btnConfirmCancel.addEventListener('click', handleCancel);
  });
}

// MODALES
btnTutorial.addEventListener('click', () => modalTutorial.classList.remove('hidden'));
btnCloseModal.addEventListener('click', () => modalTutorial.classList.add('hidden'));
btnEntendido.addEventListener('click', () => modalTutorial.classList.add('hidden'));

btnPrivacyAuth.addEventListener('click', () => modalPrivacy.classList.remove('hidden'));
btnPrivacyApp.addEventListener('click', () => modalPrivacy.classList.remove('hidden'));
btnClosePrivacy.addEventListener('click', () => modalPrivacy.classList.add('hidden'));
btnEntendidoPrivacy.addEventListener('click', () => modalPrivacy.classList.add('hidden'));

btnClosePago.addEventListener('click', () => modalPago.classList.add('hidden'));

// AUTENTICACIÓN
btnToggle.addEventListener('click', () => {
  isLogin = !isLogin;
  authTitle.textContent = isLogin ? 'CuentasClaras' : 'Crear Cuenta';
  btnSubmit.textContent = isLogin ? 'Entrar' : 'Registrarse';
  toggleText.textContent = isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
  btnToggle.textContent = isLogin ? 'Registrarse' : 'Iniciar Sesión';
  authMessage.textContent = '';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarMensaje('Procesando...', 'info');
  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value.trim());
    } else {
      await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value.trim());
    }
  } catch (error) {
    mostrarMensaje(traducirError(error.code), 'error');
  }
});

btnGoogle.addEventListener('click', async () => {
  mostrarMensaje('Conectando con Google...', 'info');
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    mostrarMensaje(`Error con Google: ${error.message}`, 'error');
  }
});

btnLogout.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const nombreReal = obtenerNombreUsuario(user);
    welcomeUserTitle.textContent = `¡Bienvenido/a de nuevo, ${nombreReal}!`;

    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    escucharNotificaciones(user.email);
    await cargarGruposUsuario();
  } else {
    if (unsubscribeGastos) unsubscribeGastos();
    if (unsubscribeHogar) unsubscribeHogar();
    currentUser = null;
    currentHogar = null;
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
});

// NOTIFICACIONES
function escucharNotificaciones(userEmail) {
  const q = query(
    collection(db, 'notificaciones'), 
    where('paraEmail', '==', userEmail),
    where('leida', '==', false)
  );

  onSnapshot(q, (snapshot) => {
    const notiSection = document.getElementById('notificaciones-section');
    const notiContainer = document.getElementById('lista-notificaciones');
    
    if (snapshot.empty) {
      notiSection.classList.add('hidden');
      return;
    }

    notiSection.classList.remove('hidden');
    notiContainer.innerHTML = '';

    snapshot.forEach((documento) => {
      const noti = documento.data();
      const div = document.createElement('div');
      div.className = 'gasto-item';
      div.style.borderLeft = '4px solid #10b981';
      div.innerHTML = `
        <div>
          <strong>📩 ${noti.comprobanteBase64 ? 'Comprobante de Pago Recibido' : 'Nuevo gasto asignado'}</strong>
          <p style="font-size: 0.85rem; color: #9ca3af;">${noti.mensaje}</p>
          ${noti.comprobanteBase64 ? `<a href="${noti.comprobanteBase64}" download="comprobante.jpg" target="_blank" class="gasto-link">📄 Ver / Descargar Comprobante Adjunto</a><br>` : ''}
          <button class="btn-noti-check" 
                  data-id="${documento.id}"
                  data-de="${noti.deEmail}"
                  data-monto="${noti.montoCuota || 0}"
                  data-titulo="${noti.mensaje}"
                  data-es-pago="${noti.comprobanteBase64 ? 'true' : 'false'}">
            ${noti.comprobanteBase64 ? '✓ Marcar como visto' : '✓ Marcar enterado / Enviar Pago'}
          </button>
        </div>
        ${noti.montoCuota > 0 ? `<div style="color: #ef4444; font-weight: bold;">Debes: ${formatearMoneda(noti.montoCuota)}</div>` : ''}
      `;
      notiContainer.appendChild(div);
    });

    document.querySelectorAll('.btn-noti-check').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const notiId = e.target.dataset.id;
        if (e.target.dataset.esPago === 'true') {
          await updateDoc(doc(db, 'notificaciones', notiId), { leida: true });
        } else {
          inputPagoNotiId.value = notiId;
          inputPagoParaEmail.value = e.target.dataset.de;
          inputPagoMontoCuota.value = e.target.dataset.monto;
          inputPagoTituloGasto.value = e.target.dataset.titulo;

          fileComprobantePago.value = '';
          modalPago.classList.remove('hidden');
        }
      });
    });
  });
}

btnOmitirPago.addEventListener('click', async () => {
  if (inputPagoNotiId.value) {
    await updateDoc(doc(db, 'notificaciones', inputPagoNotiId.value), { leida: true });
  }
  modalPago.classList.add('hidden');
});

// FORMULARIO DE ENVÍO DE PAGO
formPago.addEventListener('submit', async (e) => {
  e.preventDefault();

  const archivoPago = fileComprobantePago.files[0];
  const comprobanteBase64 = await comprimirImagenABase64(archivoPago);
  const miNombre = obtenerNombreUsuario(currentUser);

  try {
    if (inputPagoNotiId.value) {
      await updateDoc(doc(db, 'notificaciones', inputPagoNotiId.value), { leida: true });
    }

    await addDoc(collection(db, 'notificaciones'), {
      paraEmail: inputPagoParaEmail.value,
      deEmail: currentUser.email,
      mensaje: `💸 ${miNombre} te ha transferido su cuota para "${inputPagoTituloGasto.value}".`,
      comprobanteBase64: comprobanteBase64,
      montoCuota: 0,
      leida: false,
      fecha: new Date().toISOString()
    });

    const esSuficientementePequeno = comprobanteBase64 && comprobanteBase64.length < 120000;

    const emailParamsPago = {
      to_email: inputPagoParaEmail.value,
      from_name: miNombre,
      from_email: currentUser.email,
      titulo: `Pago de: ${inputPagoTituloGasto.value}`,
      categoria: "Transferencia Recibida",
      monto_cuota: `${formatearMoneda(parseFloat(inputPagoMontoCuota.value))} (Comprobante adjunto en app)`,
      content_attachment: esSuficientementePequeno ? comprobanteBase64 : IMAGEN_VACIA,
      tiene_comprobante: esSuficientementePequeno ? "display: block;" : "display: none;",
      items_restaurante_html: "",
      tiene_items_restaurante: "display: none;"
    };

    if (typeof emailjs !== "undefined") {
      try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, emailParamsPago);
      } catch (errEmail) {
        console.warn("Fallo el envío con adjunto, reintentando sin adjunto...", errEmail);
        try {
          emailParamsPago.content_attachment = IMAGEN_VACIA;
          emailParamsPago.tiene_comprobante = "display: none;";
          await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, emailParamsPago);
        } catch (errFallback) {
          console.error("Error definitivo enviando correo de pago:", errFallback);
        }
      }
    }

    modalPago.classList.add('hidden');
    alert('¡Comprobante de pago enviado!');
  } catch (error) {
    console.error('Error al procesar pago:', error);
  }
});

// GESTIÓN DE GRUPOS
function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function cargarGruposUsuario() {
  const q = query(collection(db, 'hogares'), where('integrantes', 'array-contains', currentUser.uid));
  const snapshot = await getDocs(q);

  listaMisGrupos = [];
  selectGrupos.innerHTML = '';

  if (snapshot.empty) {
    selectGrupos.innerHTML = '<option value="">-- No tienes grupos aún --</option>';
    conHogarBox.classList.add('hidden');
    balanceSection.classList.add('hidden');
    gastoSection.classList.add('hidden');
    historialSection.classList.add('hidden');
    return;
  }

  snapshot.forEach(documento => {
    listaMisGrupos.push({ id: documento.id, ...documento.data() });
  });

  listaMisGrupos.forEach((grupo) => {
    const opt = document.createElement('option');
    opt.value = grupo.id;
    opt.textContent = `📁 ${grupo.nombre}`;
    selectGrupos.appendChild(opt);
  });

  seleccionarGrupoActivo(listaMisGrupos[0].id);
}

selectGrupos.addEventListener('change', (e) => {
  if (e.target.value) seleccionarGrupoActivo(e.target.value);
});

function seleccionarGrupoActivo(grupoId) {
  currentHogar = listaMisGrupos.find(g => g.id === grupoId);
  if (!currentHogar) return;

  conHogarBox.classList.remove('hidden');
  balanceSection.classList.remove('hidden');
  gastoSection.classList.remove('hidden');
  historialSection.classList.remove('hidden');

  if (unsubscribeHogar) unsubscribeHogar();
  unsubscribeHogar = onSnapshot(doc(db, 'hogares', currentHogar.id), (docSnap) => {
    if (docSnap.exists()) {
      currentHogar = { id: docSnap.id, ...docSnap.data() };
      document.getElementById('codigo-hogar-display').textContent = currentHogar.codigo;
      document.getElementById('integrantes-count').textContent = currentHogar.integrantes ? currentHogar.integrantes.length : 1;
      escucharGastosEnTiempoReal();
    }
  });
}

btnRenombrarGrupo.addEventListener('click', async () => {
  if (!currentHogar) return;
  const nuevoNombre = prompt(`Ingresa nuevo nombre para "${currentHogar.nombre}":`, currentHogar.nombre);
  if (nuevoNombre && nuevoNombre.trim() !== '' && nuevoNombre !== currentHogar.nombre) {
    await updateDoc(doc(db, 'hogares', currentHogar.id), { nombre: nuevoNombre.trim() });
    await cargarGruposUsuario();
  }
});

btnEliminarGrupo.addEventListener('click', async () => {
  if (!currentHogar) return;
  const confirmado = await mostrarConfirmacion({
    titulo: `¿Eliminar "${currentHogar.nombre}"?`,
    mensaje: 'Se eliminará el grupo y todos sus gastos.',
    icono: '🗑️',
    textoBoton: 'Eliminar Grupo'
  });

  if (confirmado) {
    const qGastos = query(collection(db, 'gastos'), where('hogarId', '==', currentHogar.id));
    const snapshot = await getDocs(qGastos);
    snapshot.forEach(async (d) => await deleteDoc(doc(db, 'gastos', d.id)));
    await deleteDoc(doc(db, 'hogares', currentHogar.id));
    await cargarGruposUsuario();
  }
});

btnCrearHogar.addEventListener('click', async () => {
  const nombre = nombreHogarInput.value.trim();
  if (!nombre) return;
  const docRef = await addDoc(collection(db, 'hogares'), {
    nombre: nombre,
    codigo: generarCodigo(),
    integrantes: [currentUser.uid]
  });
  nombreHogarInput.value = '';
  await cargarGruposUsuario();
  seleccionarGrupoActivo(docRef.id);
});

btnUnirseHogar.addEventListener('click', async () => {
  const codigo = codigoUnirseInput.value.trim().toUpperCase();
  if (!codigo) return;
  const q = query(collection(db, 'hogares'), where('codigo', '==', codigo));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const hogarDoc = snapshot.docs[0];
    const data = hogarDoc.data();
    if (!data.integrantes.includes(currentUser.uid)) {
      data.integrantes.push(currentUser.uid);
      await updateDoc(doc(db, 'hogares', hogarDoc.id), { integrantes: data.integrantes });
    }
    codigoUnirseInput.value = '';
    await cargarGruposUsuario();
    seleccionarGrupoActivo(hogarDoc.id);
  }
});

btnCompartir.addEventListener('click', async () => {
  if (!currentHogar) return;
  const texto = `¡Únete a mi grupo "${currentHogar.nombre}" en CuentasClaras! Código: ${currentHogar.codigo}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'CuentasClaras', text: texto, url: VERCEL_APP_URL }); } catch (e) {}
  } else {
    navigator.clipboard.writeText(texto);
    alert('Código copiado al portapapeles');
  }
});

// REGISTRO DE GASTOS
gastoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentHogar) return;

  const titulo = document.getElementById('titulo').value.trim();
  const categoria = document.getElementById('categoria').value;
  const monto = parseFloat(document.getElementById('monto').value);
  const tipoGasto = document.getElementById('tipo-gasto').value;
  const correosRaw = document.getElementById('correo-deudor').value.trim();
  
  const comprobanteBase64 = await comprimirImagenABase64(fileComprobanteGasto.files[0]);
  const esCompartido = tipoGasto === 'compartido';
  const miNombre = obtenerNombreUsuario(currentUser);

  let itemsRestaurante = [];
  let itemsRestauranteHtml = "";

  if (categoria === 'Restaurante' && esCompartido) {
    document.querySelectorAll('.item-restaurante-row').forEach(row => {
      const persona = row.querySelector('.item-persona').value.trim();
      const nombreItem = row.querySelector('.item-nombre').value.trim();
      const precio = parseFloat(row.querySelector('.item-precio').value);

      if (persona && nombreItem && !isNaN(precio)) {
        itemsRestaurante.push({ persona, item: nombreItem, precio });
        itemsRestauranteHtml += `• <strong>${persona}</strong>: ${nombreItem} (${formatearMoneda(precio)})<br>`;
      }
    });
  }

  let correosLista = [];
  if (esCompartido && correosRaw) {
    correosLista = correosRaw
      .split(',')
      .map(c => c.trim().toLowerCase())
      .filter(c => c.length > 0 && c !== currentUser.email);
  }

  const numIntegrantes = Math.max(2, (currentHogar.integrantes ? currentHogar.integrantes.length : 2));
  const totalPersonas = correosLista.length > 0 ? (1 + correosLista.length) : numIntegrantes;
  const cuotaPorPersona = monto / totalPersonas;

  try {
    await addDoc(collection(db, 'gastos'), {
      hogarId: currentHogar.id,
      titulo: titulo,
      categoria: categoria,
      monto: monto,
      esCompartido: esCompartido,
      compartidoConEmails: correosLista,
      itemsRestaurante: itemsRestaurante,
      comprobanteBase64: comprobanteBase64,
      pagadoPor: currentUser.uid,
      pagadoPorEmail: currentUser.email,
      pagadoPorNombre: miNombre,
      fecha: new Date().toISOString()
    });

    if (esCompartido && correosLista.length > 0) {
      for (const correoDestino of correosLista) {
        await addDoc(collection(db, 'notificaciones'), {
          paraEmail: correoDestino,
          deEmail: currentUser.email,
          mensaje: `${miNombre} te ha añadido al gasto "${titulo}" (${categoria}).`,
          montoCuota: cuotaPorPersona,
          leida: false,
          fecha: new Date().toISOString()
        });

        const esSuficientementePequeno = comprobanteBase64 && comprobanteBase64.length < 120000;

        const emailParams = {
          to_email: correoDestino,
          from_name: miNombre,
          from_email: currentUser.email,
          titulo: titulo,
          categoria: categoria,
          monto_cuota: formatearMoneda(cuotaPorPersona),
          content_attachment: esSuficientementePequeno ? comprobanteBase64 : IMAGEN_VACIA,
          tiene_comprobante: esSuficientementePequeno ? "display: block;" : "display: none;",
          items_restaurante_html: itemsRestauranteHtml,
          tiene_items_restaurante: itemsRestauranteHtml !== "" ? "display: block;" : "display: none;"
        };

        if (typeof emailjs !== "undefined") {
          try {
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, emailParams);
          } catch (errEmail) {
            console.warn("Fallo el envío con adjunto, reintentando sin adjunto...", errEmail);
            try {
              emailParams.content_attachment = IMAGEN_VACIA;
              emailParams.tiene_comprobante = "display: none;";
              await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, emailParams);
            } catch (errFallback) {
              console.error("Error definitivo enviando correo:", errFallback);
            }
          }
        }
      }
    }

    gastoForm.reset();
    contenedorItemsRestaurante.innerHTML = '';
    restauranteItemsBox.classList.add('hidden');
  } catch (error) {
    console.error('Error al guardar gasto:', error);
  }
});

// HISTORIAL Y DESGLOSE EN TIEMPO REAL
function escucharGastosEnTiempoReal() {
  if (unsubscribeGastos) unsubscribeGastos();

  const q = query(collection(db, 'gastos'), where('hogarId', '==', currentHogar.id));

  unsubscribeGastos = onSnapshot(q, (snapshot) => {
    todosLosGastosGrupo = [];
    let totalCompartido = 0;
    let pagadoPorMi = 0;

    let desgloses = {};

    snapshot.forEach((docSnap) => {
      const gasto = { id: docSnap.id, ...docSnap.data() };
      todosLosGastosGrupo.push(gasto);

      if (gasto.esCompartido) {
        totalCompartido += gasto.monto;
        
        const pagador = gasto.pagadoPorNombre || "Usuario";
        desgloses[pagador] = (desgloses[pagador] || 0) + gasto.monto;

        if (gasto.pagadoPor === currentUser.uid) {
          pagadoPorMi += gasto.monto;
        }
      }
    });

    renderizarHistorialGastos();

    const numIntegrantes = Math.max(2, (currentHogar.integrantes ? currentHogar.integrantes.length : 2));
    const cuotaIndividual = totalCompartido / numIntegrantes;
    const miDiferencia = pagadoPorMi - cuotaIndividual;

    if (miDiferencia > 0) {
      balanceDisplay.innerHTML = `<span style="color: #10b981;">A tu favor en "${currentHogar.nombre}": ${formatearMoneda(miDiferencia)}</span>`;
      btnSaldar.classList.remove('hidden');
    } else if (miDiferencia < 0) {
      balanceDisplay.innerHTML = `<span style="color: #ef4444;">Debes en "${currentHogar.nombre}": ${formatearMoneda(Math.abs(miDiferencia))}</span>`;
      btnSaldar.classList.remove('hidden');
    } else {
      balanceDisplay.innerHTML = `<span>¡Cuentas al día en "${currentHogar.nombre}"! No hay deudas pendientes.</span>`;
      btnSaldar.classList.add('hidden');
    }

    listaDesglose.innerHTML = '';
    const personas = Object.keys(desgloses);

    if (personas.length > 0) {
      desgloseBox.classList.remove('hidden');
      personas.forEach((persona) => {
        const pagado = desgloses[persona];
        const dif = pagado - cuotaIndividual;

        const div = document.createElement('div');
        div.className = 'desglose-item';
        
        let estadoHtml = '';
        if (dif > 0) {
          estadoHtml = `<strong style="color:#10b981;">+${formatearMoneda(dif)} (A favor)</strong>`;
        } else if (dif < 0) {
          estadoHtml = `<strong style="color:#ef4444;">-${formatearMoneda(Math.abs(dif))} (Debe)</strong>`;
        } else {
          estadoHtml = `<span style="color:#9ca3af;">Al día</span>`;
        }

        div.innerHTML = `<div><strong>${persona}</strong><br><small style="color:#9ca3af;">Aportó: ${formatearMoneda(pagado)}</small></div><div>${estadoHtml}</div>`;
        listaDesglose.appendChild(div);
      });
    } else {
      desgloseBox.classList.add('hidden');
    }
  });
}

// FILTROS
filterSearch.addEventListener('input', renderizarHistorialGastos);
filterCategoria.addEventListener('change', renderizarHistorialGastos);

function renderizarHistorialGastos() {
  const queryTexto = filterSearch.value.trim().toLowerCase();
  const catSelected = filterCategoria.value;

  listaGastos.innerHTML = '';

  const gastosFiltrados = todosLosGastosGrupo.filter((gasto) => {
    const coincideTexto = gasto.titulo.toLowerCase().includes(queryTexto) || gasto.categoria.toLowerCase().includes(queryTexto);
    const coincideCategoria = catSelected === 'todas' || gasto.categoria === catSelected;
    return coincideTexto && coincideCategoria;
  });

  gastosFiltrados.forEach((gasto) => {
    const tagClase = gasto.esCompartido ? 'tag-compartido' : 'tag-personal';
    const tagTexto = gasto.esCompartido ? 'Compartido' : 'Personal';

    let htmlItemsRestaurante = '';
    if (gasto.itemsRestaurante && gasto.itemsRestaurante.length > 0) {
      htmlItemsRestaurante = `<div style="font-size:0.8rem; color:#9ca3af; margin-top:4px; padding-left:8px; border-left:2px solid #10b981;">`;
      gasto.itemsRestaurante.forEach(it => {
        htmlItemsRestaurante += `• <strong>${it.persona}</strong>: ${it.item} (${formatearMoneda(it.precio)})<br>`;
      });
      htmlItemsRestaurante += `</div>`;
    }

    const li = document.createElement('li');
    li.className = 'gasto-item';
    li.innerHTML = `
      <div>
        <strong>${gasto.categoria} - ${gasto.titulo}</strong>
        <span class="gasto-tag ${tagClase}">${tagTexto}</span>
        <br><small>Pagado por: ${gasto.pagadoPorNombre}</small>
        ${htmlItemsRestaurante}
        ${gasto.comprobanteBase64 ? `<br><a href="${gasto.comprobanteBase64}" download="comprobante_${gasto.titulo}.jpg" target="_blank" class="gasto-link">📄 Ver / Descargar Comprobante Adjunto</a>` : ''}
      </div>
      <div class="gasto-actions">
        <strong>${formatearMoneda(gasto.monto)}</strong>
        ${gasto.pagadoPor === currentUser.uid ? `<button class="btn-delete" data-id="${gasto.id}" title="Eliminar gasto">🗑️</button>` : ''}
      </div>
    `;
    listaGastos.appendChild(li);
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const confirmado = await mostrarConfirmacion({
        titulo: '¿Eliminar este gasto?',
        mensaje: 'Se borrará del historial.',
        icono: '🗑️',
        textoBoton: 'Eliminar'
      });
      if (confirmado) await deleteDoc(doc(db, 'gastos', e.target.dataset.id));
    });
  });
}

// EXPORTAR A CSV
btnExportarCsv.addEventListener('click', () => {
  if (todosLosGastosGrupo.length === 0) return alert('No hay gastos registrados para exportar.');

  let csvContent = "data:text/csv;charset=utf-8,Titulo,Categoria,Monto,Tipo,PagadoPor,Fecha\n";

  todosLosGastosGrupo.forEach(g => {
    const tipo = g.esCompartido ? "Compartido" : "Personal";
    csvContent += `"${g.titulo}","${g.categoria}",${g.monto},"${tipo}","${g.pagadoPorNombre}","${g.fecha}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `CuentasClaras_${currentHogar.nombre}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// SALDAR CUENTAS
btnSaldar.addEventListener('click', async () => {
  const confirmado = await mostrarConfirmacion({
    titulo: '¿Saldar cuentas del grupo?',
    mensaje: `Confirmas que ya se realizaron los pagos. El balance de "${currentHogar.nombre}" volverá a cero.`,
    icono: '✅',
    textoBoton: 'Saldar Cuentas'
  });

  if (confirmado) {
    const q = query(collection(db, 'gastos'), where('hogarId', '==', currentHogar.id));
    const snapshot = await getDocs(q);
    snapshot.forEach(async (documento) => {
      if (documento.data().esCompartido) {
        await updateDoc(doc(db, 'gastos', documento.id), { esCompartido: false });
      }
    });
  }
});

function mostrarMensaje(texto, tipo) {
  authMessage.textContent = texto;
  authMessage.className = `message ${tipo}`;
}

function traducirError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'El correo ya está registrado.';
    case 'auth/invalid-credential': return 'Credenciales incorrectas.';
    case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
    default: return `Error: ${code}`;
  }
}