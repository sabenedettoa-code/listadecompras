// Categorías, feedback, toast, PWA, tutorial, navegación e inicio
const pasosTutorialData = [
  {icon:'👋',title:'¡Bienvenid@ a Mis Listas!',desc:'Tu lista de compras está pensada para ser rápida y simple tanto al planificar como al recorrer el supermercado.',tip:'Puedes volver a este tutorial cuando quieras desde ☰ Ajustes y Ayuda.'},
  {icon:'🔑',title:'Crea, comparte o únete',desc:'Crea una lista o entra con el código de otra persona. Si comparten la misma lista, verás cuántas personas están usándola en vivo.',tip:'Los cambios normales se sincronizan producto por producto para reducir choques entre usuarios.'},
  {icon:'🎤',title:'Agrega productos como prefieras',desc:'Puedes escribir, dictar varios productos de una sola vez o escanear códigos de barras. En celular, el micrófono queda escuchando aunque hagas pequeñas pausas: di “leche, pan, huevos” y toca 🔴 cuando termines.',tip:'También entiende frases como “leche y pan y huevos”; la app los separa y agrega individualmente.'},
  {icon:'⭐',title:'Tus productos habituales',desc:'En el menú encontrarás ⭐ Productos Habituales para volver a cargar rápidamente lo que compras seguido.',tip:'La frecuencia se aprende localmente en este dispositivo.'},
  {icon:'🧠',title:'Memoria inteligente de precios',desc:'La app recuerda precios anteriores. Si completa un precio desde memoria, lo marca como estimado hasta que tú lo confirmes o modifiques.',tip:'Cuando escribes el precio real en el supermercado, pasa a considerarse confirmado.'},
  {icon:'💰',title:'Presupuesto y gastos',desc:'Define un tope, revisa cuánto llevas gastado y cuánto te queda. El cálculo puede incluir precios estimados cuando todavía faltan precios reales.',tip:'El aviso te dirá claramente cuánto te queda o cuánto vas sobre el tope.'},
  {icon:'🤖',title:'ListAI con revisión',desc:'Pídele menús, compras, lectura de boletas o listas desde una foto. Primero revisas la propuesta y luego decides qué agregar.',tip:'Si ListAI falla, tu texto y tu foto se conservan para que puedas reintentar.'},
  {icon:'🎯',title:'Modo Focus',desc:'En el supermercado, Focus prioriza nombre, cantidad, precio editable, buscador y escáner de código de barras para comprar sin distracciones.',tip:'Puedes alternar Por comprar / Comprados / Todos. Al escanear, la app avisa si detecta un producto con nombre parecido para ayudarte a evitar duplicados.'},
  {icon:'📶',title:'También funciona sin señal',desc:'Si pierdes Internet, tus cambios siguen guardándose en este dispositivo. Al recuperar conexión, la app vuelve a sincronizar.',tip:'Verás una franja informativa mientras estés sin conexión.'},
  {icon:'📅',title:'Historial de compras',desc:'Al completar todos los productos de una lista, guardamos un resumen local. Luego puedes repetir esa compra desde el menú.',tip:'Ideal para compras mensuales o rutinas que se repiten.'},
  {icon:'👓',title:'Accesibilidad y comodidad',desc:'Puedes agrandar la letra, mantener la pantalla encendida y usar controles grandes. La app también respeta la preferencia de reducir animaciones.',tip:'Todo está pensado para seguir siendo legible y cómodo en el celular.'}
];

function abrirModalSinLista() {
  vibrarConfirmacion();
  document.getElementById('noListOverlay').classList.add('active');
}

function cerrarModalSinLista() {
  vibrarConfirmacion();
  document.getElementById('noListOverlay').classList.remove('active');
}

// Código de 6 caracteres con aleatoriedad criptográfica (el código es la llave de la lista).
function generarCodigoUnico() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let cod = '';
  do {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    cod = Array.from(bytes, b => chars[b % chars.length]).join(''); // 256 es múltiplo de 32: sin sesgo
  } while (coleccionListas.some(l => String(l.id) === cod));
  return cod;
}

