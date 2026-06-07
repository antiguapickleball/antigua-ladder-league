/**
 * auth-bridge-client.js — Antigua Ladder League
 *
 * Gestiona la sesión compartida con antigua-pickleball.com.
 * Estrategia (sin iframe, sin cookies):
 *
 *  1. Si la URL contiene ?ap_uid= (redirect post-login), guardar en localStorage
 *     y limpiar los parámetros de la URL.
 *  2. Leer sesión desde localStorage (válida 24 horas).
 *  3. Si no hay sesión, exponer el estado "no autenticado".
 *
 * API pública: window.APAuth
 *   APAuth.onReady(fn)      — fn(user | null) cuando el estado está listo
 *   APAuth.getUser()        — usuario actual (o null)
 *   APAuth.requireLogin()   — redirige al login si no autenticado
 *   APAuth.signOut()        — borrar sesión local
 */

(function() {

  const STORAGE_KEY   = 'ap_session';
  const SESSION_TTL   = 24 * 60 * 60 * 1000; // 24 horas en ms
  const LOGIN_URL     = 'https://antigua-pickleball.com/login.html';

  // ─── 1. Leer params de la URL (vienen del redirect post-login) ───────────
  let _user = null;

  (function readURLParams() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('ap_uid')) return;

    const session = {
      uid:   params.get('ap_uid'),
      name:  params.get('ap_name')  || '',
      email: params.get('ap_email') || '',
      role:  params.get('ap_role')  || 'player',
      ts:    parseInt(params.get('ap_ts') || Date.now(), 10)
    };

    // Guardar en localStorage
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch(_) {}

    // Limpiar params de la URL sin recargar la página
    const clean = new URL(window.location.href);
    ['ap_uid', 'ap_name', 'ap_email', 'ap_role', 'ap_ts'].forEach(k => clean.searchParams.delete(k));
    history.replaceState(null, '', clean.toString());
  })();

  // ─── 2. Leer sesión guardada ─────────────────────────────────────────────
  (function readStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      // Verificar que no haya expirado
      if (Date.now() - s.ts > SESSION_TTL) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      _user = { uid: s.uid, displayName: s.name, email: s.email, role: s.role };
    } catch(_) {}
  })();

  // ─── 3. API pública ──────────────────────────────────────────────────────
  window.APAuth = {

    onReady: function(fn) {
      // Estado disponible sincrónicamente (no hay async aquí)
      fn(_user);
    },

    getUser: function() {
      return _user;
    },

    requireLogin: function() {
      if (!_user) {
        const redirect = encodeURIComponent(window.location.href);
        window.location.href = LOGIN_URL + '?redirect=' + redirect;
      }
    },

    signOut: function() {
      try { localStorage.removeItem(STORAGE_KEY); } catch(_) {}
      _user = null;
      // Opcional: redirigir a logout en antigua-pickleball.com
      // window.location.href = 'https://antigua-pickleball.com/login.html';
    }
  };

})();
