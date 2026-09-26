// Guardado local (localStorage) y limpieza de datos
const MAX_CANTIDAD_ITEM = 99;
const MAX_PRECIO_ITEM = 100000000;
const MAX_PRESUPUESTO = 1000000000;
const ORIGENES_PRECIO = ['real', 'estimado', 'sin-precio'];

// Id numérico único: la parte baja es aleatoria (para no chocar con otros dispositivos),
// pero en este dispositivo siempre crece, así que dos productos creados en el mismo
// milisegundo (recetas, ListAI, dictado) nunca comparten id.
let ultimoIdProducto = 0;
function nuevoIdProducto() {
  let id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  if (id <= ultimoIdProducto) id = ultimoIdProducto + 1;
  ultimoIdProducto = id;
  return id;
}

function limitarCantidad(valor) {
  return Math.min(MAX_CANTIDAD_ITEM, Math.max(1, parseInt(valor) || 1));
}

function sanearNombreLista(nombre) {
  const limpio = (typeof nombre === 'string' ? nombre : '').trim().slice(0, 100);
  return limpio || 'Mi Lista';
}

function sanearPresupuesto(valor) {
  const n = Math.round(Number(valor) || 0);
  return Math.min(MAX_PRESUPUESTO, Math.max(0, n));
}

// Normaliza un producto venido de localStorage o de Firebase. Cualquier persona con el
// código de una lista puede escribir en ella, así que nada de lo que llega se da por válido:
// solo se conservan los campos conocidos y con el tipo esperado (evita inyectar HTML).
// Si el id no es numérico: para datos locales se genera uno nuevo; los de la nube se descartan.
function sanearItem(item, { generarIdSiFalta = false } = {}) {
  if (!item || typeof item !== 'object') return null;
  let id = Number(item.id);
  if (!Number.isFinite(id)) {
    if (!generarIdSiFalta) return null;
    id = nuevoIdProducto();
  }
  const texto = (typeof item.texto === 'string' || typeof item.texto === 'number' ? String(item.texto) : '').trim().slice(0, 160);
  if (!texto) return null;
  const precio = Math.min(MAX_PRECIO_ITEM, Math.max(0, Math.round(Number(item.precio) || 0)));
  const categoria = CATEGORIAS.find(c => c.id === item.categoriaId) || clasificarProducto(texto);
  const limpio = {
    id,
    texto,
    cantidad: limitarCantidad(item.cantidad),
    precio,
    categoriaId: categoria.id,
    icono: categoria.icono,
    comprado: item.comprado === true,
    precioOrigen: ORIGENES_PRECIO.includes(item.precioOrigen) ? item.precioOrigen : (precio > 0 ? 'real' : 'sin-precio')
  };
  if (typeof item.origenReceta === 'string' && item.origenReceta) limpio.origenReceta = item.origenReceta.slice(0, 60);
  if (typeof item.origenRecetaNombre === 'string' && item.origenRecetaNombre) limpio.origenRecetaNombre = item.origenRecetaNombre.slice(0, 120);
  return limpio;
}

function sanearItems(items, opciones) {
  return (Array.isArray(items) ? items : []).map(i => sanearItem(i, opciones)).filter(Boolean);
}

function guardarStorage() {
  try {
    localStorage.setItem('misListasCompras_v1', JSON.stringify(coleccionListas));
    return true;
  } catch (e) {
    console.error('No se pudo guardar localmente:', e);
    mostrarToast('⚠️ No se pudo guardar en este dispositivo');
    return false;
  }
}
function cargarStorage() {
  const datos = localStorage.getItem('misListasCompras_v1');
  if (datos) {
    try {
      coleccionListas = JSON.parse(datos);
      if (!Array.isArray(coleccionListas)) coleccionListas = [];
      coleccionListas = coleccionListas.filter(lista => lista && typeof lista === 'object' && lista.id !== undefined && lista.id !== null);
      coleccionListas.forEach(lista => {
        lista.nombre = sanearNombreLista(lista.nombre);
        lista.items = sanearItems(lista.items, { generarIdSiFalta: true });
        lista.presupuesto = sanearPresupuesto(lista.presupuesto);
      });
    } catch (e) {
      coleccionListas = [];
    }
  }
}