// Igual que generarCodigoUnico, pero con conexión verifica que el código no exista ya en
// Firebase, para no sobrescribir la lista de otra persona. Sin conexión (o si Firebase no
// responde a tiempo) se usa el código igual: la probabilidad de choque es ínfima.
async function generarCodigoDisponible() {
  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigoUnico();
    if (!navigator.onLine) return codigo;
    try {
      await obtenerUsuarioFirebase();
      const consulta = db.ref(`listas/${codigo}/nombre`).once('value').then(s => s.exists());
      const limite = new Promise(resolve => setTimeout(() => resolve(false), 4000));
      if (!(await Promise.race([consulta, limite]))) return codigo;
    } catch (e) {
      return codigo;
    }
  }
  return generarCodigoUnico();
}

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

let CATEGORIAS = [
  { id: 'frescos', nombre: 'Frutas y Verduras', icono: '🥦', regex: /(manzana|platano|plátano|banano|pera|frutilla|uva|limon|limón|naranja|mandarina|clementina|tomate|tomates|papa|papas|cebolla|cebollas|lechuga|zanahoria|palta|pimenton|pimentón|choclo|zapallo|zapallito|cebollin|cebollín|cilantro|perejil|ajo|ají|aji|champignon|champiñon|champiñones|durazno|damasco|ciruela|kiwi|melon|melón|sandia|sandía|higo|caqui|membrillo|granada|maracuya|maracuyá|frambuesa|mora|arandano|arándano|piña|albahaca|espinaca|acelga|repollo|coliflor|brócoli|brocoli|betarraga|rabanito|rabanitos|apio|puerro|hinojo|espárrago|esparrago|alcachofa|arveja|arvejas|poroto verde|porotos verdes|haba|habas|camote|pepino|huesillo|jengibre|merken|merkén|salvia|romero|tomillo|menta|ciboulette)/i },
  { id: 'lacteos', nombre: 'Lácteos, Huevos y Cecinas', icono: '🥛', regex: /(leche|queso|quesillo|yogur|yogurt|mantequilla|margarina|crema|huevo|huevos|manjar|jamon|jamón|vienesa|vienesas|salchicha|salchichas|longaniza|longanizas|chorizo|chorizos|tocino|salame|pate|paté|arrollado|arrollado de huaso|queso gauda|queso chanco|queso mantecoso|queso mozzarella|queso parmesano|queso de cabra|queso crema|ricotta|provolone|mortadela|salchichón|queso de cabeza|jamón serrano|jamón de pavo|jamón de pierna|choricillo|choricillos|chicharron|chicharrón|prieta|prietas|morcilla|jamonada)/i },
  { id: 'carnes', nombre: 'Carnes, Pescados y Mariscos', icono: '🥩', regex: /(carne|carnes|lomo|aloyado|lomo vetado|lomo liso|lomo carnudo|asado|asado carnicero|costillar|pollo|pechuga|muslo|truto|trutos|ala|alas|cerdo|pescado|reineta|salmon|salmón|atun|atún|merluza|carne molida|posta|posta negra|posta rosada|chuleta|sobrecostilla|huachalomo|tapapecho|abastero|entraña|entrañita|palanca|plateada|punta de ganso|punta picana|tapacostilla|choclillo|ganso|asado de tira|malaya|churrasco|churrascos|escalopa|milanesa|albondiga|albóndiga|hamburguesa|hamburguesas|pavo|pavo deshuesado|cordero|chivo|conejo|guatitas|lengua|chunchules|molleja|mollejas|hígado|higado|corazon|corazón|marisco|mariscos|chorito|choritos|almeja|almejas|macha|machas|ostion|ostión|ostiones|camaron|camarón|camarones|jaiba|centolla|pulpo|calamar|calamares|piure|picoroco|loco|locos|cochayuyo|luche|erizo|erizos|navajuela|sardina|sardinas|sierra|corvina|lenguado)/i },
  { id: 'panaderia', nombre: 'Panadería y Cereal', icono: '🍞', regex: /(pan|pancito|marraqueta|marraquetas|hallulla|hallullas|dobladita|dobladitas|galleta|galletas|harina|arroz|fideos|tallarines|espageti|espagueti|pasta|pastas|cereal|cereales|avena|tostadas|pan de molde|pan frica|pan de hot dog|pan pita|pan ciabatta|pan baguette|pan de masa madre|pan integral|pan amasado|coliza|bocado de dama|sopaipilla|sopaipillas|empanada|empanadas|pino|queso empanada|tortilla|tortillas|rapiditas|croissant|medialuna|medialunas|dona|donas|muffin|muffins|queque|queques|brownie|brownies|panqueque|panqueques|corbatitas|espirales|lasaña|lasagna|ñoquis|sémola|semola|harina tostada|quinoa|quínoa|mote|granola)/i },
  { id: 'despensa', nombre: 'Despensa y Abarrotes', icono: '🥫', regex: /(aceite|sal|azucar|azúcar|lenteja|lentejas|poroto|porotos|garbanzo|garbanzos|salsa|ketchup|kétchup|mostaza|mayonesa|mayo|conserva|jurel|atun en lata|atún en lata|sopa|sopas|caldo|caldos|salsa de tomate|salsas|aderezo|aliño|aliño completo|comino|pimienta|orégano|oregano|paprika|pimentón en polvo|curry|cúrcuma|curcuma|laurel|vinagre|salsa de soya|salsa inglesa|salsa de ajo|ají color|aji color|puré|pure|puré de papas|palmitos|palmito|aceitunas|aceituna|pepinillos|alcaparras|salsa barbacoa|mermelada|mermeladas|miel|miel de abeja|leche condensada|leche evaporada|polvo de hornear|polvos de hornear|bicarbonato|esencia de vainilla|levadura|cobertura de chocolate|maicena|chuño|gelatina|jalea|flan|saborizante|coco rallado|chancaca|clavo de olor)/i },
  { id: 'limpieza', nombre: 'Limpieza e Higiene', icono: '🧹', regex: /(jabón|jabon|detergente|cloro|desinfectante|papel|suavizante|limpiador|limpiavidrios|limpia vidrios|limpiapisos|lustramuebles|desengrasante|esponja|esponjas|shampoo|champú|champu|acondicionador|papel higienico|papel higiénico|toalla nova|toallas nova|toalla absorbente|desodorante|pasta de dientes|crema dental|cepillo de dientes|lavaloza|mopa|escoba|escobillón|escobillon|pala|bolsa de basura|bolsas de basura|virutilla|cera para piso|pastilla wc|trapero|paño|paños|paño microfibra|guantes|guantes para loza|cotonitos|toallitas húmedas|toallitas humedas|pañal|pañales|toalla higiénica|toallas higienicas|tampones|tampón|rasuradora|prestobarba|espuma de afeitar|hilo dental|enjuague bucal|bloqueador|bloqueador solar|crema humectante|crema corporal|talco|algodón|algodon|parche curita|agua oxigenada|alcohol|alcohol gel|preservativo|preservativos|condón|condones)/i },
  { id: 'bebidas', nombre: 'Bebidas y Bares', icono: '🥤', regex: /(agua|agua mineral|jugo|jugos|refresco|gaseosa|bebida|bebidas|cerveza|cervezas|vino|vinos|pisco|piscola|ron|vodka|gin|whisky|whiskey|tequila|fernet|licor|champagne|espumante|espumoso|sangria|sangría|borgoña|clery|navegado|terremoto|pipeño|chicha|ginger ale|agua tónica|agua tonica|energetica|energética|jugo en sobre|jugo en polvo|jugo concentrado|cafe|café|cafe descafeinado|cafe molido|cafe en grano|\bte\b|\bté\b|té en bolsa|té de hierbas|manzanilla|anis|anís|boldo|hierba mate|mate)/i },
  { id: 'snack', nombre: 'Snacks y Dulces', icono: '🍫', regex: /(chocolate|chocolates|dulce|dulces|caramelo|caramelos|helado|helados|pastel|pasteles|torta|tortas|papas fritas|maní|mani|snack|snacks|ramitas|gomitas|chocolatina|barrita de cereal|frutos secos|almendras|nueces|castañas de caju|pistachos|avellanas|semillas de girasol|maravilla|bocadillos|tortillas de maíz|nachos|cabritas|popcorn|pretzels|chicle|chicles|chupete|chupetes|malvaviscos|cuchufli|cuchuflí|turron|turrón|alfajor|alfajores|obleas|caluga|calugas)/i },
  { id: 'libreria', nombre: 'Hogar, Mascotas y Librería', icono: '🐾', regex: /(comida de perro|comida de gato|alimento para perro|alimento para gato|arena de gato|arena sanitaria|juguete mascota|collar|correa|plato mascota|cuaderno|cuadernos|lápiz|lapiz|lápices|lapices|corrector|goma|sacapuntas|regla|tijeras|pegamento|estuche|mochila|hojas|resma|vela|velas|fósforo|fósforos|encendedor|pila|pilas|ampolleta|ampolletas|zapatilla eléctrica|cinta adhesiva|papel aluminio|alusa plas|film transparente|servilleta|servilletas|plato desechable|vaso desechable|cubiertos desechables|bombilla|bombillas|carbón|carbon|iniciador de fuego|parrilla|maceta|tierra de hojas)/i },
  { id: 'varios', nombre: 'Otros / Varios', icono: '🛒', regex: /.*/ }
];

