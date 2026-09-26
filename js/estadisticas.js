// Estadísticas locales, productos habituales e historial de compras
function normalizarClaveFrecuente(texto) { return String(texto||'').toLowerCase().trim(); }

function estructuraAnioEstadisticas() {
  return {
    productos: {},
    meses: {},
    recetas: {},
    comprasCompletadas: { cantidad: 0, total: 0, productos: 0, mayorTotal: 0, mayorNombre: '' },
    colaboracion: { maxPersonas: 1, listaMax: '', maxPorLista: {} },
    totales: { marcasCompra: 0, unidades: 0, gastoReal: 0, gastoEstimado: 0 }
  };
}

function cargarEstadisticasAnuales() {
  try {
    const guardadas = JSON.parse(localStorage.getItem('estadisticasAnuales_v1') || 'null');
    if (guardadas && typeof guardadas === 'object') estadisticasAnualesLocal = guardadas;
  } catch(e) {}
  if (!estadisticasAnualesLocal || typeof estadisticasAnualesLocal !== 'object') {
    estadisticasAnualesLocal = { version: 1, inicioRegistro: null, anios: {} };
  }
  estadisticasAnualesLocal.version = 1;
  estadisticasAnualesLocal.anios = estadisticasAnualesLocal.anios || {};
  if (!estadisticasAnualesLocal.inicioRegistro) estadisticasAnualesLocal.inicioRegistro = Date.now();
  guardarEstadisticasAnuales();
}

function guardarEstadisticasAnuales() {
  try { localStorage.setItem('estadisticasAnuales_v1', JSON.stringify(estadisticasAnualesLocal)); } catch(e) {}
}

function obtenerAnioEstadisticas(fecha = Date.now()) {
  const anio = String(new Date(fecha).getFullYear());
  if (!estadisticasAnualesLocal.anios[anio]) estadisticasAnualesLocal.anios[anio] = estructuraAnioEstadisticas();
  const obj = estadisticasAnualesLocal.anios[anio];
  obj.productos = obj.productos || {};
  obj.meses = obj.meses || {};
  obj.recetas = obj.recetas || {};
  obj.comprasCompletadas = obj.comprasCompletadas || { cantidad:0,total:0,productos:0,mayorTotal:0,mayorNombre:'' };
  obj.colaboracion = obj.colaboracion || { maxPersonas:1,listaMax:'',maxPorLista:{} };
  obj.colaboracion.maxPorLista = obj.colaboracion.maxPorLista || {};
  obj.totales = obj.totales || { marcasCompra:0,unidades:0,gastoReal:0,gastoEstimado:0 };
  return obj;
}

function registrarProductoEnEstadisticas(lista, prod) {
  if (!lista || !prod) return null;
  const ahora = Date.now();
  const stats = obtenerAnioEstadisticas(ahora);
  const key = normalizarClaveFrecuente(prod.texto);
  if (!key) return null;
  const cantidad = Math.max(1, Number(prod.cantidad) || 1);
  const precio = Math.max(0, Number(prod.precio) || 0);
  const gasto = cantidad * precio;
  const esReal = prod.precioOrigen === 'real';
  const mes = String(new Date(ahora).getMonth() + 1).padStart(2, '0');
  const p = stats.productos[key] || {
    nombre: String(prod.texto).trim(), compras: 0, unidades: 0,
    gastoReal: 0, gastoEstimado: 0, primeraCompra: ahora, ultimaCompra: ahora,
    categoriaId: prod.categoriaId || '', recetaOrigen: {}
  };
  p.nombre = String(prod.texto).trim();
  p.compras += 1;
  p.unidades += cantidad;
  p.ultimaCompra = ahora;
  p.primeraCompra = Math.min(Number(p.primeraCompra) || ahora, ahora);
  p.categoriaId = prod.categoriaId || p.categoriaId || '';
  if (esReal) p.gastoReal = (Number(p.gastoReal) || 0) + gasto;
  else p.gastoEstimado = (Number(p.gastoEstimado) || 0) + gasto;
  if (prod.origenReceta) {
    p.recetaOrigen = p.recetaOrigen || {};
    p.recetaOrigen[prod.origenReceta] = (Number(p.recetaOrigen[prod.origenReceta]) || 0) + 1;
  }
  stats.productos[key] = p;

  const m = stats.meses[mes] || { marcasCompra:0, unidades:0, gastoReal:0, gastoEstimado:0 };
  m.marcasCompra += 1; m.unidades += cantidad;
  if (esReal) m.gastoReal += gasto; else m.gastoEstimado += gasto;
  stats.meses[mes] = m;
  stats.totales.marcasCompra += 1;
  stats.totales.unidades += cantidad;
  if (esReal) stats.totales.gastoReal += gasto; else stats.totales.gastoEstimado += gasto;

  guardarEstadisticasAnuales();
  return { anio:String(new Date(ahora).getFullYear()), mes, key, cantidad, gasto, esReal };
}

