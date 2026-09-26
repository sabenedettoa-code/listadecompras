// Recetas chilenas
const RECETAS_CHILENAS = [
  { key:'cazuela', icono:'🍲', nombre:'Cazuela de Vacuno', tipo:'Plato de fondo', ingredientes:['1kg Vacuno','Papas 1kg','Zapallo','Choclo','Zanahoria','Porotos verdes','Arroz','Cilantro'] },
  { key:'cazuela-pollo', icono:'🍗', nombre:'Cazuela de Pollo', tipo:'Plato de fondo', ingredientes:['Trutros de pollo','Papas 1kg','Zapallo','Choclo','Zanahoria','Porotos verdes','Arroz','Cilantro'] },
  { key:'pastel', icono:'🥧', nombre:'Pastel de Choclo', tipo:'Plato de fondo', ingredientes:['Choclo molido','Carne molida','Pechuga de pollo','Cebolla','Huevos','Aceitunas','Pasas','Albahaca'] },
  { key:'porotos', icono:'🫘', nombre:'Porotos con Riendas', tipo:'Plato de fondo', ingredientes:['Porotos hallados','Tallarines','Zapallo','Cebolla','Ajo','Longaniza','Ají color'] },
  { key:'porotos-granados', icono:'🫘', nombre:'Porotos Granados', tipo:'Plato de fondo', ingredientes:['Porotos granados','Choclo','Zapallo','Cebolla','Tomate','Albahaca','Ajo','Ají color'] },
  { key:'carbonada', icono:'🍲', nombre:'Carbonada Casera', tipo:'Plato de fondo', ingredientes:['Carne de vacuno en cubos','Papas 1kg','Zapallo','Zanahoria','Choclo','Porotos verdes','Arroz','Ajo y Cebolla'] },
  { key:'charquican', icono:'🥘', nombre:'Charquicán con Huevo', tipo:'Plato de fondo', ingredientes:['Carne molida','Papas 1kg','Zapallo','Choclo','Porotos verdes','Cebolla','Huevos'] },
  { key:'tomatican', icono:'🍅', nombre:'Tomaticán', tipo:'Plato de fondo', ingredientes:['Tomates 1kg','Choclo','Carne de vacuno','Cebolla','Ajo','Ají color','Huevos'] },
  { key:'pollo-arvejado', icono:'🍗', nombre:'Pollo Arvejado', tipo:'Plato de fondo', ingredientes:['Piezas de pollo','Arvejas','Zanahoria','Cebolla','Ajo','Vino blanco','Caldo de pollo','Papas'] },
  { key:'plateada', icono:'🥩', nombre:'Plateada al Horno', tipo:'Plato de fondo', ingredientes:['Plateada de vacuno','Cebolla','Zanahoria','Ajo','Vino tinto','Caldo de carne','Papas'] },
  { key:'ajiaco', icono:'🥣', nombre:'Ajiaco Chileno', tipo:'Sopa', ingredientes:['Carne asada o vacuno','Papas','Cebolla','Ajo','Ají color','Orégano','Comino','Huevos','Cilantro'] },
  { key:'pantrucas', icono:'🥣', nombre:'Pantrucas Caseras', tipo:'Sopa', ingredientes:['Harina 1kg','Agua tibia','Carne molida','Cebolla','Zanahoria','Papas','Huevo','Caldo de carne','Cilantro'] },
  { key:'caldillo-congrio', icono:'🐟', nombre:'Caldillo de Congrio', tipo:'Pescados y mariscos', ingredientes:['Congrio','Papas','Cebolla','Tomates','Zanahoria','Ajo','Vino blanco','Caldo de pescado','Cilantro'] },
  { key:'pescado-frito', icono:'🐟', nombre:'Pescado Frito con Ensalada', tipo:'Pescados y mariscos', ingredientes:['Reineta o merluza','Harina','Huevos','Limón','Aceite','Tomates','Cebolla','Cilantro'] },
  { key:'chupe-jaiba', icono:'🦀', nombre:'Chupe de Jaiba', tipo:'Pescados y mariscos', ingredientes:['Carne de jaiba','Pan de molde','Leche','Cebolla','Ajo','Crema','Queso parmesano','Ají color'] },
  { key:'machas-parmesana', icono:'🐚', nombre:'Machas a la Parmesana', tipo:'Pescados y mariscos', ingredientes:['Machas','Queso parmesano','Mantequilla','Vino blanco','Limón','Pimienta'] },
  { key:'curanto', icono:'🦪', nombre:'Curanto en Olla', tipo:'Sur de Chile', ingredientes:['Choritos','Almejas','Pollo','Longanizas','Costillar de cerdo','Papas','Repollo','Milcaos o chapaleles'] },
  { key:'milcaos', icono:'🥔', nombre:'Milcaos Chilotes', tipo:'Sur de Chile', ingredientes:['Papas 2kg','Manteca','Sal','Chicharrones'] },
  { key:'chapaleles', icono:'🥔', nombre:'Chapaleles', tipo:'Sur de Chile', ingredientes:['Papas','Harina','Manteca','Sal'] },
  { key:'humitas', icono:'🌽', nombre:'Humitas', tipo:'Temporada', ingredientes:['Choclos','Cebolla','Albahaca','Leche','Mantequilla','Ají color','Hojas de choclo'] },
  { key:'empanadas', icono:'🥟', nombre:'Empanadas de Pino', tipo:'Masa y horno', ingredientes:['Harina 1kg','Manteca','Carne picada 1kg','Cebolla 1kg','Huevos','Aceitunas','Pasas'] },
  { key:'sopaipillas', icono:'🎃', nombre:'Sopaipillas Pasadas', tipo:'Dulce y masa', ingredientes:['Zapallo','Harina 1kg','Manteca','Chancaca','Cáscara de naranja','Clavo de olor','Maicena'] },
  { key:'sopaipillas-secas', icono:'🫓', nombre:'Sopaipillas', tipo:'Dulce y masa', ingredientes:['Zapallo','Harina 1kg','Manteca','Sal','Aceite'] },
  { key:'calzones-rotos', icono:'🍩', nombre:'Calzones Rotos', tipo:'Dulce y masa', ingredientes:['Harina','Huevos','Azúcar','Mantequilla','Leche','Ralladura de limón','Polvos de hornear','Azúcar flor','Aceite'] },
  { key:'pan-amasado', icono:'🍞', nombre:'Pan Amasado', tipo:'Panadería', ingredientes:['Harina','Levadura','Manteca','Agua tibia','Sal','Azúcar'] },
  { key:'completo', icono:'🌭', nombre:'Completo Italiano', tipo:'Sándwich', ingredientes:['Vienesas','Pan de completo','Paltas','Tomates 1kg','Mayonesa'] },
  { key:'chacarero', icono:'🥪', nombre:'Chacarero', tipo:'Sándwich', ingredientes:['Pan frica','Carne para churrasco','Tomates','Porotos verdes','Ají verde','Mayonesa'] },
  { key:'churrasco-italiano', icono:'🥪', nombre:'Churrasco Italiano', tipo:'Sándwich', ingredientes:['Pan frica','Carne para churrasco','Paltas','Tomates','Mayonesa'] },
  { key:'lomito-italiano', icono:'🥪', nombre:'Lomito Italiano', tipo:'Sándwich', ingredientes:['Pan frica','Lomo de cerdo','Paltas','Tomates','Mayonesa'] },
  { key:'pebre', icono:'🌶️', nombre:'Pebre Chileno', tipo:'Acompañamiento', ingredientes:['Tomates 1kg','Cebolla','Cilantro fresco','Ají verde','Ajo','Aceite','Vinagre'] },
  { key:'ensalada-chilena', icono:'🥗', nombre:'Ensalada Chilena', tipo:'Acompañamiento', ingredientes:['Tomates','Cebolla','Cilantro','Aceite','Vinagre o limón','Sal'] },
  { key:'papas-mayo', icono:'🥔', nombre:'Papas Mayo', tipo:'Acompañamiento', ingredientes:['Papas','Mayonesa','Cilantro','Limón','Sal'] },
  { key:'mote-huesillos', icono:'🍑', nombre:'Mote con Huesillos', tipo:'Postre y bebida', ingredientes:['Huesillos','Mote','Azúcar','Canela','Cáscara de naranja'] },
  { key:'leche-asada', icono:'🍮', nombre:'Leche Asada', tipo:'Postre', ingredientes:['Leche','Huevos','Azúcar','Esencia de vainilla'] },
  { key:'arroz-leche', icono:'🍚', nombre:'Arroz con Leche', tipo:'Postre', ingredientes:['Arroz','Leche','Azúcar','Canela','Cáscara de limón'] },
  { key:'brazo-reina', icono:'🍰', nombre:'Brazo de Reina', tipo:'Postre', ingredientes:['Huevos','Harina','Azúcar','Polvos de hornear','Manjar','Azúcar flor'] }
];

