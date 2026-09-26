// Productos de la lista activa
function desmarcarTodos() {
  vibrarConfirmacion();
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista || !lista.items || lista.items.length === 0) return;

  lista.items.forEach(i => {
    i.comprado = false;
    sincronizarProductoFirebase(i);
  });
  guardarStorage();
  renderizarProductos();
  mostrarToast("🔄 Lista desmarcada para una nueva compra");
  registrarEventoGA('list_reused', { item_count: lista.items.length });
}

function limpiarProductosComprados() {
  vibrarConfirmacion();
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista || !lista.items) return;

  const comprados = lista.items.filter(i => i.comprado);
  if (comprados.length === 0) {
    mostrarToast("🧹 No hay productos comprados para borrar");
    return;
  }

  const copiaItemsPrevios = JSON.parse(JSON.stringify(lista.items));

  lista.items = lista.items.filter(i => !i.comprado);
  guardarStorage();
  comprados.forEach(i => eliminarProductoFirebase(i.id));
  renderizarProductos();

  registrarEventoGA('purchased_items_cleared', { item_count: comprados.length });
  mostrarToast(`🧹 ${comprados.length} comprados eliminados`, true, () => {
    const actual = coleccionListas.find(l => String(l.id) === String(idListaActiva));
    if (actual) {
      actual.items = copiaItemsPrevios;
      guardarStorage();
      comprados.forEach(i => sincronizarProductoFirebase(i));
      renderizarProductos();
      mostrarToast(`↩️ Eliminación de comprados deshecha`);
    }
  });
}

function agregarProducto() {
  if (!idListaActiva) return;
  vibrarConfirmacion();

  const input = document.getElementById('itemInput');
  const qtyInput = document.getElementById('itemQty');
  const priceInput = document.getElementById('itemPrice');
  
  const texto = input.value.trim();
  const cantidadAAgregar = parseInt(qtyInput.value) || 1;
  const precio = Math.round(parseFloat(priceInput.value) || 0);

  if (!texto) return;

  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (lista) {
    if (!lista.items) lista.items = [];

    const textoNormalizado = texto.toLowerCase().trim();
    const productoExistente = lista.items.find(i => i.texto.toLowerCase().trim() === textoNormalizado);

    if (productoExistente) {
      productoPendienteDuplicado = {
        productoExistente,
        cantidadAAgregar,
        precio
      };
      
      document.getElementById('duplicateDesc').innerHTML = `
        "<strong>${escapeHtml(productoExistente.texto)}</strong>" ya está en tu lista. ¿Quieres sumar ${cantidadAAgregar > 1 ? cantidadAAgregar + ' unidades' : 'una unidad'} más?
      `;
      document.getElementById('duplicateOverlay').classList.add('active');
      return;
    } else {
      if (precio > 0) guardarPrecioEnMemoria(texto, precio);
      const catInfo = clasificarProducto(texto);
      lista.items.push({
        id: nuevoIdProducto(),
        texto: texto,
        cantidad: cantidadAAgregar,
        precio: precio,
        categoriaId: catInfo.id,
        icono: catInfo.icono,
        comprado: false,
        precioOrigen: precio > 0 ? 'real' : 'sin-precio'
      });
      registrarUsoProducto(texto, 1);
      mostrarToast(`➕ "${texto}" agregado a la lista`);
      feedbackProductoAgregado(false);
      registrarEventoGA('product_added', { quantity: cantidadAAgregar, has_price: precio > 0 });
    }

    guardarStorage();
    const recienAgregado = lista.items[lista.items.length - 1];
    sincronizarProductoFirebase(recienAgregado);
    sincronizarMetaListaFirebase(lista);
    renderizarProductos();
    input.value = "";
    qtyInput.value = "1";
    priceInput.value = "";
  }
}