function revertirProductoEnEstadisticas(token) {
  if (!token) return;
  const stats = estadisticasAnualesLocal.anios?.[token.anio];
  if (!stats) return;
  const p = stats.productos?.[token.key];
  if (p) {
    p.compras = Math.max(0, (Number(p.compras)||0)-1);
    p.unidades = Math.max(0, (Number(p.unidades)||0)-token.cantidad);
    if (token.esReal) p.gastoReal = Math.max(0,(Number(p.gastoReal)||0)-token.gasto);
    else p.gastoEstimado = Math.max(0,(Number(p.gastoEstimado)||0)-token.gasto);
    if (p.compras === 0 && p.unidades === 0) delete stats.productos[token.key];
  }
  const m = stats.meses?.[token.mes];
  if (m) {
    m.marcasCompra=Math.max(0,(Number(m.marcasCompra)||0)-1);
    m.unidades=Math.max(0,(Number(m.unidades)||0)-token.cantidad);
    if(token.esReal) m.gastoReal=Math.max(0,(Number(m.gastoReal)||0)-token.gasto);
    else m.gastoEstimado=Math.max(0,(Number(m.gastoEstimado)||0)-token.gasto);
  }
  stats.totales.marcasCompra=Math.max(0,(Number(stats.totales.marcasCompra)||0)-1);
  stats.totales.unidades=Math.max(0,(Number(stats.totales.unidades)||0)-token.cantidad);
  if(token.esReal) stats.totales.gastoReal=Math.max(0,(Number(stats.totales.gastoReal)||0)-token.gasto);
  else stats.totales.gastoEstimado=Math.max(0,(Number(stats.totales.gastoEstimado)||0)-token.gasto);
  guardarEstadisticasAnuales();
}

function registrarRecetaEnEstadisticas(receta) {
  if (!receta) return;
  const stats = obtenerAnioEstadisticas();
  const r = stats.recetas[receta.key] || { nombre: receta.nombre, veces:0, ultima:0 };
  r.nombre = receta.nombre; r.veces += 1; r.ultima = Date.now();
  stats.recetas[receta.key] = r;
  guardarEstadisticasAnuales();
}

function registrarCompraCompletadaEnEstadisticas(lista, total) {
  if (!lista) return;
  const stats = obtenerAnioEstadisticas();
  const c = stats.comprasCompletadas;
  c.cantidad += 1;
  c.total += Math.max(0, Number(total)||0);
  c.productos += Array.isArray(lista.items) ? lista.items.length : 0;
  if ((Number(total)||0) > (Number(c.mayorTotal)||0)) { c.mayorTotal = Number(total)||0; c.mayorNombre = lista.nombre || 'Compra'; }
  guardarEstadisticasAnuales();
  (lista.items || []).forEach(i => tokensCompraSesion.delete(`${lista.id}:${i.id}`));
}

