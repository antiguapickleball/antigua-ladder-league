/**
 * auth-bridge-client.js — Antigua Ladder League
 *
 * Usa un iframe oculto apuntando a antigua-pickleball.com/auth-bridge.html
 * para obtener el estado de sesión sin que el usuario tenga que iniciar sesión
 * dos veces. Si no está autenticado, redirige al login del sitio principal
 * con un ?redirect= de vuelta a esta página.
 *
 * Uso:
 *   <script src="js/auth-bridge-client.js"></script>
 *   El script expone window.APAuth con:
 *     APAuth.onReady(callback(user|null))  — llama callback cuando se sabe el estado
 *     APAuth.getUser()                     — devuelve el usuario actual (o null)
 *     APAuth.requireLogin()                — redirige a login si no está autenticado
 */

(function() {

  const BRIDGE_URL   = 'https://antigua-pickleball.com/auth-bridge.html';
  const LOGIN_URL    = 'https://antigua-pickleball.com/login.html';
  const ALLOWED_ORIGIN = 'https://antigua-pickleball.com';
  const TIMEOUT_MS   = 6000; // máximo de espera al bridge

  let _user     = null;
  let _ready    = false;
  let _callbacks = [];

  function _fireCallbacks() {
    _ready = true;
    _callbacks.forEach(fn => fn(_user));
    _callbacks = [];
  }

  // Crear iframe oculto
  const iframe = document.createElement('iframe');
  iframe.src = BRIDGE_URL;
  iframe.style.cssText = 'display:none;width:0;height:0;border:none;position:absolute;';
  iframe.setAttribute('aria-hidden', 'true');
  document.documentElement.appendChild(iframe);

  // Timeout: si el bridge tarda demasiado, asumir no autenticado
  const timer = setTimeout(() => {
    if (!_ready) {
      console.warn('[APAuth] Bridge timeout — asumiendo no autenticado');
      _fireCallbacks();
    }
  }, TIMEOUT_MS);

  // Escuchar respuesta del bridge
  window.addEventListener('message', function(e) {
    if (e.origin !== ALLOWED_ORIGIN) return;
    if (!e.data || e.data.type !== 'AUTH_STATE') return;

    clearTimeout(timer);
    _user = e.data.loggedIn ? e.data.user : null;
    _fireCallbacks();
  });

  // API pública
  window.APAuth = {

    /** Registrar callback que se ejecuta cuando el estado está listo */
    onReady: function(fn) {
      if (_ready) { fn(_user); }
      else { _callbacks.push(fn); }
    },

    /** Devuelve el usuario actual (null si no autenticado o aún cargando) */
    getUser: function() {
      return _user;
    },

    /** Si no está autenticado, redirige al login con redirect de vuelta aquí */
    requireLogin: function() {
      this.onReady(function(user) {
        if (!user) {
          const redirect = encodeURIComponent(window.location.href);
          window.location.href = LOGIN_URL + '?redirect=' + redirect;
        }
      });
    },

    /** Re-solicitar estado al bridge (útil después de una acción) */
    refresh: function() {
      _ready = false;
      _user  = null;
      iframe.contentWindow.postMessage({ type: 'AUTH_REQUEST' }, ALLOWED_ORIGIN);
    }
  };

})();
