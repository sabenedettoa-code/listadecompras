// Asistente ListAI
/* LÓGICA DEL ASISTENTE LISTAI */
function abrirModalIA() {
  vibrarConfirmacion();

  const select = document.getElementById('selectListaDestinoIA');
  select.innerHTML = '';

  if (coleccionListas.length === 0) {
    const nuevoCodigo = generarCodigoUnico();
    const nuevaLista = { id: nuevoCodigo, nombre: "Mi Lista de Compras", items: [], presupuesto: 0 };
    coleccionListas.push(nuevaLista);
    idListaActiva = nuevoCodigo;
    guardarStorage();
  }

  coleccionListas.forEach(l => {
    const option = document.createElement('option');
    option.value = l.id;
    option.textContent = `${l.nombre} (${(l.items || []).length} items)`;
    if (String(l.id) === String(idListaActiva)) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  volverEditarSolicitudIA(true);
  document.getElementById('iaOverlay').classList.add('active');
}

function cerrarModalIA() {
  vibrarConfirmacion();
  document.getElementById('iaOverlay').classList.remove('active');
  if (reconocimientoVozIA) {
    try { reconocimientoVozIA.stop(); } catch(e){}
    reconocimientoVozIA = null;
  }
  quitarImagenIA();
}

function toggleDictadoVozIA() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    mostrarToast("⚠️ Tu navegador no soporta entrada de voz");
    return;
  }

  const btnMic = document.getElementById('btnMicIA');
  const inputTexto = document.getElementById('promptIAInput');

  if (reconocimientoVozIA) {
    reconocimientoVozIA.stop();
    reconocimientoVozIA = null;
    btnMic.style.background = "#e0e7ff";
    btnMic.innerHTML = "🎙️";
    return;
  }

  reconocimientoVozIA = new SpeechRecognition();
  reconocimientoVozIA.lang = 'es-CL';
  reconocimientoVozIA.continuous = false;
  reconocimientoVozIA.interimResults = false;

  btnMic.style.background = "#ef4444";
  btnMic.innerHTML = "🛑";
  mostrarToast("🎤 Escuchando... habla ahora");

  reconocimientoVozIA.onresult = (event) => {
    const textoTranscrito = event.results[0][0].transcript;
    inputTexto.value = inputTexto.value ? `${inputTexto.value} ${textoTranscrito}` : textoTranscrito;
    mostrarToast("✨ Voz convertida a texto");
  };

  reconocimientoVozIA.onerror = (event) => {
    console.error("Error en reconocimiento de voz ListAI:", event.error);
    mostrarToast("⚠️ No se pudo entender el audio");
  };

  reconocimientoVozIA.onend = () => {
    reconocimientoVozIA = null;
    btnMic.style.background = "#e0e7ff";
    btnMic.innerHTML = "🎙️";
  };

  reconocimientoVozIA.start();
}

