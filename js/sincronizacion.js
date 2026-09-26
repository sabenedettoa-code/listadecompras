// Sincronización con Firebase, presencia y listas compartidas
// SINCRONIZACIÓN FIREBASE POR PRODUCTO + PRESENCIA EN VIVO

function cargarColaSincronizacion() {
  try { colaSyncPendiente = JSON.parse(localStorage.getItem('colaSync_v1') || '{}') || {}; } catch(e){ colaSyncPendiente = {}; }
}
function guardarColaSincronizacion() { try { localStorage.setItem('colaSync_v1', JSON.stringify(colaSyncPendiente)); } catch(e){} }
function encolarSync(tipo, listaId, itemId, data=null) {
  if(!listaId) return;
  const key = `${listaId}__${tipo}__${itemId ?? 'meta'}`;
  colaSyncPendiente[key] = { tipo, listaId:String(listaId), itemId:itemId ?? null, data, ts:Date.now() };
  guardarColaSincronizacion();
}
// Firebase rechazó la escritura por las reglas: reintentarla nunca funcionará.
function esErrorPermisoFirebase(e) {
  return /PERMISSION_DENIED/i.test(String(e?.code || '')) || /permission_denied/i.test(String(e?.message || ''));
}

async function vaciarColaSincronizacion() {
  if(!navigator.onLine) return;
  cargarColaSincronizacion();
  try { await obtenerUsuarioFirebase(); } catch(e) { return; }
  const ops = Object.entries(colaSyncPendiente).sort((a,b)=>(a[1].ts||0)-(b[1].ts||0));
  const membresiasAseguradas = new Set();
  for(const [key,op] of ops) {
    try {
      if (!membresiasAseguradas.has(String(op.listaId))) {
        await asegurarMembresiaLista(op.listaId);
        membresiasAseguradas.add(String(op.listaId));
      }
      if(op.tipo==='set-item') {
        const item = sanearItem(op.data);
        if (item) await db.ref(`listas/${op.listaId}/items/${firebaseItemKey(item.id)}`).set(item);
      }
      else if(op.tipo==='delete-item') await db.ref(`listas/${op.listaId}/items/${firebaseItemKey(op.itemId)}`).remove();
      else if(op.tipo==='meta') await db.ref(`listas/${op.listaId}`).update(metaListaFirebase(op.data));
      delete colaSyncPendiente[key];
    } catch(e) {
      // Una operación rechazada por permisos se descarta; si no, trabaría la cola para siempre.
      if (esErrorPermisoFirebase(e)) {
        console.warn('Operación de sincronización descartada (sin permiso):', op, e);
        delete colaSyncPendiente[key];
        continue;
      }
      break;
    }
  }
  guardarColaSincronizacion();
}

