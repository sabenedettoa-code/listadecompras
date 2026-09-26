// Detecta un enlace compartido antes del primer render (se carga en <head>).
(function(){
  try {
    const params = new URLSearchParams(window.location.search);
    const sharedId = (params.get('id') || '').trim().toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(sharedId)) {
      document.documentElement.classList.add('shared-link-boot');
      window.__sharedListBootStartedAt = Date.now();
    }
  } catch (e) {}
})();
