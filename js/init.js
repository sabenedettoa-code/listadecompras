// Arranque de la aplicación (se carga al final)
auth.onAuthStateChanged(user=>{if(user)usuarioFirebase=user;actualizarUIcuenta(user);});

actualizarIconoMicPrincipal(false);

document.addEventListener('DOMContentLoaded', async () => {
  cargarTamanoLetra();
  cargarStorage();
  const ultimaGuardada = localStorage.getItem('ultimaListaActiva_v1');
  if (ultimaGuardada && coleccionListas.some(lista => String(lista.id) === String(ultimaGuardada))) {
    idListaActiva = ultimaGuardada;
  }
  cargarOrdenCategorias();
  cargarMemoriaPrecios();
  cargarInteligenciaLocal();
  cargarColaSincronizacion();
  await firebaseAuthReady;
  await migrarMembresiasLocales();
  if (esCuentaRegistrada(auth.currentUser)) await recuperarListasDeCuenta();
  actualizarEstadoRed();

  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    const btnInstalar = document.getElementById('btnInstalarPWA');
    if (btnInstalar) btnInstalar.style.display = 'none';
  }

  actualizarUIcuenta(auth.currentUser);
  const accesoInicialResuelto = localStorage.getItem('accesoInicialResuelto_v1');
  const hayListaEnlace = Boolean(obtenerCodigoListaDesdeURL());

  if (!accesoInicialResuelto) {
    // Si llegó por un enlace, el loader ya apareció desde el primer render.
    // Antes de pedir el método de acceso lo retiramos; al resolverlo se vuelve
    // a mostrar mientras Firebase abre realmente la lista compartida.
    verSeccion('inicio');
    if (hayListaEnlace) await ocultarCargaListaCompartida();
    setTimeout(() => abrirModalCuenta(true), 40);
  } else if (hayListaEnlace) {
    const abierta = await procesarListaRecibidaPorURL();
    if (!abierta) verSeccion('inicio');
  } else {
    verSeccion('inicio');
  }
});

function cerrarModalActivoSeguro() {
  const activo = Array.from(document.querySelectorAll('.tutorial-overlay.active')).pop();
  if (!activo) {
    document.getElementById('sidebarMenu')?.classList.remove('active');
    return;
  }

  switch (activo.id) {
    case 'appDialogOverlay': cancelarDialogoApp(); break;
    case 'iaOverlay': cerrarModalIA(); break;
    case 'memoriaPreciosOverlay': cerrarMemoriaPrecios(); break;
    case 'cuentaOverlay': cerrarModalCuenta(); break;
    case 'acercaDeOverlay': cerrarModalAcercaDe(); break;
    case 'duplicateOverlay': cancelarSumarDuplicado(); break;
    case 'tutorialOverlay': cerrarTutorial(); break;
    case 'privacyOverlay': cerrarModalPrivacidad(); break;
    case 'noListOverlay': cerrarModalSinLista(); break;
    case 'recetasOverlay': cerrarModalRecetas(); break;
    case 'scannerOverlay': cerrarEscanerBarras(true); break;
    case 'focusScanProductOverlay': cerrarConfirmacionEscanerFocus(); break;
    case 'graficoOverlay': cerrarModalGrafico(); break;
    case 'presupuestoOverlay': cerrarModalPresupuesto(); break;
    default: activo.classList.remove('active');
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('appDialogOverlay')?.classList.contains('active')) return;
  e.preventDefault();
  cerrarModalActivoSeguro();
});

document.querySelectorAll('.tutorial-overlay').forEach(overlay => {
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target !== overlay) return;
    cerrarModalActivoSeguro();
  });
});

document.getElementById('nombreNuevaLista').addEventListener('keypress', e => { if (e.key === 'Enter') crearNuevaLista(); });
document.getElementById('codigoUnirseInput').addEventListener('keypress', e => { if (e.key === 'Enter') unirsePorCodigo(); });
['itemInput', 'itemQty', 'itemPrice'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('keypress', e => { if (e.key === 'Enter') agregarProducto(); });
});

// SERVICE WORKER
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker listo:', reg.scope))
      .catch((err) => console.log('Error en SW:', err));
  });
}
