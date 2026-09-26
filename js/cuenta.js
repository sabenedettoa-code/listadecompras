// Cuenta opcional (Google / Facebook / invitado)
let cuentaEsAccesoInicial = false;
function esCuentaRegistrada(user = auth.currentUser) { return Boolean(user && !user.isAnonymous); }
function nombreProveedorCuenta(user = auth.currentUser) { if(!user||!Array.isArray(user.providerData))return ''; const ids=user.providerData.map(p=>p&&p.providerId).filter(Boolean); if(ids.includes('google.com'))return 'Google'; if(ids.includes('facebook.com'))return 'Facebook'; return ids.length?'Cuenta':''; }
function nombreCompletoUsuario(user = auth.currentUser) {
  if (!esCuentaRegistrada(user)) return '';
  const directo = String(user?.displayName || '').trim();
  if (directo) return directo;
  const datosProveedor = Array.isArray(user?.providerData) ? user.providerData : [];
  const proveedorConNombre = datosProveedor.find(p => p && String(p.displayName || '').trim());
  if (proveedorConNombre) return String(proveedorConNombre.displayName).trim();
  return '';
}
function primerNombreUsuario(user = auth.currentUser) {
  const nombre = nombreCompletoUsuario(user);
  if (nombre) return nombre.split(/\s+/)[0];
  return '';
}
async function completarPerfilDesdeProveedor(resultado) {
  const user = resultado?.user || auth.currentUser;
  if (!user || user.isAnonymous) return user;
  if (String(user.displayName || '').trim()) return user;
  const perfil = resultado?.additionalUserInfo?.profile || {};
  const nombreProveedor = String(perfil.name || perfil.given_name || '').trim();
  const fotoProveedor = String(perfil.picture || '').trim();
  if (nombreProveedor) {
    try {
      await user.updateProfile({ displayName: nombreProveedor, photoURL: user.photoURL || fotoProveedor || null });
      await user.reload();
      usuarioFirebase = auth.currentUser;
      return auth.currentUser;
    } catch (e) {
      console.warn('No se pudo guardar el nombre del proveedor en Firebase:', e);
    }
  }
  return user;
}
function actualizarSaludoInicio(user = auth.currentUser) {
  const el = document.getElementById('saludoInicio');
  if (!el) return;
  const nombre = primerNombreUsuario(user);
  el.textContent = nombre ? `¡Hola, ${nombre}! ¿Qué compras haremos hoy?` : '¡Hola! ¿Qué compras haremos hoy?';
}
function mostrarErrorCuenta(mensaje, registrada=false){const el=document.getElementById(registrada?'authCuentaErrorRegistrada':'authCuentaError');if(!el)return;el.textContent=mensaje||'';el.classList.toggle('show',Boolean(mensaje));}
function actualizarUIcuenta(user=auth.currentUser){
  const registrado=esCuentaRegistrada(user);
  const title=document.getElementById('accountStatusTitle'),subtitle=document.getElementById('accountStatusSubtitle'),avatar=document.getElementById('accountStatusAvatar');
  const pInv=document.getElementById('cuentaInvitadoPanel'),pReg=document.getElementById('cuentaRegistradaPanel');
  const btnHeader=document.getElementById('btnHeaderCuenta'),btnHeaderTexto=document.getElementById('btnHeaderCuentaTexto');
  if(title)title.textContent=registrado?(nombreCompletoUsuario(user)||'Mi cuenta'):'Invitado';
  if(subtitle)subtitle.textContent=registrado?`Conectado con ${nombreProveedorCuenta(user)}`:'Guarda tus listas en tu cuenta';
  if(avatar)avatar.innerHTML=registrado&&user.photoURL?`<img src="${escapeHtml(user.photoURL)}" alt="">`:iconoUI('user','ui-icon ui-icon-lg');
  if(btnHeaderTexto) btnHeaderTexto.textContent = registrado ? (primerNombreUsuario(user)||'Mi cuenta') : 'Iniciar sesión';
  if(btnHeader){
    const foto = registrado && user.photoURL ? `<img src="${escapeHtml(user.photoURL)}" alt="">` : iconoUI('user','ui-icon ui-icon-lg');
    btnHeader.innerHTML = `${foto}<span id="btnHeaderCuentaTexto">${escapeHtml(registrado ? (primerNombreUsuario(user)||'Mi cuenta') : 'Iniciar sesión')}</span>`;
    btnHeader.setAttribute('aria-label', registrado ? 'Administrar mi cuenta' : 'Iniciar sesión');
  }
  if(pInv)pInv.style.display=registrado?'none':'block';if(pReg)pReg.style.display=registrado?'block':'none';
  if(registrado){const a=document.getElementById('authProfileAvatar'),n=document.getElementById('authProfileName'),e=document.getElementById('authProfileEmail');if(a)a.innerHTML=user.photoURL?`<img src="${escapeHtml(user.photoURL)}" alt="">`:iconoUI('user','ui-icon ui-icon-lg');if(n)n.textContent=nombreCompletoUsuario(user)||'Mi cuenta';if(e)e.textContent=user.email||`Cuenta de ${nombreProveedorCuenta(user)}`;}
  actualizarSaludoInicio(user);
}
function abrirModalCuenta(esInicial=false){
  if(document.getElementById('sidebarMenu')?.classList.contains('active'))toggleSidebar();
  cuentaEsAccesoInicial = Boolean(esInicial);
  mostrarErrorCuenta('');mostrarErrorCuenta('',true);actualizarUIcuenta();
  document.getElementById('cuentaOverlay')?.classList.add('active');
}
function cerrarModalCuenta(forzar=false){
  if(cuentaEsAccesoInicial && !forzar) return;
  document.getElementById('cuentaOverlay')?.classList.remove('active');
  cuentaEsAccesoInicial = false;
}
function resolverAccesoInicial(){
  localStorage.setItem('accesoInicialResuelto_v1','true');
  cuentaEsAccesoInicial = false;
}
async function continuarComoInvitado(){
  resolverAccesoInicial();
  cerrarModalCuenta(true);
  actualizarUIcuenta(auth.currentUser);
  registrarEventoGA('continue_as_guest');
  mostrarToast('👤 Continuas como invitado');
  await procesarListaRecibidaPorURL();
}
function crearProveedorAuth(tipo){if(tipo==='google'){const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});return p;}if(tipo==='facebook'){const p=new firebase.auth.FacebookAuthProvider();p.addScope('email');return p;}throw new Error('Proveedor no disponible');}
const CLAVE_LISTAS_ELIMINADAS_CUENTA = 'listasEliminadasCuenta_v1';
function obtenerListasEliminadasCuenta(){try{const d=JSON.parse(localStorage.getItem(CLAVE_LISTAS_ELIMINADAS_CUENTA)||'{}');return d&&typeof d==='object'?d:{};}catch(e){return {};}}
function guardarListasEliminadasCuenta(data){try{localStorage.setItem(CLAVE_LISTAS_ELIMINADAS_CUENTA,JSON.stringify(data||{}));}catch(e){console.warn('No se pudo guardar el registro de listas eliminadas:',e);}}
function marcarListaEliminadaCuenta(uid,listaId){if(!uid||!listaId)return;const d=obtenerListasEliminadasCuenta();d[uid]=d[uid]||{};d[uid][String(listaId)]=Date.now();guardarListasEliminadasCuenta(d);}
function desmarcarListaEliminadaCuenta(uid,listaId){if(!uid||!listaId)return;const d=obtenerListasEliminadasCuenta();if(d[uid]){delete d[uid][String(listaId)];if(!Object.keys(d[uid]).length)delete d[uid];guardarListasEliminadasCuenta(d);}}
function listaMarcadaComoEliminada(uid,listaId){const d=obtenerListasEliminadasCuenta();return Boolean(uid&&d[uid]&&d[uid][String(listaId)]);}
async function eliminarListaDeCuenta(listaId){const user=auth.currentUser;if(!esCuentaRegistrada(user)||!listaId)return;marcarListaEliminadaCuenta(user.uid,listaId);if(!navigator.onLine)return;try{await db.ref(`usuarios/${user.uid}/listas/${String(listaId)}`).remove();desmarcarListaEliminadaCuenta(user.uid,listaId);}catch(e){console.warn('No se pudo quitar todavía la lista de la cuenta; se reintentará:',e);}}
async function procesarListasEliminadasPendientes(){const user=auth.currentUser;if(!esCuentaRegistrada(user)||!navigator.onLine)return;const d=obtenerListasEliminadasCuenta();const pendientes=Object.keys(d[user.uid]||{});for(const listaId of pendientes){try{await db.ref(`usuarios/${user.uid}/listas/${String(listaId)}`).remove();desmarcarListaEliminadaCuenta(user.uid,listaId);}catch(e){console.warn('Eliminación pendiente no completada para',listaId,e);}}}
async function registrarListaEnCuenta(listaId,nombreLista){const user=auth.currentUser;if(!esCuentaRegistrada(user)||!listaId)return;desmarcarListaEliminadaCuenta(user.uid,listaId);if(!navigator.onLine)return;try{await db.ref(`usuarios/${user.uid}/listas/${String(listaId)}`).set({nombre:String(nombreLista||'Mi Lista').slice(0,100),agregadoEn:firebase.database.ServerValue.TIMESTAMP});}catch(e){console.warn('No se pudo asociar la lista a la cuenta:',e);}}
async function registrarTodasListasLocalesEnCuenta(){const user=auth.currentUser;if(!esCuentaRegistrada(user)||!navigator.onLine)return;await Promise.allSettled((coleccionListas||[]).filter(l=>l&&l.id).map(l=>registrarListaEnCuenta(l.id,l.nombre)));}
async function recuperarListasDeCuenta(){const user=auth.currentUser;if(!esCuentaRegistrada(user)||!navigator.onLine)return 0;try{await procesarListasEliminadasPendientes();const indiceSnap=await db.ref(`usuarios/${user.uid}/listas`).once('value');const indice=indiceSnap.val()||{};let agregadas=0;for(const codigo of Object.keys(indice)){if(listaMarcadaComoEliminada(user.uid,codigo))continue;if(coleccionListas.some(l=>String(l.id)===String(codigo)))continue;try{const snap=await db.ref(`listas/${codigo}`).once('value');const datos=listaDesdeFirebase(snap.val());if(!datos)continue;coleccionListas.push({id:codigo,nombre:datos.nombre||indice[codigo]?.nombre||'Mi Lista',items:itemsDesdeFirebase(datos.items),presupuesto:Number(datos.presupuesto)||0,ui:{filter:'pendientes',focus:false}});agregadas++;}catch(e){console.warn('No se pudo recuperar la lista',codigo,e);}}if(agregadas){guardarStorage();if(typeof renderizarListas==='function')renderizarListas();mostrarToast(`☁️ ${agregadas} lista${agregadas===1?' recuperada':'s recuperadas'} de tu cuenta`);}return agregadas;}catch(e){console.warn('No se pudieron recuperar las listas de la cuenta:',e);return 0;}}
async function finalizarInicioSesionCuenta(){usuarioFirebase=auth.currentUser;actualizarUIcuenta(usuarioFirebase);if(!esCuentaRegistrada(usuarioFirebase))return;resolverAccesoInicial();await registrarTodasListasLocalesEnCuenta();await recuperarListasDeCuenta();registrarEventoGA('account_signed_in',{provider:nombreProveedorCuenta(usuarioFirebase).toLowerCase()||'provider'});mostrarToast('✅ Cuenta conectada · tus listas quedan asociadas');cerrarModalCuenta(true);await procesarListaRecibidaPorURL();}
async function iniciarSesionProveedor(tipo){mostrarErrorCuenta('');let user;try{user=await obtenerUsuarioFirebase();}catch(e){mostrarErrorCuenta('No pudimos preparar el acceso. Revisa tu conexión e inténtalo otra vez.');return;}const provider=crearProveedorAuth(tipo);try{let resultado;if(user.isAnonymous)resultado=await user.linkWithPopup(provider);else resultado=await auth.signInWithPopup(provider);usuarioFirebase=resultado.user;await completarPerfilDesdeProveedor(resultado);usuarioFirebase=auth.currentUser||resultado.user;await finalizarInicioSesionCuenta();}catch(error){console.error(`Error al iniciar con ${tipo}:`,error);const code=String(error?.code||'');if((code==='auth/credential-already-in-use'||code==='auth/account-exists-with-different-credential')&&error.credential){try{const resultado=await auth.signInWithCredential(error.credential);usuarioFirebase=resultado.user;await completarPerfilDesdeProveedor(resultado);usuarioFirebase=auth.currentUser||resultado.user;await finalizarInicioSesionCuenta();return;}catch(e2){console.error('No se pudo recuperar la cuenta existente:',e2);}}if(code==='auth/operation-not-allowed'){mostrarErrorCuenta(tipo==='facebook'?'Facebook todavía no está configurado en Firebase. Puedes usar Google o seguir como invitado.':'Google todavía no está habilitado en Firebase Authentication.');}else if(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request'){mostrarErrorCuenta('Acceso cancelado. Puedes intentarlo nuevamente cuando quieras.');}else if(code==='auth/popup-blocked'){mostrarErrorCuenta('El navegador bloqueó la ventana de acceso. Permite ventanas emergentes para este sitio e inténtalo otra vez.');}else{mostrarErrorCuenta(`No pudimos iniciar sesión${code?` (${code.replace('auth/','')})`:''}.`);}}}
async function cerrarSesionCuenta(){mostrarErrorCuenta('',true);const r=await abrirDialogoApp({icon:'👤',title:'¿Cerrar sesión?',message:'Tus listas seguirán en este dispositivo. La app continuará en modo invitado.',confirmText:'Cerrar sesión',cancelText:'Cancelar'});if(!r.confirmed)return;try{await auth.signOut();const cred=await auth.signInAnonymously();usuarioFirebase=cred.user;actualizarUIcuenta(usuarioFirebase);registrarEventoGA('account_signed_out');mostrarToast('👤 Ahora estás usando la app como invitado');cerrarModalCuenta(true);}catch(e){console.error('Error al cerrar sesión:',e);mostrarErrorCuenta('No pudimos cambiar a modo invitado.',true);}}