function confirmarSumarDuplicado() {
  vibrarConfirmacion();
  if (productoPendienteDuplicado) {
    const { productoExistente, cantidadAAgregar, precio } = productoPendienteDuplicado;
    
    productoExistente.cantidad = limitarCantidad((Number(productoExistente.cantidad) || 1) + cantidadAAgregar);
    if (precio > 0) {
      productoExistente.precio = precio;
      guardarPrecioEnMemoria(productoExistente.texto, precio);
    }

    guardarStorage();
    sincronizarProductoFirebase(productoExistente);
    renderizarProductos();

    mostrarToast(`💡 Se sumó +${cantidadAAgregar} a "${productoExistente.texto}" (Total: ${productoExistente.cantidad})`);
    feedbackProductoAgregado(false);

    document.getElementById('itemInput').value = "";
    document.getElementById('itemQty').value = "1";
    document.getElementById('itemPrice').value = "";
  }
  
  productoPendienteDuplicado = null;
  document.getElementById('duplicateOverlay').classList.remove('active');
}

function cancelarSumarDuplicado() {
  vibrarConfirmacion();
  productoPendienteDuplicado = null;
  document.getElementById('duplicateOverlay').classList.remove('active');
  mostrarToast("🚫 Se canceló agregar la unidad repetida");
}

async function editarProducto(prodId) {
  vibrarConfirmacion();
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista || !lista.items) return;

  const prod = lista.items.find(i => i.id === prodId);
  if (!prod) return;

  const resp = await abrirDialogoApp({
    icon: '🛒',
    title: 'Editar producto',
    message: 'Actualiza el nombre del producto. La categoría se ajustará automáticamente.',
    helperText: 'Ejemplo: Leche descremada, Pan integral, Tomate...',
    showInput: true,
    inputValue: prod.texto,
    inputPlaceholder: 'Nombre del producto',
    confirmText: 'Guardar cambios',
    cancelText: 'Cancelar',
    required: true,
    requiredMessage: 'Escribe el nombre del producto.'
  });

  if (resp.confirmed && resp.value) {
    prod.texto = resp.value.trim();
    const catInfo = clasificarProducto(prod.texto);
    prod.categoriaId = catInfo.id;
    prod.icono = catInfo.icono;

    guardarStorage();
    sincronizarProductoFirebase(prod);
    renderizarProductos();
    mostrarToast('✏️ Producto actualizado');
  }
}

function cambiarEstadoProducto(prodId) {
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista?.items) return;
  const prod = lista.items.find(i => i.id === prodId); if(!prod) return;
  const estadoAnterior = !!prod.comprado;
  const nuevoEstado = !estadoAnterior;
  if (nuevoEstado) feedbackProductoComprado(); else vibrarConfirmacion();
  const tokenKey = `${lista.id}:${prod.id}`;
  let tokenEstadistica = null;
  const finalizar = () => {
    prod.comprado = nuevoEstado;
    if (nuevoEstado) {
      registrarEventoGA('product_marked_bought');
      registrarUsoProducto(prod.texto, 2);
      tokenEstadistica = registrarProductoEnEstadisticas(lista, prod);
      if (tokenEstadistica) tokensCompraSesion.set(tokenKey, tokenEstadistica);
    } else if (tokensCompraSesion.has(tokenKey)) {
      revertirProductoEnEstadisticas(tokensCompraSesion.get(tokenKey));
      tokensCompraSesion.delete(tokenKey);
    }
    guardarStorage(); sincronizarProductoFirebase(prod); renderizarProductos();
    if (nuevoEstado) guardarCompraEnHistorial(lista);
    const accionTxt = nuevoEstado ? 'comprado' : 'pendiente';
    const iconoTxt = nuevoEstado ? '✅' : '▫️';
    mostrarToast(`${iconoTxt} "${prod.texto}" marcado como ${accionTxt}`, true, () => {
      const actual = coleccionListas.find(l => String(l.id) === String(idListaActiva));
      const itemRevertir = actual?.items?.find(i => i.id === prodId);
      if(itemRevertir){
        itemRevertir.comprado = estadoAnterior;
        if (nuevoEstado && tokenEstadistica) { revertirProductoEnEstadisticas(tokenEstadistica); tokensCompraSesion.delete(tokenKey); }
        guardarStorage(); sincronizarProductoFirebase(itemRevertir); renderizarProductos(); mostrarToast(`↩️ Cambio en "${itemRevertir.texto}" deshecho`);
      }
    });
  };
  const el=document.querySelector(`li[data-item-id="${prodId}"]`);
  if(nuevoEstado && el && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){el.classList.add('item-buying');setTimeout(finalizar,270);} else finalizar();
}

