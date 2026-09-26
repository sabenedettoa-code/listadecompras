// Memoria de precios y sonidos del escáner
function mostrarFeedbackEscaner(exito, mensaje) {
  const pop = document.getElementById('scanFeedbackPop');
  const icon = document.getElementById('scanIconPop');
  const msg = document.getElementById('scanMsgPop');

  if (timerFeedbackPop) clearTimeout(timerFeedbackPop);

  pop.classList.remove('success', 'error', 'active');

  if (exito) {
    pop.classList.add('success');
    icon.textContent = "✅";
  } else {
    pop.classList.add('error');
    icon.textContent = "❌";
    reproducirSonidoError();
  }

  msg.textContent = mensaje || (exito ? "¡Producto Detectado!" : "No Detectado");

  requestAnimationFrame(() => {
    pop.classList.add('active');
  });

  timerFeedbackPop = setTimeout(() => {
    pop.classList.remove('active');
  }, 1500);
}

function reproducirSonidoError() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

function normalizarClavePrecio(claveKey) {
  return String(claveKey || '').toLowerCase().trim();
}

function obtenerRegistroPrecio(claveKey) {
  const key = normalizarClavePrecio(claveKey);
  const registro = memoriaPreciosLocal[key];
  if (!registro) return null;
  if (typeof registro === 'number') {
    return { ultimoPrecio: registro, fechaUltimoPrecio: null, historial: [] };
  }
  return registro;
}

function obtenerUltimoPrecio(claveKey) {
  const registro = obtenerRegistroPrecio(claveKey);
  return registro ? (Number(registro.ultimoPrecio) || 0) : 0;
}

function formatearFechaPrecio(fechaISO) {
  if (!fechaISO) return 'precio anterior';
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return 'fecha desconocida';
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  const mismaFecha = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (mismaFecha(fecha, hoy)) return 'hoy';
  if (mismaFecha(fecha, ayer)) return 'ayer';
  return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: fecha.getFullYear() !== hoy.getFullYear() ? 'numeric' : undefined });
}

function cargarMemoriaPrecios() {
  const datosPreciosV2 = localStorage.getItem('memoriaPrecios_v2');
  const datosPreciosV1 = localStorage.getItem('memoriaPrecios_v1');
  let datos = datosPreciosV2 || datosPreciosV1;
  memoriaPreciosLocal = {};

  if (datos) {
    try {
      const parsed = JSON.parse(datos);
      Object.entries(parsed || {}).forEach(([key, valor]) => {
        if (typeof valor === 'number') {
          memoriaPreciosLocal[key] = { ultimoPrecio: valor, fechaUltimoPrecio: null, historial: [] };
        } else if (valor && typeof valor === 'object') {
          memoriaPreciosLocal[key] = {
            ultimoPrecio: Number(valor.ultimoPrecio ?? valor.precio ?? 0) || 0,
            fechaUltimoPrecio: valor.fechaUltimoPrecio || null,
            historial: Array.isArray(valor.historial) ? valor.historial.slice(-12) : []
          };
        }
      });
      localStorage.setItem('memoriaPrecios_v2', JSON.stringify(memoriaPreciosLocal));
    } catch (e) { memoriaPreciosLocal = {}; }
  }
  
  const datosNombres = localStorage.getItem('memoriaNombresCodigos_v1');
  if (datosNombres) {
    try { memoriaNombresCodigos = JSON.parse(datosNombres); } catch (e) { memoriaNombresCodigos = {}; }
  }
}

function guardarPrecioEnMemoria(claveKey, precio) {
  const precioValido = Math.max(0, Math.round(Number(precio) || 0));
  if (!claveKey || !precioValido) return;
  const keyNormalizada = normalizarClavePrecio(claveKey);
  const ahora = new Date().toISOString();
  const previo = obtenerRegistroPrecio(keyNormalizada);
  const historial = previo && Array.isArray(previo.historial) ? [...previo.historial] : [];
  const precioAnterior = previo ? Number(previo.ultimoPrecio) || 0 : 0;

  // Solo crea un nuevo punto del historial cuando el precio cambia.
  if (precioAnterior > 0 && precioAnterior !== precioValido) {
    historial.push({ precio: precioAnterior, fecha: previo.fechaUltimoPrecio || ahora });
  }

  memoriaPreciosLocal[keyNormalizada] = {
    ultimoPrecio: precioValido,
    fechaUltimoPrecio: ahora,
    historial: historial.slice(-12)
  };
  localStorage.setItem('memoriaPrecios_v2', JSON.stringify(memoriaPreciosLocal));
}

function guardarNombreCodigoEnMemoria(barcode, nombre) {
  if (!barcode || !nombre) return;
  memoriaNombresCodigos[barcode] = nombre;
  localStorage.setItem('memoriaNombresCodigos_v1', JSON.stringify(memoriaNombresCodigos));
}