function registrarMaximoColaboracion(listaId, cantidad) {
  if (!listaId || !cantidad) return;
  const stats = obtenerAnioEstadisticas();
  const actual = Number(stats.colaboracion.maxPorLista[listaId]) || 0;
  if (cantidad > actual) stats.colaboracion.maxPorLista[listaId] = cantidad;
  if (cantidad > (Number(stats.colaboracion.maxPersonas)||1)) {
    stats.colaboracion.maxPersonas = cantidad;
    const lista = coleccionListas.find(l => String(l.id) === String(listaId));
    stats.colaboracion.listaMax = lista?.nombre || String(listaId);
  }
  guardarEstadisticasAnuales();
}

function cargarInteligenciaLocal() {
  try { estadisticasFrecuencia = JSON.parse(localStorage.getItem('frecuentes_v1') || '{}') || {}; } catch(e){ estadisticasFrecuencia = {}; }
  try { historialCompras = JSON.parse(localStorage.getItem('historialCompras_v1') || '[]') || []; } catch(e){ historialCompras = []; }
  cargarEstadisticasAnuales();
  actualizarSugerenciasFrecuentes();
}
function registrarUsoProducto(texto, peso=1) {
  const key = normalizarClaveFrecuente(texto); if (!key) return;
  const actual = estadisticasFrecuencia[key] || { nombre:String(texto).trim(), usos:0, ultima:0 };
  actual.nombre = String(texto).trim(); actual.usos = (Number(actual.usos)||0) + peso; actual.ultima = Date.now();
  estadisticasFrecuencia[key] = actual;
  try { localStorage.setItem('frecuentes_v1', JSON.stringify(estadisticasFrecuencia)); } catch(e){}
  actualizarSugerenciasFrecuentes();
}
function obtenerFrecuentes(limite=20) {
  return Object.values(estadisticasFrecuencia).sort((a,b)=>(b.usos-a.usos)||(b.ultima-a.ultima)).slice(0,limite);
}
function actualizarSugerenciasFrecuentes() {
  const dl=document.getElementById('sugerenciasGenericasChilenas'); if(!dl) return;
  dl.querySelectorAll('option[data-smart="1"]').forEach(o=>o.remove());
  obtenerFrecuentes(15).reverse().forEach(f=>{ const o=document.createElement('option'); o.value=f.nombre; o.dataset.smart='1'; dl.prepend(o); });
}
function abrirFrecuentes() {
  registrarEventoGA('frequents_opened');
  const box=document.getElementById('frecuentesLista'); const lista=coleccionListas.find(l=>String(l.id)===String(idListaActiva));
  const freq=obtenerFrecuentes(30); box.innerHTML='';
  if(!freq.length) box.innerHTML='<div class="smart-empty">Todavía no hay productos habituales. A medida que uses la app aparecerán aquí.</div>';
  freq.forEach(f=>{ const ya=lista?.items?.some(i=>normalizarClaveFrecuente(i.texto)===normalizarClaveFrecuente(f.nombre)); box.insertAdjacentHTML('beforeend',`<div class="smart-list-card"><div class="smart-list-row"><div><div class="smart-list-title">${escapeHtml(f.nombre)}</div><div class="smart-list-meta">Usado ${f.usos} vez${f.usos===1?'':'es'} · ${ya?'Ya está en la lista':'Listo para agregar'}</div></div><button class="smart-mini-btn" ${ya?'disabled':''} onclick="agregarFrecuente(decodeURIComponent('${encodeURIComponent(f.nombre)}'))">${ya?'✓':'＋ Agregar'}</button></div></div>`); });
  document.getElementById('frecuentesOverlay').classList.add('active');
}
function cerrarFrecuentes(){document.getElementById('frecuentesOverlay')?.classList.remove('active');}
function agregarFrecuente(nombre){
  if(!idListaActiva){cerrarFrecuentes(); verSeccion('mis-listas'); return;}
  const lista=coleccionListas.find(l=>String(l.id)===String(idListaActiva)); if(!lista) return;
  if(!lista.items) lista.items=[]; if(lista.items.some(i=>normalizarClaveFrecuente(i.texto)===normalizarClaveFrecuente(nombre))) return;
  const cat=clasificarProducto(nombre), mem=obtenerUltimoPrecio(nombre)||0;
  const item={id:nuevoIdProducto(),texto:nombre,cantidad:1,precio:mem,categoriaId:cat.id,icono:cat.icono,comprado:false,precioOrigen:mem?'estimado':'sin-precio'};
  lista.items.push(item); guardarStorage(); sincronizarProductoFirebase(item); renderizarProductos(); abrirFrecuentes(); mostrarToast(`⭐ "${nombre}" agregado`); feedbackProductoAgregado(false); registrarEventoGA('frequent_added');
}
function agregarTopFrecuentes(){ obtenerFrecuentes(5).forEach(f=>agregarFrecuente(f.nombre)); cerrarFrecuentes(); registrarEventoGA('frequents_top5_added'); }

