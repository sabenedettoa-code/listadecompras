// Escáner de códigos de barras
let escanerDesdeFocus = false;
let productoEscaneadoFocus = null;

function abrirConfirmacionEscanerFocus({ barcode, nombre = '', precio = 0, encontrado = false }) {
  productoEscaneadoFocus = { barcode: String(barcode || ''), nombre: String(nombre || '').trim(), encontrado: !!encontrado };
  const overlay = document.getElementById('focusScanProductOverlay');
  const known = document.getElementById('focusScanKnownName');
  const nameWrap = document.getElementById('focusScanNameWrap');
  const nameInput = document.getElementById('focusScanName');
  const qtyInput = document.getElementById('focusScanQty');
  const priceInput = document.getElementById('focusScanPrice');
  const help = document.getElementById('focusScanProductHelp');
  if (!overlay || !known || !nameWrap || !nameInput || !qtyInput || !priceInput) return;

  qtyInput.value = '1';
  priceInput.value = precio > 0 ? String(Math.round(precio)) : '';

  if (encontrado && nombre) {
    known.textContent = nombre;
    known.style.display = 'block';
    nameWrap.style.display = 'none';
    nameInput.value = nombre;
    if (help) help.textContent = 'Elige la cantidad y agrega el precio si corresponde.';
  } else {
    known.style.display = 'none';
    nameWrap.style.display = 'grid';
    nameInput.value = '';
    if (help) help.textContent = 'No encontramos este código. Escribe el nombre, cantidad y precio para guardarlo.';
  }

  overlay.classList.add('active');
  setTimeout(() => {
    if (!encontrado) nameInput.focus();
    else qtyInput.focus();
  }, 80);
}

function cerrarConfirmacionEscanerFocus() {
  document.getElementById('focusScanProductOverlay')?.classList.remove('active');
  productoEscaneadoFocus = null;
}

function normalizarNombreParaSimilitud(texto = '') {
  return String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|cc|l|lt|lts|litro|litros|g|gr|grs|kg|kilo|kilos|un|und|unds|unidad|unidades)\b/g, ' ')
    .replace(/\b(?:pack|formato|bolsa|caja|botella|bot|lata|tarro|frasco)\b/g, ' ')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcularSimilitudNombres(a, b) {
  const na = normalizarNombreParaSimilitud(a);
  const nb = normalizarNombreParaSimilitud(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const ta = [...new Set(na.split(' ').filter(x => x.length > 1))];
  const tb = [...new Set(nb.split(' ').filter(x => x.length > 1))];
  const comunes = ta.filter(x => tb.includes(x)).length;
  const minTokens = Math.min(ta.length, tb.length) || 1;
  const maxTokens = Math.max(ta.length, tb.length) || 1;
  const cobertura = comunes / minTokens;
  const jaccard = comunes / (ta.length + tb.length - comunes || 1);

  if ((na.includes(nb) || nb.includes(na)) && Math.min(na.length, nb.length) >= 4) {
    return Math.max(0.9, cobertura);
  }

  // Exige al menos una coincidencia fuerte y penaliza nombres genéricos distintos.
  if (comunes === 0) return 0;
  if (minTokens === 1 && maxTokens > 2) return cobertura >= 1 ? 0.78 : 0;
  return (cobertura * 0.72) + (jaccard * 0.28);
}

function buscarProductoSimilarEnLista(nombre) {
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista?.items?.length) return null;
  const normalizado = normalizarNombreParaSimilitud(nombre);
  let mejor = null;
  let mejorPuntaje = 0;

  for (const item of lista.items) {
    const itemNormalizado = normalizarNombreParaSimilitud(item.texto);
    if (!itemNormalizado) continue;
    // Solo omitimos duplicados textualmente idénticos: esos ya los gestiona el diálogo de sumar unidades.
    // Si coinciden después de quitar formato/peso (p. ej. “Leche entera 1 L” vs “Leche entera”), sí avisamos.
    if (String(item.texto).toLowerCase().trim() === String(nombre).toLowerCase().trim()) continue;
    const puntaje = calcularSimilitudNombres(nombre, item.texto);
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = item;
    }
  }
  return mejorPuntaje >= 0.78 ? { item: mejor, score: mejorPuntaje } : null;
}

