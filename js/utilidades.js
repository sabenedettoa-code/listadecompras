// Analítica, diálogos, red, menú y utilidades comunes
// ANALÍTICA DE USO ANÓNIMA (GA4): solo eventos funcionales. No envía nombres de productos/listas, precios ni fotos.
function registrarEventoGA(nombre, parametros = {}) {
  try {
    if (typeof window.gtag !== 'function') return;
    const seguros = {};
    Object.entries(parametros || {}).forEach(([k,v]) => {
      if (['string','number','boolean'].includes(typeof v)) seguros[k] = v;
    });
    window.gtag('event', nombre, seguros);
  } catch (e) {}
}

function registrarAperturaAppUnaVez() {
  try {
    if (sessionStorage.getItem('ga_app_open_v1')) return;
    sessionStorage.setItem('ga_app_open_v1', '1');
    registrarEventoGA('app_open', { standalone: !!(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true), online: navigator.onLine });
  } catch (e) { registrarEventoGA('app_open', { online: navigator.onLine }); }
}
window.addEventListener('DOMContentLoaded', registrarAperturaAppUnaVez);

let dialogoAppResolver = null;
let dialogoAppConfig = null;

function abrirDialogoApp(opciones = {}) {
  const overlay = document.getElementById('appDialogOverlay');
  const icon = document.getElementById('appDialogIcon');
  const title = document.getElementById('appDialogTitle');
  const message = document.getElementById('appDialogMessage');
  const input = document.getElementById('appDialogInput');
  const note = document.getElementById('appDialogNote');
  const btnCancel = document.getElementById('appDialogCancel');
  const btnConfirm = document.getElementById('appDialogConfirm');
  if (!overlay || !icon || !title || !message || !input || !note || !btnCancel || !btnConfirm) {
    return Promise.resolve({ confirmed: false, value: '' });
  }

  dialogoAppConfig = {
    showInput: false,
    required: false,
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    icon: '💬',
    title: 'Confirmar acción',
    message: '',
    inputValue: '',
    inputPlaceholder: '',
    helperText: '',
    danger: false,
    ...opciones
  };

  icon.textContent = dialogoAppConfig.icon || '💬';
  title.textContent = dialogoAppConfig.title || 'Confirmar acción';
  message.innerHTML = dialogoAppConfig.message || '';
  input.style.display = dialogoAppConfig.showInput ? 'block' : 'none';
  input.value = dialogoAppConfig.inputValue || '';
  input.placeholder = dialogoAppConfig.inputPlaceholder || '';
  note.textContent = dialogoAppConfig.helperText || '';
  note.classList.remove('error');
  btnCancel.textContent = dialogoAppConfig.cancelText || 'Cancelar';
  btnConfirm.textContent = dialogoAppConfig.confirmText || 'Aceptar';
  btnConfirm.classList.toggle('danger', !!dialogoAppConfig.danger);

  const hayOtroModalActivo = Array.from(document.querySelectorAll('.tutorial-overlay.active'))
    .some(el => el.id !== 'appDialogOverlay');
  document.body.classList.toggle('dialogo-secundario-abierto', hayOtroModalActivo);
  overlay.classList.add('active');

  return new Promise(resolve => {
    dialogoAppResolver = resolve;
    setTimeout(() => {
      if (dialogoAppConfig.showInput) {
        input.focus();
        input.select();
      } else {
        btnConfirm.focus();
      }
    }, 90);
  });
}

function cerrarDialogoApp(resultado = { confirmed: false, value: '' }) {
  const overlay = document.getElementById('appDialogOverlay');
  if (overlay) overlay.classList.remove('active');
  const resolver = dialogoAppResolver;
  dialogoAppResolver = null;
  dialogoAppConfig = null;
  document.body.classList.remove('dialogo-secundario-abierto');
  if (resolver) resolver(resultado);
}

