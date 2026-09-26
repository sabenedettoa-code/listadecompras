// Dictado por voz
function normalizarNombreDictado(texto) {
  const limpio = String(texto || '')
    .replace(/[.;:!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!limpio) return '';
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function normalizarTextoComparacion(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function obtenerNombresConocidosParaDictado() {
  const nombres = new Map();
  const agregar = (nombre) => {
    const visible = String(nombre || '').trim();
    const key = normalizarTextoComparacion(visible);
    if (key.length > 1 && !nombres.has(key)) nombres.set(key, visible);
  };

  document.querySelectorAll('#sugerenciasGenericasChilenas option').forEach(o => agregar(o.value));
  obtenerFrecuentes(60).forEach(f => agregar(f.nombre));
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  (lista?.items || []).forEach(i => agregar(i.texto));
  Object.values(memoriaNombresCodigos || {}).forEach(agregar);
  return nombres;
}

function segmentarDictadoPorProductosConocidos(textoOriginal) {
  const texto = normalizarTextoComparacion(textoOriginal);
  if (!texto) return [];

  const conocidos = obtenerNombresConocidosParaDictado();
  const candidatos = [...conocidos.entries()]
    .sort((a,b) => b[0].length - a[0].length);
  const ocupados = [];
  const encontrados = [];

  candidatos.forEach(([key, visible]) => {
    const re = new RegExp(`(?:^|\\s)${key.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?=\\s|$)`, 'g');
    let m;
    while ((m = re.exec(texto)) !== null) {
      const inicio = m.index + (m[0].startsWith(' ') ? 1 : 0);
      const fin = inicio + key.length;
      if (ocupados.some(r => inicio < r.fin && fin > r.inicio)) continue;
      ocupados.push({inicio, fin});
      encontrados.push({inicio, nombre: visible, cantidad: 1});
    }
  });

  encontrados.sort((a,b) => a.inicio - b.inicio);
  return encontrados.length >= 2
    ? encontrados.map(({nombre,cantidad}) => ({nombre: normalizarNombreDictado(nombre), cantidad}))
    : [];
}

function numeroPalabraACantidad(palabra) {
  const mapa = { un:1, una:1, uno:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9, diez:10 };
  return mapa[normalizarTextoComparacion(palabra)] || 0;
}

function extraerProductosDesdeDictado(transcripcion) {
  let textoOriginal = String(transcripcion || '').trim();
  if (!textoOriginal) return [];

  let texto = textoOriginal
    .replace(/\b(coma|punto y coma)\b/gi, ',')
    .replace(/\b(y después|y despues|después|despues|luego|además|ademas|también|tambien|siguiente|otro producto|más|mas)\b/gi, ',')
    .replace(/\s+\b(y|con)\b\s+/gi, ',')
    .replace(/\s*[;|/]\s*/g, ',')
    .replace(/^[\s,]*(agrega|anota|pon|añade|anade|comprar|agregar|necesito|quiero|me falta|faltan)\s+/i, '')
    .replace(/\s*,\s*/g, ',')
    .trim();

  let partes = texto.split(',').map(x => x.trim()).filter(x => x.length > 1);

  // En móviles el motor a veces devuelve "leche pan huevos" sin comas ni "y".
  // Si no hubo separadores, intentamos reconocer productos conocidos sin romper nombres compuestos.
  if (partes.length === 1) {
    const conocidos = segmentarDictadoPorProductosConocidos(textoOriginal);
    if (conocidos.length >= 2) return conocidos;
  }

  return partes.map(parte => {
    let cantidad = 1;
    let nombre = parte;
    let match = parte.match(/^(\d{1,2})\s*(?:x|unidades?\s+de\s+)?\s*(.+)$/i);
    if (match) {
      cantidad = Math.max(1, Math.min(99, parseInt(match[1], 10) || 1));
      nombre = match[2];
    } else {
      match = parte.match(/^(un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(.+)$/i);
      if (match) {
        cantidad = numeroPalabraACantidad(match[1]) || 1;
        nombre = match[2];
      }
    }
    return { nombre: normalizarNombreDictado(nombre), cantidad };
  }).filter(p => p.nombre.length > 1);
}

function agregarLoteDesdeVoz(productos) {
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista || !Array.isArray(productos) || !productos.length) return 0;
  if (!lista.items) lista.items = [];

  let agregados = 0;
  const actualizados = [];

  productos.forEach(({ nombre, cantidad }) => {
    const nombreLimpio = normalizarNombreDictado(nombre);
    if (!nombreLimpio) return;
    const key = nombreLimpio.toLowerCase().trim();
    const existente = lista.items.find(i => String(i.texto || '').toLowerCase().trim() === key);

    if (existente) {
      existente.cantidad = Math.min(99, (Number(existente.cantidad) || 1) + (Number(cantidad) || 1));
      actualizados.push(existente);
    } else {
      const catInfo = clasificarProducto(nombreLimpio);
      const precioMemoria = obtenerUltimoPrecio(nombreLimpio);
      const nuevo = {
        id: nuevoIdProducto(),
        texto: nombreLimpio,
        cantidad: Number(cantidad) || 1,
        precio: precioMemoria || 0,
        categoriaId: catInfo.id,
        icono: catInfo.icono,
        comprado: false,
        precioOrigen: precioMemoria > 0 ? 'estimado' : 'sin-precio'
      };
      lista.items.push(nuevo);
      actualizados.push(nuevo);
      agregados++;
    }
    registrarUsoProducto(nombreLimpio, 1);
  });

  if (!actualizados.length) return 0;
  guardarStorage();
  actualizados.forEach(item => sincronizarProductoFirebase(item));
  sincronizarMetaListaFirebase(lista);
  renderizarProductos();
  registrarEventoGA('voice_batch_added', { product_count: productos.length });
  return productos.length;
}

function iconoMicrofonoClasico() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><path d="M12 19v3"></path><path d="M8 22h8"></path></svg>';
}

function actualizarIconoMicPrincipal(escuchando = false) {
  const btnMic = document.getElementById('btnMic');
  if (!btnMic) return;
  btnMic.innerHTML = iconoMicrofonoClasico();
  btnMic.classList.toggle('listening', !!escuchando);
  btnMic.setAttribute('aria-label', escuchando ? 'Detener dictado por voz' : 'Dictar productos por voz');
  btnMic.title = escuchando ? 'Detener dictado por voz' : 'Dictar por voz de corrido';
}

function detenerDictadoVoz(mostrarMensaje = true) {
  dictadoVozDebeContinuar = false;
  esEscuchandoVoz = false;
  if (timerReinicioDictadoVoz) {
    clearTimeout(timerReinicioDictadoVoz);
    timerReinicioDictadoVoz = null;
  }
  if (objetoReconocimientoVoz) {
    try { objetoReconocimientoVoz.stop(); } catch(e){}
  }
  actualizarIconoMicPrincipal(false);
  if (mostrarMensaje) mostrarToast('🎙️ Dictado finalizado');
}

function iniciarCicloReconocimientoVoz() {
  if (!dictadoVozDebeContinuar) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  objetoReconocimientoVoz = new SpeechRecognition();
  objetoReconocimientoVoz.lang = 'es-CL';
  // En móvil los resultados parciales ayudan a que el motor conserve frases largas.
  objetoReconocimientoVoz.interimResults = dictadoVozEsMovil;
  objetoReconocimientoVoz.maxAlternatives = 1;
  objetoReconocimientoVoz.continuous = !dictadoVozEsMovil;

  objetoReconocimientoVoz.onstart = function() {
    esEscuchandoVoz = true;
    actualizarIconoMicPrincipal(true);
  };

  objetoReconocimientoVoz.onresult = function(event) {
    let totalProcesados = 0;
    let huboFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (!event.results[i].isFinal) continue;
      const transcripcion = String(event.results[i][0].transcript || '').trim();
      if (!transcripcion) continue;
      huboFinal = true;
      const productos = extraerProductosDesdeDictado(transcripcion);
      if (productos.length) totalProcesados += agregarLoteDesdeVoz(productos);
    }

    if (huboFinal) {
      const input = document.getElementById('itemInput');
      if (input) input.value = '';
      const qty = document.getElementById('itemQty');
      if (qty) qty.value = '1';
      const price = document.getElementById('itemPrice');
      if (price) price.value = '';

      if (totalProcesados > 0) {
        feedbackProductoAgregado(totalProcesados > 1);
        mostrarToast(`🎙️ ${totalProcesados} producto${totalProcesados === 1 ? '' : 's'} agregado${totalProcesados === 1 ? '' : 's'}. ${dictadoVozEsMovil ? 'Puedes seguir dictando.' : ''}`.trim());
      } else {
        mostrarToast('⚠️ No pude separar los productos. Di: “leche, pan, huevos” o “leche y pan y huevos”.');
      }
    }
  };

  objetoReconocimientoVoz.onerror = function(event) {
    const error = event.error;
    if (error === 'not-allowed' || error === 'service-not-allowed') {
      dictadoVozDebeContinuar = false;
      detenerDictadoVoz(false);
      mostrarToast('⚠️ Permiso de micrófono denegado en tu navegador');
      return;
    }
    if (error !== 'no-speech' && error !== 'aborted') {
      mostrarToast('⚠️ Error en micrófono: ' + error);
    }
  };

  objetoReconocimientoVoz.onend = function() {
    esEscuchandoVoz = false;
    // En celular SpeechRecognition suele finalizar después de cada frase. Lo reiniciamos
    // mientras el usuario mantenga la sesión activa, para permitir varios productos/pausas.
    if (dictadoVozDebeContinuar && dictadoVozEsMovil) {
      timerReinicioDictadoVoz = setTimeout(() => {
        if (dictadoVozDebeContinuar) iniciarCicloReconocimientoVoz();
      }, 220);
    } else if (!dictadoVozDebeContinuar) {
      actualizarIconoMicPrincipal(false);
    }
  };

  try {
    objetoReconocimientoVoz.start();
  } catch(err) {
    if (dictadoVozDebeContinuar && dictadoVozEsMovil) {
      timerReinicioDictadoVoz = setTimeout(() => iniciarCicloReconocimientoVoz(), 350);
    } else {
      dictadoVozDebeContinuar = false;
      detenerDictadoVoz(false);
      mostrarToast('⚠️ No se pudo iniciar el dictado por voz');
    }
  }
}

function activarDictadoVoz() {
  registrarEventoGA('voice_dictation_used');
  if (!idListaActiva) {
    abrirModalSinLista();
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    mostrarToast('⚠️ Tu navegador no soporta dictado por voz');
    return;
  }

  if (dictadoVozDebeContinuar || esEscuchandoVoz) {
    detenerDictadoVoz(true);
    return;
  }

  dictadoVozEsMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  dictadoVozDebeContinuar = true;
  vibrarConfirmacion();
  mostrarToast(dictadoVozEsMovil
    ? '🎙️ Dictado continuo: di “leche, pan, huevos”. Puedes hacer pausas; toca 🔴 para terminar.'
    : '🎙️ Di varios productos: “leche, pan, huevos” o “leche y pan y huevos”.');
  iniciarCicloReconocimientoVoz();
}