function cambiarCantidadProducto(prodId, cambio) {
  vibrarConfirmacion();
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (lista && lista.items) {
    const prod = lista.items.find(i => i.id === prodId);
    if (prod) {
      prod.cantidad = limitarCantidad((Number(prod.cantidad) || 1) + cambio);
      guardarStorage();
      sincronizarProductoFirebase(prod);
      renderizarProductos();
    }
  }
}

function actualizarPrecioProducto(prodId, nuevoPrecio) {
  registrarEventoGA('product_price_edited');
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (lista && lista.items) {
    const prod = lista.items.find(i => i.id === prodId);
    if (prod) {
      const valorValido = Math.max(0, Math.round(parseFloat(nuevoPrecio) || 0));
      prod.precio = valorValido;
      prod.precioOrigen = valorValido > 0 ? 'real' : 'sin-precio';
      if (valorValido > 0) {
        guardarPrecioEnMemoria(prod.texto, valorValido);
      }
      guardarStorage();
      sincronizarProductoFirebase(prod);
      renderizarProductos();
    }
  }
}

function eliminarProducto(prodId) {
  vibrarConfirmacion();
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (lista && lista.items) {
    const prodIndex = lista.items.findIndex(i => i.id === prodId);
    if (prodIndex !== -1) {
      const itemEliminado = lista.items[prodIndex];

      lista.items.splice(prodIndex, 1);
      guardarStorage();
      eliminarProductoFirebase(itemEliminado.id);
      renderizarProductos();

      mostrarToast(`🗑️ "${itemEliminado.texto}" borrado`, true, () => {
        const actual = coleccionListas.find(l => String(l.id) === String(idListaActiva));
        if (actual && actual.items) {
          actual.items.splice(prodIndex, 0, itemEliminado);
          guardarStorage();
          sincronizarProductoFirebase(itemEliminado);
          renderizarProductos();
          mostrarToast(`↩️ "${itemEliminado.texto}" restaurado`);
        }
      });
    }
  }
}

function actualizarBotonesFiltroFocus() {
  const mapa = {
    pendientes: 'focusFilterPendientes',
    comprados: 'focusFilterComprados',
    todos: 'focusFilterTodos'
  };
  Object.entries(mapa).forEach(([valor, id]) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', filtroProductos === valor);
  });

  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (lista?.items) {
    const pendientes = lista.items.filter(i => !i.comprado).length;
    const comprados = lista.items.filter(i => i.comprado).length;
    const p = document.getElementById('focusFilterPendientes');
    const c = document.getElementById('focusFilterComprados');
    const t = document.getElementById('focusFilterTodos');
    if (p) p.textContent = `Por comprar (${pendientes})`;
    if (c) c.textContent = `Comprados (${comprados})`;
    if (t) t.textContent = `Todos (${pendientes + comprados})`;
  }
}

function cambiarFiltroFocus(filtro) {
  if (!['pendientes','comprados','todos'].includes(filtro)) return;
  cambiarFiltro(filtro);
  actualizarBotonesFiltroFocus();
}

function cambiarFiltro(filtro) {
  vibrarConfirmacion();
  filtroProductos = filtro;
  const listaEstado = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (listaEstado) { listaEstado.ui = { ...(listaEstado.ui||{}), filter: filtro }; guardarStorage(); }
  localStorage.setItem('filtroProductos_v1', filtro);
  document.getElementById('subTabPendientes')?.classList.toggle('active', filtro === 'pendientes');
  document.getElementById('subTabComprados')?.classList.toggle('active', filtro === 'comprados');
  actualizarBotonesFiltroFocus();
  renderizarProductos();
}

function filtrarProductosPorBusqueda() {
  const searchInput = document.getElementById('searchInput');
  const btnClear = document.getElementById('btnClearSearch');
  textoBusquedaActual = searchInput.value.toLowerCase().trim();

  btnClear.style.display = textoBusquedaActual ? 'inline-flex' : 'none';
  renderizarProductos();
}