function guardarCompraEnHistorial(lista) {
  if(!lista || !lista.items?.length) return;
  const clave=String(lista.id)+'_'+lista.items.map(i=>i.id).sort().join('-'); if(compraCompletadaRegistrada.has(clave)) return;
  const todos=lista.items.every(i=>i.comprado); if(!todos) return;
  compraCompletadaRegistrada.add(clave);
  const total=lista.items.reduce((a,i)=>a+(Number(i.cantidad)||1)*(Number(i.precio)||obtenerUltimoPrecio(i.texto)||0),0);
  historialCompras.unshift({id:'h_'+Date.now(),fecha:Date.now(),nombre:lista.nombre,total,items:JSON.parse(JSON.stringify(lista.items)).map(i=>({...i,comprado:false}))});
  historialCompras=historialCompras.slice(0,40);
  try{localStorage.setItem('historialCompras_v1',JSON.stringify(historialCompras));}catch(e){}
  registrarCompraCompletadaEnEstadisticas(lista, total);
  registrarEventoGA('purchase_completed', { item_count: lista.items.length });
  setTimeout(reproducirSonidoCompraCompletada, 320);
}
function abrirHistorialCompras(){
  registrarEventoGA('purchase_history_opened');
  const box=document.getElementById('historialComprasLista'); box.innerHTML='';
  if(!historialCompras.length) box.innerHTML='<div class="smart-empty">Aún no hay compras completadas. Cuando marques todos los productos como comprados se guardará un resumen aquí.</div>';
  historialCompras.forEach(h=>{ const f=new Date(h.fecha).toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'}); box.insertAdjacentHTML('beforeend',`<div class="smart-list-card"><div class="smart-list-row"><div><div class="smart-list-title">${escapeHtml(h.nombre)}</div><div class="smart-list-meta">${f} · ${h.items.length} productos · ${formatoCLP.format(h.total||0)}</div></div><button class="smart-mini-btn" onclick="repetirCompra('${h.id}')">🔁 Repetir</button></div></div>`); });
  document.getElementById('historialComprasOverlay').classList.add('active');
}
function cerrarHistorialCompras(){document.getElementById('historialComprasOverlay')?.classList.remove('active');}
async function repetirCompra(id){
  const h=historialCompras.find(x=>x.id===id); if(!h) return;
  const codigo=await generarCodigoDisponible(); const nueva={id:codigo,nombre:sanearNombreLista(`${h.nombre} · Repetida`),items:sanearItems(h.items.map(i=>({...i,id:nuevoIdProducto(),comprado:false}))),presupuesto:0,ui:{filter:'pendientes',focus:false}};
  coleccionListas.push(nueva); guardarStorage(); cerrarHistorialCompras(); abrirLista(codigo); sincronizarConFirebase(); mostrarToast('🔁 Compra anterior lista para reutilizar'); registrarEventoGA('purchase_repeated', { item_count: nueva.items.length }); registrarListaEnCuenta(nueva.id, nueva.nombre);
}
