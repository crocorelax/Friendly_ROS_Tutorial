// ════════════════════════════════════════════════════════════
// COUCHE DE STOCKAGE — shim de compatibilité post-migration
//
// La session réelle est gérée par Supabase (auth.js).
// Ce module ne sert plus qu'à lire/écrire bipboup_session
// (utilisé par les gardes inline des pages tutoriels).
// Tous les autres appels (getUsers, setMaps…) sont des stubs
// vides pour éviter des erreurs si une référence traîne.
// ════════════════════════════════════════════════════════════

const Storage = (() => {
  const KEY = 'bipboup_session';
  const _get = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };

  return {
    // Session locale (miroir du profil Supabase, écrit par auth.js)
    getSession:    ()    => _get(),
    setSession:    v     => localStorage.setItem(KEY, JSON.stringify(v)),
    clearSession:  ()    => localStorage.removeItem(KEY),

    // Stubs — n'utilisent plus localStorage, ne font rien
    getUsers:      ()    => ({}),
    setUsers:      ()    => {},
    getMaps:       ()    => [],
    setMaps:       ()    => {},
    getScripts:    ()    => [],
    setScripts:    ()    => {},
    getSharedMaps: ()    => [],
    setSharedMaps: ()    => {},
  };
})();