function limpiarBusqueda() {
  const searchInput = document.getElementById('searchInput');
  searchInput.value = '';
  filtrarProductosPorBusqueda();
}

function actualizarPresupuestoYProgreso(lista) {
  let gastado = 0;
  let total = 0;
  let estimadoConMemoria = 0;
  let productosEstimados = 0;
  let compradosCount = 0;
  const items = lista.items || [];
  const totalItems = items.length;

  items.forEach(item => {
    const cantidad = Math.max(1, Number(item.cantidad) || 1);
    const precioActual = Math.max(0, Math.round(Number(item.precio) || 0));
    const precioMemoria = precioActual > 0 ? 0 : obtenerUltimoPrecio(item.texto);
    const precioEstimacion = precioActual || precioMemoria || 0;
    const subtotal = cantidad * precioActual;
    total += subtotal;
    estimadoConMemoria += cantidad * precioEstimacion;
    if (!precioActual && precioMemoria > 0) productosEstimados++;
    if (item.comprado) {
      gastado += subtotal;
      compradosCount++;
    }
  });

  document.getElementById('valGastado').textContent = formatoCLP.format(gastado);
  document.getElementById('valTotal').textContent = formatoCLP.format(productosEstimados > 0 ? estimadoConMemoria : total);

  const boxEstimacion = document.getElementById('estimacionMemoriaBox');
  if (boxEstimacion) {
    if (productosEstimados > 0) {
      boxEstimacion.style.display = 'block';
      boxEstimacion.innerHTML = `🧠 Con tus precios recordados, esta compra se estima en <strong>${formatoCLP.format(estimadoConMemoria)}</strong>. Se estimaron ${productosEstimados} producto${productosEstimados === 1 ? '' : 's'} sin precio actual.`;
    } else {
      boxEstimacion.style.display = 'none';
      boxEstimacion.innerHTML = '';
    }
  }

  const panelProgreso = document.getElementById('panelProgreso');
  const fillProgreso = document.getElementById('fillProgreso');

  const limitePresupuesto = obtenerPresupuestoLista(lista);
  const valDisponible = document.getElementById('valDisponible');
  if (valDisponible) {
    const basePresupuesto = productosEstimados > 0 ? estimadoConMemoria : gastado;
    valDisponible.textContent = limitePresupuesto > 0
      ? formatoCLP.format(limitePresupuesto - basePresupuesto)
      : 'Sin tope';
    valDisponible.style.color = limitePresupuesto > 0 && basePresupuesto > limitePresupuesto ? 'var(--danger)' : '';
  }

  const referenciaLimite = productosEstimados > 0 ? estimadoConMemoria : (total > 0 ? total : gastado);
  const budgetMsg = document.getElementById('budgetStatusMessage');
  if (budgetMsg) {
    if (limitePresupuesto > 0) {
      const diferencia = limitePresupuesto - referenciaLimite;
      budgetMsg.style.display = 'block'; budgetMsg.className = 'budget-status-message ' + (diferencia >= 0 ? 'good' : 'warn');
      budgetMsg.textContent = diferencia >= 0 ? `💰 Te quedan ${formatoCLP.format(diferencia)} de tu tope` : `⚠️ Vas ${formatoCLP.format(Math.abs(diferencia))} sobre tu tope${productosEstimados ? ' según la estimación actual' : ''}`;
    } else { budgetMsg.style.display='none'; budgetMsg.textContent=''; }
  }
  if (limitePresupuesto > 0) {
    const ratioPresupuesto = limitePresupuesto > 0 ? referenciaLimite / limitePresupuesto : 0;
    const estadoAnterior = estadoSonidoPresupuesto.get(String(lista.id)) || 'normal';
    let estadoNuevo = 'normal';
    if (ratioPresupuesto > 1) estadoNuevo = 'excedido';
    else if (ratioPresupuesto >= 0.9) estadoNuevo = 'cerca';
    else if (ratioPresupuesto < 0.85) estadoNuevo = 'normal';
    else estadoNuevo = estadoAnterior;

    if (estadoNuevo !== estadoAnterior) {
      if (estadoNuevo === 'cerca') reproducirSonidoAlertaPresupuesto('cerca');
      if (estadoNuevo === 'excedido') reproducirSonidoAlertaPresupuesto('excedido');
      estadoSonidoPresupuesto.set(String(lista.id), estadoNuevo);
    }
  } else {
    estadoSonidoPresupuesto.delete(String(lista.id));
  }

  if (limitePresupuesto > 0 && referenciaLimite > limitePresupuesto) {
    panelProgreso.classList.add('exceeded');
    fillProgreso.classList.add('exceeded');
    document.getElementById('txtProgresoEstado').textContent = `🚨 Presupuesto excedido por ${formatoCLP.format(referenciaLimite - limitePresupuesto)}${productosEstimados ? ' (estimado)' : ''}`;
  } else {
    panelProgreso.classList.remove('exceeded');
    fillProgreso.classList.remove('exceeded');
    document.getElementById('txtProgresoEstado').textContent = `${compradosCount} de ${totalItems} productos en el carro`;
  }

  const pct = totalItems > 0 ? Math.round((compradosCount / totalItems) * 100) : 0;
  document.getElementById('txtProgresoPorcentaje').textContent = `${pct}%`;
  fillProgreso.style.width = `${pct}%`;
}