function normalizarTextoBusquedaReceta(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function renderizarRecetasChilenas() {
  const grid = document.getElementById('recipeGrid');
  const contador = document.getElementById('contadorRecetas');
  const input = document.getElementById('buscarRecetaInput');
  const btnClear = document.getElementById('limpiarBusquedaRecetaBtn');
  if (!grid || !contador) return;

  const filtro = normalizarTextoBusquedaReceta(input?.value);
  const filtradas = RECETAS_CHILENAS.filter(r => {
    const texto = normalizarTextoBusquedaReceta(`${r.nombre} ${r.tipo} ${r.ingredientes.join(' ')}`);
    return !filtro || texto.includes(filtro);
  });

  contador.textContent = filtro
    ? `${filtradas.length} de ${RECETAS_CHILENAS.length}`
    : `${RECETAS_CHILENAS.length} recetas`;
  contador.title = filtro ? `${filtradas.length} recetas coinciden con tu búsqueda` : `${RECETAS_CHILENAS.length} recetas chilenas disponibles`;
  if (btnClear) btnClear.style.display = filtro ? 'block' : 'none';

  if (!filtradas.length) {
    grid.innerHTML = '<div class="recipe-empty">🔎 No encontré recetas con esa búsqueda. Prueba con otro plato o ingrediente.</div>';
    return;
  }

  grid.innerHTML = filtradas.map(r => `
    <div class="recipe-item-card" role="button" tabindex="0" onclick="cargarIngredientesReceta('${r.key}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); cargarIngredientesReceta('${r.key}');}">
      <div style="font-size: 2rem;">${r.icono}</div>
      <h4>${escapeHtml(r.nombre)}</h4>
      <p>${escapeHtml(r.tipo)} · ${r.ingredientes.length} ingredientes</p>
    </div>`).join('');
}

function filtrarRecetasChilenas() {
  renderizarRecetasChilenas();
}

function limpiarBusquedaRecetas() {
  const input = document.getElementById('buscarRecetaInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  renderizarRecetasChilenas();
}

function abrirModalRecetas() {
  vibrarConfirmacion();

  const select = document.getElementById('selectListaDestinoReceta');
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
    if (String(l.id) === String(idListaActiva)) option.selected = true;
    select.appendChild(option);
  });

  const inputBusqueda = document.getElementById('buscarRecetaInput');
  if (inputBusqueda) inputBusqueda.value = '';
  renderizarRecetasChilenas();
  document.getElementById('recetasOverlay').classList.add('active');
}