async function confirmarProductoEscaneadoFocus() {
  if (!productoEscaneadoFocus) return;
  const nombre = (document.getElementById('focusScanName')?.value || productoEscaneadoFocus.nombre || '').trim();
  const cantidad = Math.max(1, Math.min(99, parseInt(document.getElementById('focusScanQty')?.value || '1', 10) || 1));
  const precio = Math.max(0, Math.round(parseFloat(document.getElementById('focusScanPrice')?.value || '0') || 0));

  if (!nombre) {
    mostrarToast('⚠️ Escribe el nombre del producto');
    document.getElementById('focusScanName')?.focus();
    return;
  }

  const similar = buscarProductoSimilarEnLista(nombre);
  if (similar?.item) {
    const estado = similar.item.comprado ? 'ya está marcado como comprado' : 'está pendiente';
    const respSimilar = await abrirDialogoApp({
      icon: '🔎',
      title: 'Producto parecido en tu lista',
      message: `Escaneaste <strong>${escapeHtml(nombre)}</strong>, pero ya tienes <strong>${escapeHtml(similar.item.texto)}</strong> (${estado}). ¿Quieres agregar el producto escaneado de todas maneras?`,
      helperText: 'Esto ayuda a evitar duplicados cuando la base de datos usa un nombre ligeramente distinto.',
      confirmText: 'Agregar igualmente',
      cancelText: 'No agregar'
    });
    if (!respSimilar.confirmed) {
      cerrarConfirmacionEscanerFocus();
      mostrarToast(`↩️ No se agregó “${nombre}”`);
      return;
    }
  }

  guardarNombreCodigoEnMemoria(productoEscaneadoFocus.barcode, nombre);
  if (precio > 0) {
    guardarPrecioEnMemoria(nombre, precio);
    guardarPrecioEnMemoria(productoEscaneadoFocus.barcode, precio);
  }

  document.getElementById('itemInput').value = nombre;
  document.getElementById('itemQty').value = String(cantidad);
  document.getElementById('itemPrice').value = precio > 0 ? String(precio) : '';

  document.getElementById('focusScanProductOverlay')?.classList.remove('active');
  productoEscaneadoFocus = null;
  agregarProducto();
  limpiarBusqueda();
}

