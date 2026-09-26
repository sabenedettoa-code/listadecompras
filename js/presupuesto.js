// Gráfico de gastos y tope de presupuesto
function abrirModalGrafico() {
  vibrarConfirmacion();

  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista || !lista.items || lista.items.length === 0) {
    mostrarToast("⚠️ La lista está vacía");
    return;
  }

  document.getElementById('graficoOverlay').classList.add('active');
  
  const totalesPorCat = {};
  lista.items.forEach(i => {
    const cat = clasificarProducto(i.texto).nombre;
    totalesPorCat[cat] = (totalesPorCat[cat] || 0) + (i.cantidad * (i.precio || 0));
  });

  const labels = Object.keys(totalesPorCat);
  const data = Object.values(totalesPorCat);

  const ctx = document.getElementById('chartGastos').getContext('2d');
  if (chartGastosInstance) chartGastosInstance.destroy();

  chartGastosInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

function cerrarModalGrafico() {
  document.getElementById('graficoOverlay').classList.remove('active');
}

function obtenerPresupuestoLista(lista) {
  return Math.max(0, Number(lista && lista.presupuesto) || 0);
}

function fijarLimitePresupuesto() {
  vibrarConfirmacion();
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista) return;

  const input = document.getElementById('presupuestoModalInput');
  const hint = document.getElementById('presupuestoModalHint');
  const actual = obtenerPresupuestoLista(lista);

  input.value = actual > 0 ? formatoNumeroPresupuesto(actual) : '';
  hint.textContent = actual > 0
    ? `Tope actual: ${formatoCLP.format(actual)}`
    : 'Ingresa un monto en pesos chilenos.';

  document.getElementById('presupuestoOverlay').classList.add('active');
  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
}

function cerrarModalPresupuesto() {
  document.getElementById('presupuestoOverlay').classList.remove('active');
}

function formatoNumeroPresupuesto(valor) {
  const numero = Math.max(0, parseInt(valor, 10) || 0);
  return numero ? numero.toLocaleString('es-CL') : '';
}

function obtenerNumeroPresupuestoDesdeInput() {
  const input = document.getElementById('presupuestoModalInput');
  return parseInt(String(input.value).replace(/[^0-9]/g, ''), 10) || 0;
}

function actualizarVistaInputPresupuesto() {
  const input = document.getElementById('presupuestoModalInput');
  const hint = document.getElementById('presupuestoModalHint');
  const numero = obtenerNumeroPresupuestoDesdeInput();

  input.value = formatoNumeroPresupuesto(numero);
  hint.textContent = numero > 0
    ? `Tu tope será ${formatoCLP.format(numero)}`
    : 'Ingresa un monto en pesos chilenos.';
}

function seleccionarPresupuestoRapido(monto) {
  document.getElementById('presupuestoModalInput').value = formatoNumeroPresupuesto(monto);
  actualizarVistaInputPresupuesto();
  vibrarConfirmacion();
}

function guardarPresupuestoDesdeModal() {
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista) return;

  const monto = obtenerNumeroPresupuestoDesdeInput();
  if (monto <= 0) {
    document.getElementById('presupuestoModalHint').textContent = '⚠️ Ingresa un monto mayor a $0.';
    document.getElementById('presupuestoModalInput').focus();
    return;
  }

  lista.presupuesto = monto;
  guardarStorage();
  sincronizarMetaListaFirebase(lista);
  cerrarModalPresupuesto();
  renderizarProductos();
  vibrarConfirmacion();
  mostrarToast(`💰 Tope fijado en ${formatoCLP.format(monto)}`);
  registrarEventoGA('budget_set');
}

function desactivarPresupuestoDesdeModal() {
  const lista = coleccionListas.find(l => String(l.id) === String(idListaActiva));
  if (!lista) return;

  lista.presupuesto = 0;
  guardarStorage();
  sincronizarMetaListaFirebase(lista);
  cerrarModalPresupuesto();
  renderizarProductos();
  vibrarConfirmacion();
  mostrarToast('💰 Tope de presupuesto desactivado');
  registrarEventoGA('budget_removed');
}

document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'presupuestoModalInput') {
    actualizarVistaInputPresupuesto();
  }
});

document.addEventListener('keydown', (e) => {
  if (document.getElementById('appDialogOverlay')?.classList.contains('active')) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelarDialogoApp();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmarDialogoApp();
      return;
    }
  }

  if (e.key === 'Enter' && document.getElementById('presupuestoOverlay')?.classList.contains('active')) {
    e.preventDefault();
    guardarPresupuestoDesdeModal();
  }
});