function clasificarProducto(texto) {
  for (const cat of CATEGORIAS) {
    if (cat.id !== 'varios' && cat.regex.test(texto)) return cat;
  }
  return CATEGORIAS.find(c => c.id === 'varios');
}

function vibrarConfirmacion() {
  try {
    if ("vibrate" in navigator) {
      window.navigator.vibrate(40);
    }
  } catch (e) {}
}

function feedbackProductoAgregado(esLote = false) {
  try {
    if ("vibrate" in navigator) {
      window.navigator.vibrate(esLote ? [35, 28, 55] : [28, 22, 42]);
    }
  } catch (e) {}

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const now = ctx.currentTime;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(660, now);
    osc2.frequency.setValueAtTime(esLote ? 990 : 880, now + 0.07);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.11);
    osc2.start(now + 0.075);
    osc2.stop(now + 0.21);
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 350);
  } catch (e) {}
}

function feedbackProductoComprado() {
  try {
    if ('vibrate' in navigator) navigator.vibrate([24, 18, 58]);
  } catch (e) {}

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const notas = [523.25, 659.25, 783.99];

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    gain.connect(ctx.destination);

    notas.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);
      osc.connect(gain);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.11);
    });
    setTimeout(() => { try { ctx.close(); } catch(e){} }, 420);
  } catch (e) {}
}