function cerrarModalRecetas() {
  document.getElementById('recetasOverlay').classList.remove('active');
}

function cargarIngredientesReceta(recetaKey) {
  vibrarConfirmacion();

  const selectDestino = document.getElementById('selectListaDestinoReceta');
  const targetId = selectDestino ? selectDestino.value : idListaActiva;
  const lista = coleccionListas.find(l => String(l.id) === String(targetId));
  if (!lista) {
    mostrarToast("⚠️ Ocurrió un error al seleccionar la lista");
    return;
  }

  const receta = RECETAS_CHILENAS.find(r => r.key === recetaKey);
  if (!receta) {
    mostrarToast('⚠️ Receta no encontrada');
    return;
  }

  if (!lista.items) lista.items = [];
  let agregados = 0;
  let repetidos = 0;

  receta.ingredientes.forEach(ing => {
    const normalizado = ing.toLowerCase().trim();
    const existente = lista.items.find(i => i.texto.toLowerCase().trim() === normalizado);

    if (existente) {
      existente.cantidad = limitarCantidad((Number(existente.cantidad) || 1) + 1);
      existente.origenReceta = existente.origenReceta || receta.key;
      existente.origenRecetaNombre = existente.origenRecetaNombre || receta.nombre;
      repetidos++;
    } else {
      const catInfo = clasificarProducto(ing);
      const precioMemoria = obtenerUltimoPrecio(normalizado) || 0;
      lista.items.push({
        id: nuevoIdProducto(),
        texto: ing,
        cantidad: 1,
        precio: precioMemoria,
        categoriaId: catInfo.id,
        icono: catInfo.icono,
        comprado: false,
        precioOrigen: precioMemoria > 0 ? 'estimado' : 'sin-precio',
        origenReceta: receta.key,
        origenRecetaNombre: receta.nombre
      });
      agregados++;
    }
  });

  idListaActiva = lista.id;
  registrarRecetaEnEstadisticas(receta);
  registrarEventoGA('recipe_loaded', { ingredient_count: receta.ingredientes.length });
  guardarStorage();
  sincronizarConFirebase();
  cerrarModalRecetas();
  verSeccion('lista-activa');
  mostrarToast(`${receta.icono} ${receta.nombre}: ${agregados} ingrediente${agregados===1?'':'s'} agregado${agregados===1?'':'s'}${repetidos ? ` · ${repetidos} ya estaba${repetidos===1?'':'n'} en la lista` : ''}`);
  if (agregados + repetidos > 0) feedbackProductoAgregado((agregados + repetidos) > 1);
}