function firebaseItemKey(id) {
  return String(id).replace(/[.#$\[\]\/]/g, '_');
}

function metaListaFirebase(lista) {
  return { nombre: sanearNombreLista(lista?.nombre), presupuesto: sanearPresupuesto(lista?.presupuesto) };
}

function itemsDesdeFirebase(raw) {
  if (!raw || typeof raw !== 'object') return [];
  return sanearItems(Array.isArray(raw) ? raw : Object.values(raw));
}

// Deja solo datos válidos de una lista leída desde Firebase (o null si no es una lista).
function listaDesdeFirebase(datos) {
  if (!datos || typeof datos !== 'object' || typeof datos.nombre !== 'string' || !datos.nombre.trim()) return null;
  return { nombre: sanearNombreLista(datos.nombre), items: itemsDesdeFirebase(datos.items), presupuesto: sanearPresupuesto(datos.presupuesto) };
}

async function sincronizarProductoFirebase(item) {
  const datos = sanearItem(item);
  if (!idListaActiva || !datos) return;
  if (!navigator.onLine) { encolarSync('set-item', idListaActiva, datos.id, datos); return; }
  const listaId = idListaActiva;
  try {
    await asegurarMembresiaLista(listaId);
    return await db.ref(`listas/${listaId}/items/${firebaseItemKey(datos.id)}`).set(datos);
  } catch(e) {
    if (esErrorPermisoFirebase(e)) { console.warn('Firebase rechazó el producto:', datos, e); return; }
    encolarSync('set-item', listaId, datos.id, datos);
  }
}

async function eliminarProductoFirebase(itemId) {
  if (!idListaActiva || itemId === undefined || itemId === null) return;
  if (!navigator.onLine) { encolarSync('delete-item', idListaActiva, itemId); return; }
  const listaId = idListaActiva;
  try {
    await asegurarMembresiaLista(listaId);
    return await db.ref(`listas/${listaId}/items/${firebaseItemKey(itemId)}`).remove();
  } catch(e) {
    if (esErrorPermisoFirebase(e)) { console.warn('Firebase rechazó la eliminación:', itemId, e); return; }
    encolarSync('delete-item', listaId, itemId);
  }
}

async function sincronizarMetaListaFirebase(lista) {
  if (!lista || !lista.id) return;
  const meta = metaListaFirebase({ nombre: lista.nombre, presupuesto: obtenerPresupuestoLista(lista) });
  if(!navigator.onLine){encolarSync('meta',lista.id,null,meta);return;}
  try {
    await asegurarMembresiaLista(lista.id);
    return await db.ref('listas/' + lista.id).update(meta);
  } catch(e) {
    if (esErrorPermisoFirebase(e)) { console.warn('Firebase rechazó los datos de la lista:', meta, e); return; }
    encolarSync('meta',lista.id,null,meta);
  }
}

// Escribe nombre, presupuesto y todos los productos con una actualización multi-ruta.
// A diferencia de reemplazar "items" completo, no borra productos que otra persona
// haya agregado mientras tanto. Lanza el error para que quien llama decida qué hacer.
async function escribirListaCompletaFirebase(lista) {
  await asegurarMembresiaLista(lista.id);
  const cambios = metaListaFirebase({ nombre: lista.nombre, presupuesto: obtenerPresupuestoLista(lista) });
  sanearItems(lista.items).forEach(item => { cambios[`items/${firebaseItemKey(item.id)}`] = item; });
  await db.ref('listas/' + lista.id).update(cambios);
}

function encolarListaCompleta(lista) {
  encolarSync('meta', lista.id, null, metaListaFirebase({ nombre: lista.nombre, presupuesto: obtenerPresupuestoLista(lista) }));
  sanearItems(lista.items).forEach(i => encolarSync('set-item', lista.id, i.id, i));
}

function limpiarPresenciaLista() {
  if (presenceRef) {
    try { presenceRef.off(); } catch(e) {}
  }
  presenceRef = null;
  if (myPresenceRef) {
    try { myPresenceRef.remove(); } catch(e) {}
  }
  myPresenceRef = null;
  listaIdSuscrito = null;
  ['badgeUsuariosVivo', 'badgeUsuariosLista'].forEach(id => {
    const badge = document.getElementById(id);
    if (badge) {
      badge.classList.remove('active-live');
      badge.style.display = 'none';
    }
  });
}

async function activarPresenciaLista(listaId) {
  if (!listaId || !navigator.onLine) return;
  try { await asegurarMembresiaLista(listaId); } catch(e) { return; }
  if (String(listaIdSuscrito) === String(listaId) && presenceRef && myPresenceRef) return;

  limpiarPresenciaLista();
  listaIdSuscrito = String(listaId);
  const ruta = `listas/${listaId}/presencia`;
  presenceRef = db.ref(ruta);
  myPresenceRef = db.ref(`${ruta}/${presenceSessionId}`);

  myPresenceRef.set({ conectadoEn: firebase.database.ServerValue.TIMESTAMP });
  try { myPresenceRef.onDisconnect().remove(); } catch(e) {}

  presenceRef.on('value', snapshot => {
    const datos = snapshot.val() || {};
    const cantidad = Object.keys(datos).length;
    registrarMaximoColaboracion(listaId, cantidad);
    ['badgeUsuariosVivo', 'badgeUsuariosLista'].forEach(id => {
      const badge = document.getElementById(id);
      if (!badge) return;
      if (cantidad > 0) {
        badge.innerHTML = `${iconoUI('users','ui-icon ui-icon-sm')}<span>${cantidad} en vivo</span>`;
        badge.style.display = 'inline-flex';
        badge.classList.add('active-live');
        badge.title = `${cantidad} persona${cantidad === 1 ? '' : 's'} usando esta misma lista ahora`;
      } else {
        badge.classList.remove('active-live');
        badge.style.display = 'none';
      }
    });
  });
}

async function escucharSincronizacionFirebase(listaId) {
  if (!listaId) return;
  if (dbListenerRef) dbListenerRef.off();
  try { await asegurarMembresiaLista(listaId); } catch(e) {
    console.error('Error al preparar la sincronización Firebase:', e);
    const codigo = e && e.code ? String(e.code) : '';
    mostrarToast(codigo ? `⚠️ Firebase: ${codigo}` : "⚠️ No se pudo iniciar la sincronización");
    return;
  }

  activarPresenciaLista(listaId);
  dbListenerRef = db.ref('listas/' + listaId);
  dbListenerRef.on('value', (snapshot) => {
    const datosNube = listaDesdeFirebase(snapshot.val());
    if (datosNube) {
      let listaLocal = coleccionListas.find(l => String(l.id) === String(listaId));
      if (!listaLocal) {
        listaLocal = { id: listaId, nombre: datosNube.nombre, items: datosNube.items, presupuesto: datosNube.presupuesto };
        coleccionListas.push(listaLocal);
      } else {
        listaLocal.nombre = datosNube.nombre;
        listaLocal.items = datosNube.items;
        listaLocal.presupuesto = datosNube.presupuesto;
      }
      guardarStorage();
      if (String(idListaActiva) === String(listaId)) renderizarProductos();
    }
  });
}

// Sincronización completa: se reserva para acciones masivas (recetas, IA, reutilizar, etc.).
// Las ediciones normales usan sincronización por producto para evitar que dos usuarios se pisen.
async function sincronizarConFirebase() {
  if (!idListaActiva) return;
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista || !lista.id) return;
  if (!navigator.onLine) { encolarListaCompleta(lista); return; }
  try {
    await escribirListaCompletaFirebase(lista);
  } catch(e) {
    // Se reintenta producto por producto: si uno fuera rechazado, el resto igual se guarda.
    encolarListaCompleta(lista);
    vaciarColaSincronizacion();
  }
}

window.addEventListener('beforeunload', () => {
  if (myPresenceRef) {
    try { myPresenceRef.remove(); } catch(e) {}
  }
});

async function compartirLista(lista) {
  if (!lista) return;
  vibrarConfirmacion();
  registrarEventoGA('list_share_started');
  mostrarToast("☁️ Guardando en la nube para sincronizar...");

  try {
    await escribirListaCompletaFirebase(lista);

    const urlCompartida = `${URL_PUBLICA_APP}?id=${encodeURIComponent(lista.id)}`;
    const mensajeTexto = `🛒 Te comparto la lista "${lista.nombre}" en vivo.\n🔑 Código de acceso: ${lista.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Lista: ${lista.nombre}`,
          text: mensajeTexto,
          url: urlCompartida
        });
        registrarEventoGA('list_shared', { method: 'native_share' });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    await copiarEnlace(urlCompartida, lista.nombre, lista.id);
  } catch (error) {
    console.warn('No se pudo compartir la lista:', error);
    mostrarToast("⚠️ Error al sincronizar en la nube");
  }
}