function completarPreciosDesdeMemoria() {
  vibrarConfirmacion();
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista || !Array.isArray(lista.items) || !lista.items.length) {
    mostrarToast('🧠 No hay productos para completar');
    return;
  }
  let completados = 0;
  const modificados = [];
  lista.items.forEach(item => {
    if (!(Number(item.precio) > 0)) {
      const recordado = obtenerUltimoPrecio(item.texto);
      if (recordado > 0) {
        item.precio = recordado;
        item.precioOrigen = 'estimado';
        modificados.push(item);
        completados++;
      }
    }
  });
  if (!completados) {
    mostrarToast('🧠 No encontré precios recordados faltantes');
    return;
  }
  guardarStorage();
  modificados.forEach(i => sincronizarProductoFirebase(i));
  renderizarProductos();
  mostrarToast(`🧠 ${completados} precio${completados === 1 ? '' : 's'} completado${completados === 1 ? '' : 's'} desde tu memoria`);
}

function renderizarProductos(animarEntrada = false) {
  const contenedor = document.getElementById('contenedorProductosCategorizados');
  const titulo = document.getElementById('tituloListaActiva');
  const badgeCod = document.getElementById('badgeCodigoLista');

  contenedor.innerHTML = "";

  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista) return;

  titulo.textContent = lista.nombre;
  badgeCod.textContent = `CÓDIGO: ${lista.id}`;
  actualizarPresupuestoYProgreso(lista);
  if (modoFocusActivo) actualizarBotonesFiltroFocus();

  const items = lista.items || [];
  const filtrados = items.filter(item => {
    const cumpleEstado = filtroProductos === 'todos' ? true : (filtroProductos === 'pendientes' ? !item.comprado : item.comprado);
    const cumpleBusqueda = !textoBusquedaActual || item.texto.toLowerCase().includes(textoBusquedaActual);
    return cumpleEstado && cumpleBusqueda;
  });

  if (filtrados.length === 0) {
    if (textoBusquedaActual) {
      contenedor.innerHTML = `<p class="empty-msg">No se encontraron productos para "${escapeHtml(textoBusquedaActual)}"</p>`;
    } else {
      const msgVacio = filtroProductos === 'pendientes' ? '¡Todo comprado!' : (filtroProductos === 'comprados' ? 'No hay productos comprados.' : 'Esta lista todavía no tiene productos.');
      contenedor.innerHTML = `<p class="empty-msg">${msgVacio}</p>`;
    }
    return;
  }

  CATEGORIAS.forEach((cat, index) => {
    const itemsDeCat = filtrados.filter(i => (i.categoriaId || clasificarProducto(i.texto).id) === cat.id);

    if (itemsDeCat.length > 0) {
      const header = document.createElement('div');
      header.className = 'category-header';
      header.innerHTML = `
        <div class="category-title">
          <span>${cat.icono}</span> <span>${cat.nombre}</span>
        </div>
        <div class="category-nav-btns">
          <button class="btn-cat-order" onclick="moverCategoria(${index}, -1)" title="Subir pasillo">▲</button>
          <button class="btn-cat-order" onclick="moverCategoria(${index}, 1)" title="Bajar pasillo">▼</button>
        </div>
      `;
      contenedor.appendChild(header);
      if (animarEntrada) prepararAnimacionEscalonada(header, index);

      const ul = document.createElement('ul');

      itemsDeCat.forEach((item, indiceItem) => {
        const li = document.createElement('li');
        li.dataset.itemId = String(item.id);
        const subtotal = item.cantidad * (item.precio || 0);

        let botonAccionPrincipal = '';
        if (!item.comprado) {
          botonAccionPrincipal = `
            <button class="btn-check-action" onclick="cambiarEstadoProducto(${item.id})" title="Marcar como comprado">
              ✓
            </button>
          `;
        } else {
          botonAccionPrincipal = `
            <button class="btn-uncheck-action" onclick="cambiarEstadoProducto(${item.id})" title="Devolver a Por Comprar">
              ↩️
            </button>
          `;
        }

        li.innerHTML = `
          <div class="product-list-item">
            <div class="item-main-details ${item.comprado ? 'comprado' : ''}" onclick="cambiarEstadoProducto(${item.id})">
              <div class="item-name-row">
                <span class="item-name">${escapeHtml(item.texto)}</span>
              </div>
              <div class="item-price-status">${subtotal > 0 ? `Subtotal: ${formatoCLP.format(subtotal)}` : 'Sin precio'}${item.precio > 0 ? (item.precioOrigen === 'estimado' ? '<span class="estimated-price-tag">Estimado</span>' : '<span class="real-price-tag">Real</span>') : ''}</div>
              ${(() => {
                const mem = obtenerRegistroPrecio(item.texto);
                if (!mem || !Number(mem.ultimoPrecio)) return '';
                const tendencia = obtenerTendenciaPrecio(mem);
                return `<div class="price-memory-row"><button class="price-memory-badge" onclick="event.stopPropagation(); abrirHistorialPrecio(decodeURIComponent('${encodeURIComponent(String(item.texto))}'))" title="Ver historial de precios">🧠 Último: ${formatoCLP.format(Number(mem.ultimoPrecio))} · ${formatearFechaPrecio(mem.fechaUltimoPrecio)} ${tendencia}</button></div>`;
              })()}
            </div>
            
            <div class="item-controls-right">
              <input type="number" class="inline-price ${item.precioOrigen === 'estimado' ? 'price-estimated' : ''}" value="${item.precio || ''}" placeholder="$ CLP" 
                     onchange="actualizarPrecioProducto(${item.id}, this.value)" title="Precio CLP" aria-label="Precio de ${escapeHtml(item.texto)} en pesos chilenos">

              <div class="qty-controls">
                <button class="btn-qty" onclick="cambiarCantidadProducto(${item.id}, -1)" aria-label="Restar una unidad a ${escapeHtml(item.texto)}">-</button>
                <span style="font-size:0.85rem; font-weight:800; width:18px; text-align:center;">${item.cantidad}</span>
                <button class="btn-qty" onclick="cambiarCantidadProducto(${item.id}, 1)" aria-label="Sumar una unidad a ${escapeHtml(item.texto)}">+</button>
              </div>

              <button class="btn-action-icon" onclick="editarProducto(${item.id})" title="Editar producto" aria-label="Editar producto">${iconoUI('edit')}</button>

              ${botonAccionPrincipal}

              <button class="btn-action-icon" onclick="eliminarProducto(${item.id})" title="Borrar producto">✕</button>
            </div>
          </div>
        `;
        ul.appendChild(li);
        if (animarEntrada) prepararAnimacionEscalonada(li, indiceItem + 1);
      });

      contenedor.appendChild(ul);
    }
  });
}
