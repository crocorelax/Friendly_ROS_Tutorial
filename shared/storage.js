// ════════════════════════════════════════════════════════════
// COUCHE DE STOCKAGE — localStorage (migration DB : remplacer
// uniquement ce module ; l'API publique reste identique)
// ════════════════════════════════════════════════════════════

const Storage = (() => {
  const P = 'bipboup_';
  const _get = k => { try { return JSON.parse(localStorage.getItem(P + k)); } catch { return null; } };
  const _set = (k, v) => localStorage.setItem(P + k, JSON.stringify(v));
  const _del = k => localStorage.removeItem(P + k);

  return {
    // Utilisateurs
    getUsers:      ()    => _get('users') || {},
    setUsers:      v     => _set('users', v),

    // Session courante
    getSession:    ()    => _get('session'),
    setSession:    v     => _set('session', v),
    clearSession:  ()    => _del('session'),

    // Maps par utilisateur
    getMaps:       user  => _get(`maps_${user}`) || [],
    setMaps:       (u,v) => _set(`maps_${u}`, v),

    // Pool de maps partagées (tests de score)
    getSharedMaps: ()    => _get('shared_maps') || [],
    setSharedMaps: v     => _set('shared_maps', v),

    // Scripts par utilisateur
    getScripts:    user  => _get(`scripts_${user}`) || [],
    setScripts:    (u,v) => _set(`scripts_${u}`, v),
  };
})();