function procesarImagenBase64(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      imagenBase64Cargada = e.target.result;
      document.getElementById('imgPreview').src = imagenBase64Cargada;
      document.getElementById('previewImagenContenedor').style.display = 'block';
      mostrarToast("📸 Imagen cargada para ListAI");
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function quitarImagenIA() {
  imagenBase64Cargada = null;
  const inputImg = document.getElementById('inputImagenIA');
  if (inputImg) inputImg.value = '';
  const previewContainer = document.getElementById('previewImagenContenedor');
  if (previewContainer) previewContainer.style.display = 'none';
  const imgPrev = document.getElementById('imgPreview');
  if (imgPrev) imgPrev.src = '';
}

function usarPromptRapidoIA(texto) {
  const input = document.getElementById('promptIAInput');
  input.value = texto;
  input.focus();
  vibrarConfirmacion();
}

function construirPromptEnriquecidoIA(promptOriginal, targetId) {
  const lista = coleccionListas.find(l => String(l.id) === String(targetId));
  const objetivo = document.getElementById('selectObjetivoIA')?.value || 'crear';
  const personas = Math.max(1, parseInt(document.getElementById('personasIA')?.value) || 2);
  const preferencias = (document.getElementById('preferenciasIA')?.value || '').trim();
  const presupuesto = Number(lista?.presupuesto || 0);
  const existentes = (lista?.items || []).filter(i => !i.comprado).map(i => i.texto).slice(0, 80);
  const objetivoTxt = {
    crear: 'crear o completar una lista de compras práctica',
    presupuesto: 'proponer una compra que respete el presupuesto disponible',
    menu: 'crear un menú y convertirlo en una lista consolidada de ingredientes',
    boleta: 'leer la imagen y extraer productos, cantidades y precios con precisión'
  }[objetivo] || 'crear una lista de compras';

  let contexto = `\n\nCONTEXTO DE LISTAI:\n- Objetivo: ${objetivoTxt}.\n- Personas: ${personas}.`;
  if (preferencias) contexto += `\n- Preferencias/restricciones: ${preferencias}.`;
  if (presupuesto > 0) contexto += `\n- Tope de presupuesto de la lista: $${Math.round(presupuesto)} CLP. Procura no superarlo cuando sea pertinente.`;
  if (existentes.length) contexto += `\n- Productos pendientes que ya existen: ${existentes.join(', ')}. Evita repetirlos salvo que el usuario lo pida o sea necesario aumentar cantidad.`;
  contexto += `\n- Devuelve productos concretos de supermercado, con cantidades razonables y precios solo si realmente pueden extraerse de la imagen o fueron entregados por el usuario. No inventes precios exactos.\n- Usa nombres breves y claros, adecuados para una lista de compras en Chile.`;
  return `${promptOriginal || 'Analiza la imagen adjunta y genera los productos correspondientes.'}${contexto}`;
}

function normalizarProductosIA(productos) {
  if (!Array.isArray(productos)) return [];
  return productos.map((prod, idx) => ({
    idTmp: `ia_${Date.now()}_${idx}_${Math.random().toString(36).slice(2,6)}`,
    texto: String(prod?.texto || prod?.nombre || '').trim(),
    cantidad: Math.max(1, parseInt(prod?.cantidad) || 1),
    precio: Math.max(0, parseInt(prod?.precio) || 0)
  })).filter(p => p.texto).slice(0, 100);
}

function renderizarPreviewIA() {
  const cont = document.getElementById('listaPreviewIA');
  const panelSolicitud = document.getElementById('panelSolicitudIA');
  const panelPreview = document.getElementById('previewResultadoIA');
  if (!cont || !panelPreview || !panelSolicitud) return;
  panelSolicitud.style.display = 'none';
  panelPreview.classList.add('active');
  document.getElementById('mensajeResultadoIA').textContent = mensajeIAPendiente || 'Revísala antes de agregarla. Puedes cambiar nombres, cantidades o precios.';
  cont.innerHTML = '';
  resultadoIAPendiente.forEach((p, index) => {
    const row = document.createElement('div');
    row.className = 'listai-preview-item';
    row.innerHTML = `
      <input aria-label="Producto" value="${escapeHtml(p.texto)}" oninput="actualizarItemPreviewIA(${index}, 'texto', this.value)">
      <input aria-label="Cantidad" class="ia-qty" type="number" min="1" max="99" value="${p.cantidad}" oninput="actualizarItemPreviewIA(${index}, 'cantidad', this.value)">
      <input aria-label="Precio" class="ia-price" type="number" min="0" step="1" value="${p.precio || ''}" placeholder="$" oninput="actualizarItemPreviewIA(${index}, 'precio', this.value)">
      <button type="button" class="listai-remove" aria-label="Quitar producto" onclick="quitarItemPreviewIA(${index})">✕</button>`;
    cont.appendChild(row);
  });
  actualizarResumenPreviewIA();
}

function actualizarItemPreviewIA(index, campo, valor) {
  const p = resultadoIAPendiente[index];
  if (!p) return;
  if (campo === 'texto') p.texto = String(valor).trimStart();
  if (campo === 'cantidad') p.cantidad = Math.max(1, parseInt(valor) || 1);
  if (campo === 'precio') p.precio = Math.max(0, parseInt(valor) || 0);
  actualizarResumenPreviewIA();
}

function quitarItemPreviewIA(index) {
  resultadoIAPendiente.splice(index, 1);
  renderizarPreviewIA();
}

function actualizarResumenPreviewIA() {
  const total = resultadoIAPendiente.reduce((acc,p) => acc + (Number(p.precio)||0)*(Number(p.cantidad)||1), 0);
  const conPrecio = resultadoIAPendiente.filter(p => Number(p.precio) > 0).length;
  document.getElementById('resumenItemsIA').textContent = `${resultadoIAPendiente.length} producto${resultadoIAPendiente.length===1?'':'s'}`;
  document.getElementById('resumenTotalIA').textContent = conPrecio ? `Con precios: ${formatoCLP.format(total)}` : 'Sin precios capturados';
}

function volverEditarSolicitudIA(silencioso=false) {
  resultadoIAPendiente = [];
  mensajeIAPendiente = '';
  targetIdIAPendiente = null;
  const panelSolicitud = document.getElementById('panelSolicitudIA');
  const panelPreview = document.getElementById('previewResultadoIA');
  if (panelSolicitud) panelSolicitud.style.display = 'block';
  if (panelPreview) panelPreview.classList.remove('active');
  if (!silencioso) document.getElementById('promptIAInput')?.focus();
}

function confirmarResultadoIA() {
  vibrarConfirmacion();
  const lista = coleccionListas.find(l => String(l.id) === String(targetIdIAPendiente));
  if (!lista) { mostrarToast('⚠️ Lista destino no encontrada'); return; }
  const validos = resultadoIAPendiente.filter(p => p.texto.trim());
  if (!validos.length) { mostrarToast('⚠️ No quedan productos para agregar'); return; }
  if (!Array.isArray(lista.items)) lista.items = [];

  const modo = document.getElementById('modoCargaIA')?.value || 'sumar';
  // La sincronización masiva ya no reemplaza todos los productos en la nube, así que los
  // pendientes que se quitan aquí se borran en Firebase uno por uno más abajo.
  const quitados = modo === 'reemplazar-pendientes' ? lista.items.filter(i => !i.comprado) : [];
  if (quitados.length) lista.items = lista.items.filter(i => i.comprado);

  let agregados = 0, actualizados = 0;
  validos.forEach(prod => {
    const texto = prod.texto.trim();
    const normalizado = texto.toLowerCase();
    const precioCapturado = Math.max(0, parseInt(prod.precio) || 0);
    if (precioCapturado > 0) guardarPrecioEnMemoria(texto, precioCapturado);
    const existente = lista.items.find(i => String(i.texto||'').toLowerCase().trim() === normalizado);
    if (existente) {
      existente.cantidad = limitarCantidad((parseInt(existente.cantidad)||1) + (parseInt(prod.cantidad)||1));
      if (precioCapturado > 0) existente.precio = precioCapturado;
      actualizados++;
    } else {
      const catInfo = clasificarProducto(texto);
      const precioFinal = precioCapturado > 0 ? precioCapturado : (obtenerUltimoPrecio(normalizado) || 0);
      lista.items.push({
        id: nuevoIdProducto(), texto,
        cantidad: limitarCantidad(prod.cantidad), precio: precioFinal,
        categoriaId: catInfo.id, icono: catInfo.icono, comprado: false, precioOrigen: precioCapturado > 0 ? 'real' : (precioFinal > 0 ? 'estimado' : 'sin-precio')
      });
      agregados++;
    }
  });

  idListaActiva = lista.id;
  guardarStorage();
  quitados.forEach(i => eliminarProductoFirebase(i.id));
  sincronizarConFirebase();
  document.getElementById('promptIAInput').value = '';
  cerrarModalIA();
  verSeccion('lista-activa');
  mostrarToast(`🤖 ListAI agregó ${agregados} y actualizó ${actualizados}`);
  if (agregados + actualizados > 0) feedbackProductoAgregado((agregados + actualizados) > 1);
  registrarEventoGA('listai_applied', { added_count: agregados, updated_count: actualizados });
}

async function procesarPromptIA() {
  vibrarConfirmacion();

  const promptTexto = document.getElementById('promptIAInput').value.trim();
  const selectDestino = document.getElementById('selectListaDestinoIA');
  const targetId = selectDestino ? selectDestino.value : idListaActiva;
  const btnGen = document.getElementById('btnGenerarIA');

  if (!promptTexto && !imagenBase64Cargada) {
    mostrarToast("⚠️ Escribe, dicta o adjunta una foto para ListAI");
    return;
  }
  if (!navigator.onLine) {
    mostrarToast("📶 ListAI necesita conexión a Internet");
    return;
  }

  registrarEventoGA('listai_request', { has_text: !!promptTexto, has_image: !!imagenBase64Cargada });
  const errorBox = document.getElementById('listaiErrorBox');
  if (errorBox) { errorBox.classList.remove('show'); errorBox.innerHTML=''; }
  btnGen.disabled = true;
  btnGen.innerHTML = "⏳ ListAI analizando...";

  try {
    const urlProxy = "https://ancient-firefly-200e.sabenedettoa.workers.dev/";
    const promptEnriquecido = construirPromptEnriquecidoIA(promptTexto, targetId);
    const response = await fetch(urlProxy, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptTexto: promptEnriquecido, imagenBase64: imagenBase64Cargada })
    });

    let resData;
    try { resData = await response.json(); }
    catch { throw new Error('El servidor devolvió una respuesta no válida'); }
    if (!response.ok) throw new Error(resData.error || `Error en el servidor (${response.status})`);

    const productosRaw = Array.isArray(resData) ? resData : (resData.productos || []);
    const productos = normalizarProductosIA(productosRaw);
    if (!productos.length) throw new Error('No pude identificar productos. Prueba describiendo la compra con más detalle.');

    resultadoIAPendiente = productos;
    mensajeIAPendiente = resData.mensajeIA || `Encontré ${productos.length} productos. Revísalos antes de cargarlos.`;
    targetIdIAPendiente = targetId;
    renderizarPreviewIA();
    mostrarToast(`✨ ListAI preparó ${productos.length} productos`);
    registrarEventoGA('listai_success', { product_count: productos.length });

  } catch (err) {
    console.error("Error al procesar con ListAI:", err);
    const errorBox = document.getElementById('listaiErrorBox');
    if (errorBox) { errorBox.classList.add('show'); errorBox.innerHTML = `⚠️ ${escapeHtml(err.message || 'No pudimos completar la solicitud.')}<button class="btn-tut next" type="button" onclick="procesarPromptIA()">🔄 Reintentar sin perder lo escrito</button>`; }
    mostrarToast(`⚠️ ListAI: ${err.message}`);
    registrarEventoGA('listai_error');
  } finally {
    btnGen.disabled = false;
    btnGen.innerHTML = "✨ Analizar con ListAI";
  }
}