function reproducirSonidoAlertaPresupuesto(tipo = 'cerca') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(tipo === 'excedido' ? 0.07 : 0.045, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    gain.connect(ctx.destination);
    const notas = tipo === 'excedido' ? [440, 330] : [620, 760];
    notas.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = tipo === 'excedido' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      osc.connect(gain);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.12);
    });
    if ('vibrate' in navigator) navigator.vibrate(tipo === 'excedido' ? [50, 45, 90] : [35, 30, 45]);
    setTimeout(() => { try { ctx.close(); } catch(e){} }, 500);
  } catch (e) {}
}

function reproducirSonidoCompraCompletada() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.065, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    gain.connect(ctx.destination);
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.075);
      osc.connect(gain);
      osc.start(now + idx * 0.075);
      osc.stop(now + idx * 0.075 + 0.15);
    });
    if ('vibrate' in navigator) navigator.vibrate([35, 25, 50, 25, 90]);
    setTimeout(() => { try { ctx.close(); } catch(e){} }, 650);
  } catch (e) {}
}

function mostrarToast(mensaje, conUndo = false, callbackUndo = null) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const btnUndo = document.getElementById('btnUndoToast');

  if (timerToast) clearTimeout(timerToast);

  toastMsg.textContent = mensaje;
  btnUndo.style.display = conUndo ? 'inline-block' : 'none';

  if (conUndo && callbackUndo) {
    ultimaAccionDeshacer = callbackUndo;
  } else {
    ultimaAccionDeshacer = null;
  }

  toast.classList.add('show');
  timerToast = setTimeout(() => {
    toast.classList.remove('show');
  }, 4500);
}