function abrirEscanerBarras(desdeFocus = false) {
  escanerDesdeFocus = !!desdeFocus;
  registrarEventoGA('scanner_opened');
  vibrarConfirmacion();

  if (!idListaActiva) {
    abrirModalSinLista();
    return;
  }

  escanerProcesando = false;
  document.getElementById('scannerOverlay').classList.add('active');
  html5QrcodeScanner = new Html5Qrcode("reader");
  html5QrcodeScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 150 } },
    async (barcode) => {
      if (escanerProcesando) return;
      escanerProcesando = true;

      vibrarConfirmacion();

      try {
        if (html5QrcodeScanner) {
          await html5QrcodeScanner.stop();
        }
      } catch(e) {}

      const nombreGuardado = memoriaNombresCodigos[barcode];
      const precioGuardado = obtenerUltimoPrecio(barcode) || (nombreGuardado ? obtenerUltimoPrecio(nombreGuardado) : 0);

      if (nombreGuardado) {
        mostrarFeedbackEscaner(true, nombreGuardado);
        registrarEventoGA('scanner_product_found', { source: 'memory' });
        if (escanerDesdeFocus) {
          cerrarEscanerBarras(false);
          setTimeout(() => abrirConfirmacionEscanerFocus({ barcode, nombre: nombreGuardado, precio: precioGuardado, encontrado: true }), 180);
          return;
        }
        document.getElementById('itemInput').value = nombreGuardado;
        if (precioGuardado) document.getElementById('itemPrice').value = precioGuardado;
        
        if (document.activeElement) document.activeElement.blur();
        
        agregarProducto();
        cerrarEscanerBarras(false);
        return;
      }

      mostrarToast("🔍 Buscando producto en la base de datos...");

      try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
          const prod = data.product;
          const nombreEncontrado = prod.product_name_es || prod.product_name || prod.brands || '';
          if (nombreEncontrado) {
            mostrarFeedbackEscaner(true, nombreEncontrado);
            registrarEventoGA('scanner_product_found', { source: 'database' });
            guardarNombreCodigoEnMemoria(barcode, nombreEncontrado);
            if (escanerDesdeFocus) {
              cerrarEscanerBarras(false);
              setTimeout(() => abrirConfirmacionEscanerFocus({ barcode, nombre: nombreEncontrado, precio: precioGuardado, encontrado: true }), 180);
              return;
            }
            document.getElementById('itemInput').value = nombreEncontrado;
            if (precioGuardado) document.getElementById('itemPrice').value = precioGuardado;
            
            if (document.activeElement) document.activeElement.blur();

            agregarProducto();
            cerrarEscanerBarras(false);
            return;
          }
        }
        throw new Error('Producto no en base de datos');
      } catch (err) {
        mostrarFeedbackEscaner(false, "Código No Detectado");
        registrarEventoGA('scanner_product_not_found');
        cerrarEscanerBarras(false);
        if (escanerDesdeFocus) {
          setTimeout(() => abrirConfirmacionEscanerFocus({ barcode, nombre: '', precio: precioGuardado, encontrado: false }), 180);
          return;
        }
        setTimeout(async () => {
          const resp = await abrirDialogoApp({
            icon: '📦',
            title: 'Código no reconocido',
            message: 'El código <strong>' + escapeHtml(barcode) + '</strong> no está en la base de datos. Escribe el nombre del producto para guardarlo en tu memoria.',
            helperText: 'La próxima vez que escanees este código, la app lo reconocerá automáticamente.',
            showInput: true,
            inputPlaceholder: 'Ej: Atún en lata',
            confirmText: 'Guardar producto',
            cancelText: 'Cancelar',
            required: true,
            requiredMessage: 'Escribe el nombre del producto para continuar.'
          });
          if (resp.confirmed && resp.value) {
            const nombreLimpio = resp.value.trim();
            document.getElementById('itemInput').value = nombreLimpio;
            guardarNombreCodigoEnMemoria(barcode, nombreLimpio);
            if (document.activeElement) document.activeElement.blur();
            agregarProducto();
            mostrarFeedbackEscaner(true, nombreLimpio);
          }
        }, 400);
      }
    },
    () => {}
  ).catch(() => {
    escanerProcesando = false;
    mostrarToast("⚠️ No se pudo acceder a la cámara");
  });
}

function cerrarEscanerBarras(porCancelacion = false) {
  if (porCancelacion) escanerDesdeFocus = false;
  if (porCancelacion) {
    mostrarFeedbackEscaner(false, "Escaneo Cancelado");
  }
  
  document.getElementById('scannerOverlay').classList.remove('active');
  
  if (html5QrcodeScanner) {
    try {
      html5QrcodeScanner.stop().then(() => {
        html5QrcodeScanner = null;
        setTimeout(() => { escanerProcesando = false; }, 500);
      }).catch(() => {
        html5QrcodeScanner = null;
        setTimeout(() => { escanerProcesando = false; }, 500);
      });
    } catch(e) {
      html5QrcodeScanner = null;
      setTimeout(() => { escanerProcesando = false; }, 500);
    }
  } else {
    setTimeout(() => { escanerProcesando = false; }, 500);
  }
}