function buscarPrecioEnMemoriaPorTexto(texto) {
  if (!texto) return;
  const precioRecordado = obtenerUltimoPrecio(texto);
  if (precioRecordado > 0) {
    const inputPrice = document.getElementById('itemPrice');
    const registro = obtenerRegistroPrecio(texto);
    if (inputPrice && !inputPrice.value) {
      inputPrice.value = precioRecordado;
      mostrarToast(`🧠 Último precio: ${formatoCLP.format(precioRecordado)} · ${formatearFechaPrecio(registro?.fechaUltimoPrecio)}`);
    }
  }
}

function obtenerTendenciaPrecio(registro) {
  if (!registro) return '';
  const historial = Array.isArray(registro.historial) ? registro.historial : [];
  if (!historial.length) return '';
  const anterior = Number(historial[historial.length - 1].precio) || 0;
  const actual = Number(registro.ultimoPrecio) || 0;
  if (!anterior || !actual || anterior === actual) return '→ sin cambio';
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  return pct > 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`;
}

function abrirHistorialPrecio(nombre) {
  vibrarConfirmacion();
  abrirMemoriaPrecios(nombre);
}

function abrirMemoriaPrecios(filtroNombre = '') {
  const overlay = document.getElementById('memoriaPreciosOverlay');
  const listaEl = document.getElementById('memoriaPreciosLista');
  const resumenEl = document.getElementById('memoriaPreciosResumen');
  if (!overlay || !listaEl || !resumenEl) return;

  let registros = Object.entries(memoriaPreciosLocal)
    .map(([key, registro]) => ({ key, registro: obtenerRegistroPrecio(key) }))
    .filter(x => x.registro && Number(x.registro.ultimoPrecio) > 0);

  if (filtroNombre) {
    const filtro = normalizarClavePrecio(filtroNombre);
    registros = registros.filter(x => x.key === filtro || x.key.includes(filtro) || filtro.includes(x.key));
  }

  registros.sort((a, b) => {
    const fa = a.registro.fechaUltimoPrecio ? new Date(a.registro.fechaUltimoPrecio).getTime() : 0;
    const fb = b.registro.fechaUltimoPrecio ? new Date(b.registro.fechaUltimoPrecio).getTime() : 0;
    return fb - fa;
  });

  const conHistorial = registros.filter(x => Array.isArray(x.registro.historial) && x.registro.historial.length > 0).length;
  resumenEl.innerHTML = `<strong>${registros.length}</strong> producto${registros.length === 1 ? '' : 's'} recordado${registros.length === 1 ? '' : 's'}${filtroNombre ? ` para <strong>${escapeHtml(filtroNombre)}</strong>` : ''}. ${conHistorial ? `${conHistorial} ya tienen cambios de precio registrados.` : 'El historial irá creciendo a medida que cambien los precios.'}`;

  if (!registros.length) {
    listaEl.innerHTML = '<div class="empty-msg">Todavía no hay precios guardados para mostrar.</div>';
  } else {
    listaEl.innerHTML = registros.slice(0, 100).map(({key, registro}) => {
      const nombreVisible = memoriaNombresCodigos[key] || key.replace(/(^|\s)\S/g, c => c.toUpperCase());
      const historial = [...(registro.historial || []), { precio: registro.ultimoPrecio, fecha: registro.fechaUltimoPrecio }].slice(-5).reverse();
      const detalleHistorial = historial.map((h, idx) => `${idx === 0 ? '<strong>' : ''}${formatoCLP.format(Number(h.precio) || 0)} · ${formatearFechaPrecio(h.fecha)}${idx === 0 ? '</strong>' : ''}`).join(' &nbsp;→&nbsp; ');
      return `
        <div class="memory-price-card">
          <div class="memory-price-card-top">
            <div class="memory-price-name">${escapeHtml(nombreVisible)}</div>
            <div class="memory-price-value">${formatoCLP.format(Number(registro.ultimoPrecio) || 0)} ${obtenerTendenciaPrecio(registro)}</div>
          </div>
          <div class="memory-price-meta">Última actualización: ${formatearFechaPrecio(registro.fechaUltimoPrecio)}</div>
          <div class="memory-price-history">${detalleHistorial}</div>
        </div>`;
    }).join('');
  }

  overlay.classList.add('active');
}

function cerrarMemoriaPrecios() {
  document.getElementById('memoriaPreciosOverlay')?.classList.remove('active');
}

async function borrarMemoriaPrecios() {
  const resp = await abrirDialogoApp({
    icon: '🧠',
    title: 'Borrar memoria de precios',
    message: 'Se eliminarán los precios recordados de este dispositivo, pero <strong>tus listas no se borrarán</strong>.',
    helperText: 'Esta acción limpia solo la memoria inteligente de precios.',
    confirmText: 'Sí, borrar',
    cancelText: 'Cancelar',
    danger: true
  });
  if (!resp.confirmed) return;
  memoriaPreciosLocal = {};
  localStorage.removeItem('memoriaPrecios_v2');
  localStorage.removeItem('memoriaPrecios_v1');
  cerrarMemoriaPrecios();
  renderizarProductos();
  mostrarToast('🧠 Memoria de precios borrada');
}