function ejecutarAccionDeshacer() {
  if (typeof ultimaAccionDeshacer === 'function') {
    const fn = ultimaAccionDeshacer;
    ultimaAccionDeshacer = null;
    fn();
    document.getElementById('toast').classList.remove('show');
  }
}

function ingresarAppDesdePortada() {
  vibrarConfirmacion();
  localStorage.setItem('portadaVista_v1', 'true');
  verSeccion('inicio');
}

window.addEventListener('beforeinstallprompt', (e) => {
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    return;
  }
  e.preventDefault();
  diferidoPromptInstalacion = e;
  const btnInstalar = document.getElementById('btnInstalarPWA');
  if (btnInstalar) btnInstalar.style.display = 'flex';
});

function instalarAplicacionPWA() {
  if (diferidoPromptInstalacion) {
    diferidoPromptInstalacion.prompt();
    diferidoPromptInstalacion.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        document.getElementById('btnInstalarPWA').style.display = 'none';
        registrarEventoGA('pwa_install_accepted');
      } else {
        registrarEventoGA('pwa_install_declined');
      }
      diferidoPromptInstalacion = null;
    });
  }
}

async function togglePantallaEncendida() {
  vibrarConfirmacion();
  const btn = document.getElementById('btnWakeLock');

  if ('wakeLock' in navigator) {
    try {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        btn.classList.add('active-mode');
        btn.innerHTML = `${iconoUI('bulb')}<span>Encendida (ON)</span>`;
        mostrarToast("💡 Pantalla fijada: No se apagará mientras compras");
      } else {
        await wakeLockSentinel.release();
        wakeLockSentinel = null;
        btn.classList.remove('active-mode');
        btn.innerHTML = `${iconoUI('bulb')}<span>Mantener Pantalla Encendida</span>`;
        mostrarToast("💡 Pantalla devuelta a modo normal");
      }
    } catch (err) {
      mostrarToast("⚠️ No se pudo bloquear el apagado");
    }
  } else {
    mostrarToast("⚠️ Tu navegador no admite bloqueo de apagado");
  }
}

function cambiarTamanoLetra(delta) {
  vibrarConfirmacion();
  escalaFuenteActual = Math.min(Math.max(0.85, escalaFuenteActual + delta), 1.45);
  document.documentElement.style.setProperty('--font-scale', escalaFuenteActual);
  localStorage.setItem('tamanoFuente_v1', escalaFuenteActual);
}

function cargarTamanoLetra() {
  const guardada = localStorage.getItem('tamanoFuente_v1');
  if (guardada) {
    escalaFuenteActual = parseFloat(guardada);
    document.documentElement.style.setProperty('--font-scale', escalaFuenteActual);
  }
}

function comprobarTutorialPrimeraVez() {
  const visto = localStorage.getItem('tutorialVisto_v10');
  if (!visto) abrirTutorial();
}

function abrirTutorial() {
  vibrarConfirmacion();
  pasoActualTutorial = 0;
  actualizarTutorialUI();
  document.getElementById('tutorialOverlay').classList.add('active');
}

function cerrarTutorial() {
  vibrarConfirmacion();
  document.getElementById('tutorialOverlay').classList.remove('active');
  localStorage.setItem('tutorialVisto_v10', 'true');
}

