// Crear, abrir, editar y eliminar listas
async function crearNuevaLista() {
  vibrarConfirmacion();
  const input = document.getElementById('nombreNuevaLista');
  const nombre = input.value.trim().slice(0, 100);
  if (!nombre || crearNuevaLista.enCurso) return;

  crearNuevaLista.enCurso = true;
  let nuevoCodigo;
  try { nuevoCodigo = await generarCodigoDisponible(); }
  finally { crearNuevaLista.enCurso = false; }
  const nuevaLista = { id: nuevoCodigo, nombre: nombre, items: [], presupuesto: 0 };
  coleccionListas.push(nuevaLista);
  guardarStorage();
  input.value = "";
  abrirLista(nuevaLista.id);
  if (navigator.onLine) {
    try { await asegurarMembresiaLista(nuevaLista.id); } catch(e) {}
  }
  sincronizarConFirebase();
  mostrarToast(`✨ Lista creada (Código: ${nuevoCodigo})`);
  registrarEventoGA('list_created');
  registrarListaEnCuenta(nuevaLista.id, nuevaLista.nombre);
}

async function editarNombreLista(e, id) {
  e.stopPropagation();
  vibrarConfirmacion();
  const lista = coleccionListas.find(l => String(l.id) === String(id));
  if (!lista) return;

  const resp = await abrirDialogoApp({
    icon: '✏️',
    title: 'Editar nombre de la lista',
    message: 'Cambia el nombre para identificar mejor tu lista.',
    helperText: 'Ejemplo: Compra mensual, Feria, Cumpleaños...',
    showInput: true,
    inputValue: lista.nombre,
    inputPlaceholder: 'Nombre de la lista',
    confirmText: 'Guardar',
    cancelText: 'Cancelar',
    required: true,
    requiredMessage: 'Escribe un nombre para la lista.'
  });

  if (resp.confirmed && resp.value) {
    lista.nombre = resp.value.trim().slice(0, 100);
    guardarStorage();
    // Solo nombre y presupuesto: reescribir los productos podría pisar cambios de otras personas.
    sincronizarMetaListaFirebase(lista);
    renderizarListas();
    renderizarInicio();
    if (String(idListaActiva) === String(id)) renderizarProductos();
    mostrarToast('✏️ Nombre de la lista actualizado');
  }
}

function abrirLista(id) {
  vibrarConfirmacion();
  const lista = coleccionListas.find(l => String(l.id) === String(id));
  if (!lista) {
    localStorage.removeItem('ultimaListaActiva_v1');
    mostrarToast('⚠️ Esa lista ya no está disponible');
    renderizarInicio();
    return;
  }
  idListaActiva = lista.id;
  aplicarOrdenCategoriasLista(lista);
  filtroProductos = lista?.ui?.filter || 'pendientes';
  modoFocusActivo = !!lista?.ui?.focus;
  localStorage.setItem('ultimaListaActiva_v1', String(id));
  verSeccion('lista-activa');
  if (!['pendientes','comprados','todos'].includes(filtroProductos)) filtroProductos = 'pendientes';
  document.getElementById('subTabPendientes')?.classList.toggle('active', filtroProductos === 'pendientes');
  document.getElementById('subTabComprados')?.classList.toggle('active', filtroProductos === 'comprados');
  actualizarBotonesFiltroFocus();
  const app=document.getElementById('appContainer'), btn=document.getElementById('btnToggleFocus');
  app?.classList.toggle('focus-mode-active', modoFocusActivo); if(btn) btn.innerHTML = `${iconoUI('target')}<span>${modoFocusActivo ? 'Salir Focus' : 'Modo Focus'}</span>`;
  const buscadorFocus = document.getElementById('searchInput');
  if (buscadorFocus) buscadorFocus.placeholder = modoFocusActivo ? 'Buscar producto en Focus...' : 'Buscar en esta lista...';
}

async function eliminarLista(e, id) {
  e.stopPropagation(); vibrarConfirmacion();
  const index = coleccionListas.findIndex(l => String(l.id) === String(id)); if (index === -1) return;
  const objetivo = coleccionListas[index];
  const resp = await abrirDialogoApp({icon:'🗑️',title:'Eliminar lista',message:`¿Quieres eliminar <strong>${escapeHtml(objetivo.nombre)}</strong> de este dispositivo?`,helperText:'Podrás deshacer inmediatamente desde el aviso inferior.',confirmText:'Eliminar',cancelText:'Cancelar',danger:true});
  if(!resp.confirmed) return;
  const eliminada = JSON.parse(JSON.stringify(coleccionListas[index]));
  coleccionListas.splice(index, 1);
  if (String(idListaActiva) === String(id)) {
    idListaActiva = null;
    localStorage.removeItem('ultimaListaActiva_v1');
    // Detenemos la escucha de esa lista antes de borrarla localmente.
    // De lo contrario, el listener de Firebase puede volver a insertarla en coleccionListas.
    if (dbListenerRef) { try { dbListenerRef.off(); } catch(e) {} dbListenerRef = null; }
    limpiarPresenciaLista();
  }
  guardarStorage();
  // Importante: no borramos la lista global de Firebase porque puede estar compartida
  // con otras personas. La quitamos del índice privado de esta cuenta para que no
  // vuelva a descargarse al abrir la app. Si estamos offline queda una eliminación
  // pendiente local que se procesa al recuperar conexión.
  eliminarListaDeCuenta(id);
  renderizarListas();
  renderizarInicio();
  mostrarToast(`🗑️ "${eliminada.nombre}" eliminada`, true, () => {
    coleccionListas.splice(Math.min(index, coleccionListas.length), 0, eliminada);
    guardarStorage();
    registrarListaEnCuenta(eliminada.id, eliminada.nombre);
    renderizarListas();
    renderizarInicio();
    mostrarToast('↩️ Lista restaurada');
  });
}

function renderizarListas() {
  const contenedor = document.getElementById('contenedorListas');
  contenedor.innerHTML = "";
  if (coleccionListas.length === 0) {
    contenedor.innerHTML = '<p class="empty-msg">No tienes listas creadas. ¡Crea una arriba o únete con un código!</p>';
    return;
  }
  coleccionListas.forEach((lista, indiceLista) => {
    const pendientes = (lista.items || []).filter(i => !i.comprado).length;
    const div = document.createElement('div');
    div.className = 'list-card';
    div.onclick = () => abrirLista(lista.id);
    div.innerHTML = `
      <div class="list-info">
        <h4>${iconoUI('list')}<span>${escapeHtml(lista.nombre)}</span></h4>
        <p>${pendientes} pendientes de ${(lista.items || []).length} productos</p>
        <span class="badge-code">CÓDIGO: ${lista.id}</span>
      </div>
      <div class="card-actions">
        <button class="btn-action-icon" onclick="compartirListaDesdeTarjeta(event, '${lista.id}')" title="Compartir lista" aria-label="Compartir ${escapeHtml(lista.nombre)}"><svg class="icon-share-classic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4"></path><path d="M8 8l4-4 4 4"></path><path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"></path></svg></button>
        <button class="btn-action-icon" onclick="editarNombreLista(event, '${lista.id}')" title="Editar nombre" aria-label="Editar nombre">${iconoUI('edit')}</button>
        <button class="btn-action-icon" onclick="eliminarLista(event, '${lista.id}')" title="Eliminar lista" aria-label="Eliminar lista">${iconoUI('trash')}</button>
      </div>
    `;
    contenedor.appendChild(div);
    prepararAnimacionEscalonada(div, indiceLista);
  });
}