async function compartirListaActiva() {
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  await compartirLista(lista);
}

async function compartirListaDesdeTarjeta(event, id) {
  event?.stopPropagation();
  const lista = coleccionListas.find(l => String(l.id) === String(id));
  await compartirLista(lista);
}

async function copiarEnlace(url, nombreLista, codigo) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      mostrarToast(`📋 ¡Enlace copiado! Código: ${codigo}`);
    } else { throw new Error(); }
  } catch (err) {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Lista "${nombreLista}" (Código: ${codigo}): ${url}`)}`, '_blank');
  }
}

async function unirsePorCodigo() {
  vibrarConfirmacion();
  const input = document.getElementById('codigoUnirseInput');
  const codigo = normalizarCodigoLista(input.value);

  if (!codigo) {
    mostrarToast("⚠️ El código debe tener 6 letras o números");
    return;
  }

  if (!navigator.onLine) {
    mostrarToast("📶 Necesitas conexión a Internet para unirte a una lista");
    return;
  }

  mostrarToast("🔍 Buscando lista...");

  try {
    await obtenerUsuarioFirebase();
    // Solo el nombre es consultable antes de ser miembro. El contenido permanece protegido.
    const nombreSnapshot = await leerFirebase(db.ref(`listas/${codigo}/nombre`));
    if (!nombreSnapshot.exists()) {
      mostrarToast("❌ Código no encontrado o no existe");
      return;
    }
    await asegurarMembresiaLista(codigo);
    const snapshot = await leerFirebase(db.ref('listas/' + codigo));
    const datos = listaDesdeFirebase(snapshot.val());
    if (!datos) throw new Error('Lista no disponible');

    let local = coleccionListas.find(l => String(l.id) === String(codigo));
    if (!local) {
      coleccionListas.push({ id: codigo, nombre: datos.nombre, items: itemsDesdeFirebase(datos.items), presupuesto: Number(datos.presupuesto) || 0, ui:{filter:'pendientes',focus:false} });
    } else {
      local.nombre = datos.nombre;
      local.items = itemsDesdeFirebase(datos.items);
      local.presupuesto = Number(datos.presupuesto) || 0;
    }
    guardarStorage();
    input.value = '';
    abrirLista(codigo);
    mostrarToast(`🎉 ¡Conectado a "${datos.nombre}"!`);
    registrarEventoGA('list_joined');
    registrarListaEnCuenta(codigo, datos.nombre);
  } catch (e) {
    console.error('Error al unirse a la lista:', e);
    mostrarToast(e?.code === 'timeout' ? "📶 La nube no respondió. Revisa tu conexión e inténtalo de nuevo" : "⚠️ No se pudo acceder a esa lista");
  }
}