function pasoTutorial(dir) {
  vibrarConfirmacion();
  pasoActualTutorial += dir;
  if (pasoActualTutorial < 0) pasoActualTutorial = 0;
  if (pasoActualTutorial >= pasosTutorialData.length) {
    cerrarTutorial();
    return;
  }
  actualizarTutorialUI();
}

function actualizarTutorialUI() {
  const data = pasosTutorialData[pasoActualTutorial];
  document.getElementById('tutIcon').textContent = data.icon;
  document.getElementById('tutBadge').textContent = `Paso ${pasoActualTutorial + 1} de ${pasosTutorialData.length}`;
  document.getElementById('tutTitle').textContent = data.title;
  document.getElementById('tutDesc').textContent = data.desc;
  const tutTip = document.getElementById('tutTip');
  if (tutTip) { tutTip.textContent = data.tip || ''; tutTip.style.display = data.tip ? 'block' : 'none'; }

  const btnPrev = document.getElementById('btnTutPrev');
  const btnNext = document.getElementById('btnTutNext');

  btnPrev.style.display = pasoActualTutorial === 0 ? 'none' : 'block';
  btnNext.textContent = pasoActualTutorial === pasosTutorialData.length - 1 ? '¡Entendido! 👍' : 'Siguiente ➔';

  const dotsContainer = document.getElementById('tutorialDots');
  dotsContainer.innerHTML = '';
  pasosTutorialData.forEach((_, idx) => {
    const dot = document.createElement('span');
    dot.className = `dot ${idx === pasoActualTutorial ? 'active' : ''}`;
    dotsContainer.appendChild(dot);
  });
}