function cancelarDialogoApp() {
  vibrarConfirmacion();
  const input = document.getElementById('appDialogInput');
  cerrarDialogoApp({ confirmed: false, value: input ? input.value.trim() : '' });
}

function confirmarDialogoApp() {
  const input = document.getElementById('appDialogInput');
  const note = document.getElementById('appDialogNote');
  const valor = input ? input.value.trim() : '';

  if (dialogoAppConfig?.showInput && dialogoAppConfig?.required && !valor) {
    note.textContent = dialogoAppConfig.requiredMessage || 'Escribe un valor para continuar.';
    note.classList.add('error');
    if (input) input.focus();
    return;
  }

  vibrarConfirmacion();
  cerrarDialogoApp({ confirmed: true, value: valor });
}

let memoriaPreciosLocal = {};
let memoriaNombresCodigos = {};

window.addEventListener('online', async () => {
  actualizarEstadoRed();
  await vaciarColaSincronizacion();
  const secLista = document.getElementById('secListaActiva');
  if (idListaActiva && secLista && secLista.style.display !== 'none') {
    escucharSincronizacionFirebase(idListaActiva);
  }
  mostrarToast('☁️ Conexión recuperada · cambios sincronizados');
});
window.addEventListener('offline', () => {
  actualizarEstadoRed();
  limpiarPresenciaLista();
});

function toggleSidebar() {
  document.getElementById('sidebarMenu').classList.toggle('active');
}

function abrirModalPrivacidad() {
  vibrarConfirmacion();
  document.getElementById('privacyOverlay').classList.add('active');
}

function cerrarModalPrivacidad() {
  vibrarConfirmacion();
  document.getElementById('privacyOverlay').classList.remove('active');
}

function abrirModalAcercaDe() {
  vibrarConfirmacion();
  document.getElementById('acercaDeOverlay').classList.add('active');
}

function cerrarModalAcercaDe() {
  vibrarConfirmacion();
  document.getElementById('acercaDeOverlay').classList.remove('active');
}

function actualizarEstadoRed() {
  const badge = document.getElementById('netStatusBadge');
  const banner = document.getElementById('offlineBanner');
  if (navigator.onLine) {
    badge.textContent = 'Online';
    badge.className = 'net-badge online';
    banner?.classList.remove('show');
    if (actualizarEstadoRed.ultimoEstado === false) registrarEventoGA('network_online');
    actualizarEstadoRed.ultimoEstado = true;
  } else {
    badge.textContent = 'Sin conexión';
    badge.className = 'net-badge offline';
    banner?.classList.add('show');
    if (actualizarEstadoRed.ultimoEstado !== false) registrarEventoGA('network_offline');
    actualizarEstadoRed.ultimoEstado = false;
  }
}

function toggleModoFocus() {
  vibrarConfirmacion();
  modoFocusActivo = !modoFocusActivo;
  const listaEstado = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (listaEstado) { listaEstado.ui = { ...(listaEstado.ui||{}), focus: modoFocusActivo }; guardarStorage(); }
  localStorage.setItem('modoFocus_v1', modoFocusActivo ? '1' : '0');
  const appContainer = document.getElementById('appContainer');
  const btn = document.getElementById('btnToggleFocus');
  const buscadorFocus = document.getElementById('searchInput');

  if (modoFocusActivo) {
    if (buscadorFocus) buscadorFocus.placeholder = 'Buscar producto en Focus...';
    appContainer.classList.add('focus-mode-active');
    btn.innerHTML = `${iconoUI('target')}<span>Salir Focus</span>`;
    mostrarToast("🎯 Modo Focus activado");
    registrarEventoGA('focus_toggled', { enabled: true });
  } else {
    appContainer.classList.remove('focus-mode-active');
    if (buscadorFocus) buscadorFocus.placeholder = 'Buscar en esta lista...';
    btn.innerHTML = `${iconoUI('target')}<span>Modo Focus</span>`;
    mostrarToast("🎯 Modo normal");
    registrarEventoGA('focus_toggled', { enabled: false });
  }
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}