const URL_PUBLICA_APP = 'https://www.listadecompras.website/';

function normalizarCodigoLista(valor) {
  const codigo = String(valor || '').trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(codigo) ? codigo : '';
}

let sharedListLoadingOpenedAt = Number(window.__sharedListBootStartedAt) || 0;
function mostrarCargaListaCompartida() {
  const overlay = document.getElementById('sharedListLoadingOverlay');
  if (!overlay) return;
  if (!sharedListLoadingOpenedAt) sharedListLoadingOpenedAt = Date.now();
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}
async function ocultarCargaListaCompartida() {
  const overlay = document.getElementById('sharedListLoadingOverlay');
  if (!overlay) return;
  const startedAt = sharedListLoadingOpenedAt || Number(window.__sharedListBootStartedAt) || Date.now();
  const elapsed = Date.now() - startedAt;
  const wait = Math.max(0, 450 - elapsed);
  if (wait) await new Promise(resolve => setTimeout(resolve, wait));
  document.documentElement.classList.remove('shared-link-boot');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  sharedListLoadingOpenedAt = 0;
  window.__sharedListBootStartedAt = 0;
}

function obtenerCodigoListaDesdeURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return normalizarCodigoLista(urlParams.get('id'));
}

async function procesarListaRecibidaPorURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const idOriginal = (urlParams.get('id') || '').trim();
  const listaIdURL = obtenerCodigoListaDesdeURL();
  if (!listaIdURL) {
    if (idOriginal) {
      document.documentElement.classList.remove('shared-link-boot');
      window.__sharedListBootStartedAt = 0;
      window.history.replaceState({}, document.title, window.location.pathname);
      mostrarToast('⚠️ El enlace de la lista no es válido');
    }
    return false;
  }

  // Sin conexión: si la lista ya está en este teléfono se abre esa copia; si no, se avisa.
  const abrirCopiaLocal = async (motivo) => {
    await ocultarCargaListaCompartida();
    const copia = coleccionListas.find(l => String(l.id) === String(listaIdURL));
    if (copia) {
      abrirLista(listaIdURL);
      window.history.replaceState({}, document.title, window.location.pathname);
      mostrarToast(`📶 ${motivo} · se abrió la copia guardada de "${copia.nombre}"`);
      return true;
    }
    mostrarToast(`📶 ${motivo} · conéctate a Internet para abrir esta lista por primera vez`);
    return false;
  };
  if (!navigator.onLine) return await abrirCopiaLocal('Sin conexión');

  mostrarCargaListaCompartida();
  try {
    await obtenerUsuarioFirebase();
    const nombreSnapshot = await leerFirebase(db.ref(`listas/${listaIdURL}/nombre`));
    if (!nombreSnapshot.exists()) {
      await ocultarCargaListaCompartida();
      mostrarToast('❌ El enlace de la lista ya no es válido');
      return false;
    }

    await asegurarMembresiaLista(listaIdURL);
    const snapshot = await leerFirebase(db.ref('listas/' + listaIdURL));
    const datos = listaDesdeFirebase(snapshot.val());
    if (!datos) {
      await ocultarCargaListaCompartida();
      mostrarToast('❌ No se encontró la lista compartida');
      return false;
    }

    let local = coleccionListas.find(l => String(l.id) === String(listaIdURL));
    if (!local) {
      coleccionListas.push({ id: listaIdURL, nombre: datos.nombre || 'Mi Lista', items: itemsDesdeFirebase(datos.items), presupuesto: Number(datos.presupuesto) || 0, ui:{filter:'pendientes',focus:false} });
    } else {
      local.nombre = datos.nombre || local.nombre || 'Mi Lista';
      local.items = itemsDesdeFirebase(datos.items);
      local.presupuesto = Number(datos.presupuesto) || 0;
    }

    guardarStorage();
    abrirLista(listaIdURL);
    // Limpiamos el parámetro solo después de abrir correctamente la lista.
    window.history.replaceState({}, document.title, window.location.pathname);
    registrarEventoGA('list_joined', { method: 'shared_link' });
    registrarListaEnCuenta(listaIdURL, datos.nombre || 'Mi Lista');
    await ocultarCargaListaCompartida();
    mostrarToast(`🎉 ¡Lista "${datos.nombre || 'Mi Lista'}" conectada en vivo!`);
    return true;
  } catch(e) {
    console.error('Error al abrir lista compartida:', e);
    if (e?.code === 'timeout') return await abrirCopiaLocal('La nube no respondió');
    await ocultarCargaListaCompartida();
    mostrarToast('⚠️ No se pudo abrir la lista compartida');
    return false;
  }
}