function animarEntradaSeccion(elemento) {
  if (!elemento || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  elemento.classList.remove('ui-section-enter');
  void elemento.offsetWidth;
  elemento.classList.add('ui-section-enter');
  setTimeout(() => elemento.classList.remove('ui-section-enter'), 280);
}

function prepararAnimacionEscalonada(elemento, indice = 0) {
  if (!elemento || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  elemento.classList.add('ui-stagger-in');
  elemento.style.setProperty('--ui-delay', `${Math.min(indice, 10) * 24}ms`);
  setTimeout(() => {
    elemento.classList.remove('ui-stagger-in');
    elemento.style.removeProperty('--ui-delay');
  }, 520);
}

// NAVEGACIÓN INSTANTÁNEA ENTRE SECCIONES (SIN BUGS DE TRANSICIONES)
// Guardamos la sección visible para no volver a animar toda Lista Actual
// cada vez que Firebase o una edición local obliga a renderizar productos.
let seccionActualUI = null;

function verSeccion(seccion) {
  const cambioRealDeSeccion = seccionActualUI !== seccion;
  seccionActualUI = seccion;
  vibrarConfirmacion();
  const secPortada = document.getElementById('secPortada');
  const secInicio = document.getElementById('secInicio');
  const secMisListas = document.getElementById('secMisListas');
  const secListaActiva = document.getElementById('secListaActiva');

  const barraNavegacion = document.getElementById('barraNavegacion');
  const navInicio = document.getElementById('navInicio');
  const navMisListas = document.getElementById('navMisListas');
  const navListaActiva = document.getElementById('navListaActiva');

  secPortada.style.display = 'none';
  secInicio.style.display = 'none';
  secMisListas.style.display = 'none';
  secListaActiva.style.display = 'none';

  navInicio.classList.remove('active');
  navMisListas.classList.remove('active');
  navListaActiva.classList.remove('active');

  if (seccion !== 'lista-activa') {
    if (dbListenerRef) {
      try { dbListenerRef.off(); } catch(e) {}
      dbListenerRef = null;
    }
    limpiarPresenciaLista();
  }

  if (cambioRealDeSeccion && seccion !== 'portada') {
    try { window.scrollTo({ top: 0, behavior: 'instant' }); }
    catch(e) { window.scrollTo(0, 0); }
  }

  if (seccion === 'portada') {
    secPortada.style.display = 'block';
    barraNavegacion.style.display = 'none';
    animarEntradaSeccion(secPortada);
  } else if (seccion === 'inicio') {
    secInicio.style.display = 'block';
    barraNavegacion.style.display = 'flex';
    navInicio.classList.add('active');
    renderizarInicio();
    animarEntradaSeccion(secInicio);
  } else if (seccion === 'mis-listas') {
    secMisListas.style.display = 'block';
    barraNavegacion.style.display = 'flex';
    navMisListas.classList.add('active');
    renderizarListas();
    animarEntradaSeccion(secMisListas);
  } else {
    if (coleccionListas.length === 0) {
      mostrarToast("⚠️ Primero debes crear una lista de compras");
      verSeccion('mis-listas');
      return;
    }

    if (!idListaActiva || !coleccionListas.some(lista => String(lista.id) === String(idListaActiva))) {
      const ultimaVisitada = obtenerUltimaListaVisitada();
      idListaActiva = ultimaVisitada ? ultimaVisitada.id : coleccionListas[0].id;
    }

    secListaActiva.style.display = 'block';
    barraNavegacion.style.display = 'flex';
    navListaActiva.classList.add('active');
    escucharSincronizacionFirebase(idListaActiva);
    renderizarProductos(cambioRealDeSeccion);
    if (cambioRealDeSeccion) animarEntradaSeccion(secListaActiva);
  }
}

function obtenerUltimaListaVisitada() {
  if (!coleccionListas.length) return null;

  const idGuardado = localStorage.getItem('ultimaListaActiva_v1');
  if (idGuardado) {
    const encontrada = coleccionListas.find(lista => String(lista.id) === String(idGuardado));
    if (encontrada) return encontrada;
  }

  // Si la lista guardada ya no existe, usamos una alternativa válida y
  // actualizamos el registro para evitar que Inicio apunte a una lista obsoleta.
  const alternativa = coleccionListas[0] || null;
  if (alternativa) {
    localStorage.setItem('ultimaListaActiva_v1', String(alternativa.id));
  } else {
    localStorage.removeItem('ultimaListaActiva_v1');
  }
  return alternativa;
}

function iconoUI(nombre, clase = 'ui-icon') {
  const paths = {
    user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    target: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1.5"></circle>',
    edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5z"></path>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 10v7M14 10v7"></path>',
    list: '<rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 8h8M8 12h8M8 16h5"></path>',
    bulb: '<path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M8.5 14.5A6 6 0 1 1 15.5 14.5c-.9.7-1.5 1.5-1.5 2.5h-4c0-1-.6-1.8-1.5-2.5z"></path>',
    pin: '<path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11z"></path><circle cx="12" cy="10" r="2"></circle>'
  };
  return `<svg class="${clase}" viewBox="0 0 24 24" aria-hidden="true">${paths[nombre] || ''}</svg>`;
}

function renderizarInicio() {
  const widget = document.getElementById('widgetUltimaLista');
  widget.innerHTML = "";

  const ultima = obtenerUltimaListaVisitada();
  if (ultima) {
    const pendientes = (ultima.items || []).filter(i => !i.comprado).length;

    widget.innerHTML = `
      <div class="recent-list-widget" onclick="abrirLista('${ultima.id}')">
        <h4>${iconoUI('list')}<span>Continuar con tu última lista</span></h4>
        <div style="font-weight: 800; font-size: 1.1rem; color: var(--text);">${escapeHtml(ultima.nombre)}</div>
        <div style="font-size: 0.88rem; color: var(--text-muted); margin-top: 2px;">
          ${pendientes} productos pendientes de ${(ultima.items || []).length} en total. ➔
        </div>
      </div>
    `;
  }
}

function exportarBackup() {
  vibrarConfirmacion();
  if (coleccionListas.length === 0) {
    mostrarToast("⚠️ No hay listas para exportar");
    return;
  }
  const respaldoCompleto = {
    formato: 'mis-listas-compras-backup', version: 2, fecha: Date.now(),
    listas: coleccionListas,
    datosLocales: {
      memoriaPrecios: memoriaPreciosLocal,
      memoriaNombresCodigos,
      frecuentes: estadisticasFrecuencia,
      historialCompras,
      estadisticasAnuales: estadisticasAnualesLocal
    }
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(respaldoCompleto));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `mis_listas_compras_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  mostrarToast("💾 Respaldo guardado con éxito");
  registrarEventoGA('backup_exported');
}

function importarBackup(e) {
  vibrarConfirmacion();
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const importadas = JSON.parse(evt.target.result);
      if (Array.isArray(importadas)) {
        coleccionListas = importadas;
      } else if (importadas && Array.isArray(importadas.listas)) {
        coleccionListas = importadas.listas;
        const d = importadas.datosLocales || {};
        if (d.memoriaPrecios && typeof d.memoriaPrecios === 'object') memoriaPreciosLocal = d.memoriaPrecios;
        if (d.memoriaNombresCodigos && typeof d.memoriaNombresCodigos === 'object') memoriaNombresCodigos = d.memoriaNombresCodigos;
        if (d.frecuentes && typeof d.frecuentes === 'object') estadisticasFrecuencia = d.frecuentes;
        if (Array.isArray(d.historialCompras)) historialCompras = d.historialCompras;
        if (d.estadisticasAnuales && typeof d.estadisticasAnuales === 'object') estadisticasAnualesLocal = d.estadisticasAnuales;
        try { localStorage.setItem('memoriaPrecios_v2', JSON.stringify(memoriaPreciosLocal)); } catch(e){}
        try { localStorage.setItem('memoriaNombresCodigos_v1', JSON.stringify(memoriaNombresCodigos)); } catch(e){}
        try { localStorage.setItem('frecuentes_v1', JSON.stringify(estadisticasFrecuencia)); } catch(e){}
        try { localStorage.setItem('historialCompras_v1', JSON.stringify(historialCompras)); } catch(e){}
        guardarEstadisticasAnuales();
      } else { throw new Error(); }
      guardarStorage();
      cargarStorage(); // vuelve a leer lo importado pasando por la misma limpieza que al abrir la app
      actualizarSugerenciasFrecuentes();
      renderizarListas();
      mostrarToast("📂 Respaldo completo cargado correctamente");
      registrarEventoGA('backup_imported');
    } catch (err) {
      mostrarToast("⚠️ Archivo de respaldo no válido");
      registrarEventoGA('backup_import_error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function moverCategoria(index, direccion) {
  vibrarConfirmacion();
  const nuevoIndex = index + direccion;
  if (nuevoIndex < 0 || nuevoIndex >= CATEGORIAS.length) return;
  
  const temp = CATEGORIAS[index];
  CATEGORIAS[index] = CATEGORIAS[nuevoIndex];
  CATEGORIAS[nuevoIndex] = temp;

  guardarOrdenCategorias();
  renderizarProductos();
}

function guardarOrdenCategorias() {
  const ordenIds = CATEGORIAS.map(c => c.id);
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if(lista){ lista.ui={...(lista.ui||{}),categoryOrder:ordenIds}; guardarStorage(); }
  localStorage.setItem('ordenPasillos_v1', JSON.stringify(ordenIds));
}

function aplicarOrdenCategoriasLista(lista) {
  let orden = lista?.ui?.categoryOrder;
  if(!Array.isArray(orden)){ try{orden=JSON.parse(localStorage.getItem('ordenPasillos_v1')||'[]');}catch(e){orden=[];} }
  if(Array.isArray(orden)&&orden.length){ CATEGORIAS.sort((a,b)=>{const ia=orden.indexOf(a.id),ib=orden.indexOf(b.id); return (ia<0?999:ia)-(ib<0?999:ib);}); }
}

function cargarOrdenCategorias() {
  const datos = localStorage.getItem('ordenPasillos_v1');
  if (datos) {
    try {
      const ordenIds = JSON.parse(datos);
      CATEGORIAS.sort((a, b) => ordenIds.indexOf(a.id) - ordenIds.indexOf(b.id));
    } catch (e) {}
  }
}
