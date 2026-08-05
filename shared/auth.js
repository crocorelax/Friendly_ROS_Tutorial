// ════════════════════════════════════════════════════════════
// AUTHENTIFICATION & GESTION UTILISATEURS — Supabase
// Dépend de : supabase-client.js, storage.js
// ════════════════════════════════════════════════════════════

const Auth = (() => {

  // Script exemple injecté pour chaque nouveau joueur
  const EXAMPLE_BLOCKS = [
    { type: 'move', val: 3 },
    { type: 'turn', val: 90 },
    { type: 'move', val: 2 },
    { type: 'turn', val: -90 },
    { type: 'move', val: 3 },
  ];

  // Cache en mémoire du profil courant (null avant init())
  let _profile = null;

  // true si la session courante est une session invité (locale, pas de compte Supabase)
  let _isGuest = false;

  // ── Helpers internes ─────────────────────────────────────

  // Écrit un snapshot du profil dans bipboup_session (pour les gardes inline)
  function _writeLocalSession(p) {
    Storage.setSession({
      username:           p.username,
      role:               p.role,
      lives:              p.lives,
      score_low:          p.score_low          || 0,
      score_high:         p.score_high         || 0,
      score_pathfinding:  p.score_pathfinding  || 0,
      score_fusion:       p.score_fusion       || 0,
      score_dashboard:    p.score_dashboard    || 0,
      progress_low:       p.progress_low       || 1,
      guest:               !!p.guest,
      loginAt:            Date.now(),
    });
  }

  // Applique une mutation à la session invité stockée localement
  // (mode découverte : rien n'est jamais envoyé à Supabase)
  function _updateGuestSession(mutate) {
    const s = Storage.getSession();
    if (!s || !s.guest) return;
    mutate(s);
    Storage.setSession(s);
  }

  // Charge le profil depuis la table profiles et le met en cache
  async function _fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    _profile = data;
    _writeLocalSession(data);
    return data;
  }

  // ── Initialisation — appeler au DOMContentLoaded ─────────
  // Restaure la session Supabase depuis le SDK (autoRefresh)
  // et peuple le cache _profile.

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Une session invité locale n'a pas de pendant Supabase : on la conserve.
      const local = Storage.getSession();
      if (local && local.guest) { _isGuest = true; _profile = null; return; }
      // Sinon, invalide le miroir localStorage si Supabase dit "non connecté"
      Storage.clearSession();
      _profile = null;
      return;
    }
    _isGuest = false;
    const p = await _fetchProfile(session.user.id);
    if (!p) {
      // Compte Supabase sans profil (ex : supprimé par admin)
      await supabase.auth.signOut();
      Storage.clearSession();
      _profile = null;
    }
  }

  // ── Login / Register / Logout (async) ────────────────────

  async function login(username, password) {
    const email = `${username.toLowerCase()}@bipboup.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = /invalid|credential/i.test(error.message)
        ? 'Identifiants incorrects'
        : error.message;
      return { ok: false, error: msg };
    }
    const p = await _fetchProfile(data.user.id);
    if (!p) {
      await supabase.auth.signOut();
      return { ok: false, error: 'Compte introuvable — contacte un administrateur.' };
    }
    return { ok: true };
  }

  async function register(username, password) {
    if (username.length < 3)     return { ok: false, error: 'Pseudo trop court (min. 3 car.)' };
    if (password.length < 4)     return { ok: false, error: 'Mot de passe trop court (min. 4 car.)' };
    if (!/^\w+$/.test(username)) return { ok: false, error: 'Pseudo : lettres, chiffres et _ seulement' };

    // Vérifie la disponibilité du pseudo
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();
    if (existing) return { ok: false, error: 'Pseudo déjà utilisé' };

    const email = `${username.toLowerCase()}@bipboup.local`;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error)      return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: 'Erreur lors de la création du compte.' };

    // Crée le profil dans la table
    const { error: profErr } = await supabase.from('profiles').insert({
      id:           data.user.id,
      username:     username.toLowerCase(),
      role:         'player',
      lives:        3,
      score_low:    0,
      score_high:   0,
      progress_low: 1,
    });
    if (profErr) return { ok: false, error: 'Erreur profil: ' + profErr.message };

    // Script exemple de départ
    await _seedScript(data.user.id, username.toLowerCase());

    return login(username, password);
  }

  // Démarre une session invité locale : aucun compte Supabase, aucune écriture
  // serveur. Toute la progression (vies, scores, niveaux) reste en mémoire
  // localStorage et disparaît à la déconnexion / fermeture du navigateur.
  function loginGuest() {
    _isGuest = true;
    _profile = null;
    _writeLocalSession({
      username:     'invité',
      role:         'guest',
      lives:        3,
      score_low:    0,
      score_high:   0,
      score_pathfinding: 0,
      score_fusion: 0,
      score_dashboard:   0,
      progress_low: 1,
      guest:        true,
    });
    return { ok: true };
  }

  function isGuest() {
    if (_isGuest) return true;
    const s = Storage.getSession();
    return !!(s && s.guest);
  }

  async function logout() {
    if (!isGuest()) await supabase.auth.signOut();
    _isGuest = false;
    _profile = null;
    Storage.clearSession();
  }

  // ── Accès SYNCHRONES (cache + localStorage) ───────────────
  // Disponibles immédiatement sans await, depuis n'importe quelle page.
  // init() doit avoir été appelé au moins une fois pour que _profile
  // soit à jour ; en attendant, getCurrentUser() tombe sur le miroir
  // localStorage écrit lors du dernier login.

  function getSession() {
    if (_profile) {
      return { username: _profile.username, role: _profile.role, loginAt: Date.now() };
    }
    return Storage.getSession();   // fallback avant init()
  }

  function getCurrentUser() {
    if (_profile) {
      return {
        username: _profile.username,
        role:     _profile.role,
        lives:    _profile.lives,
        scores: {
          low:          _profile.score_low          || 0,
          high:         _profile.score_high         || 0,
          pathfinding:  _profile.score_pathfinding  || 0,
          fusion:       _profile.score_fusion       || 0,
          dashboard:    _profile.score_dashboard    || 0,
        },
        progress: { lowUnlocked: _profile.progress_low || 1 },
      };
    }
    // Fallback sur le miroir localStorage (avant init)
    const s = Storage.getSession();
    if (!s) return null;
    return {
      username: s.username,
      role:     s.role,
      lives:    typeof s.lives === 'number' ? s.lives : 3,
      scores: {
        low:          s.score_low          || 0,
        high:         s.score_high         || 0,
        pathfinding:  s.score_pathfinding  || 0,
        fusion:       s.score_fusion       || 0,
        dashboard:    s.score_dashboard    || 0,
      },
      progress: { lowUnlocked: s.progress_low || 1 },
    };
  }

  function isAdmin() {
    if (_profile) return _profile.role === 'admin';
    const s = Storage.getSession();
    return !!(s && s.role === 'admin');
  }

  // ── Mise à jour du profil (async, optimiste) ──────────────

  async function updateScore(username, tier, score) {
    const tierToCol = {
      low: 'score_low', high: 'score_high',
      pathfinding: 'score_pathfinding', fusion: 'score_fusion', dashboard: 'score_dashboard',
    };
    const col = tierToCol[tier];
    if (isGuest()) {
      // Mode découverte : score gardé localement, jamais envoyé au serveur
      if (col) _updateGuestSession(s => { s[col] = Math.max(s[col] || 0, score); });
      return;
    }
    if (_profile && col && _profile.username === username.toLowerCase()) {
      if (score <= (_profile[col] || 0)) return; // pas d'amélioration
      // Mise à jour optimiste du cache (callers sync voient la valeur immédiatement)
      _profile[col] = score;
      _writeLocalSession(_profile);
    }
    // Appel sécurisé via fonction SECURITY DEFINER — le serveur vérifie
    // que le score ne peut que progresser (GREATEST) et que c'est bien sa session
    await supabase.rpc('fn_update_score', {
      p_username: username.toLowerCase(),
      p_tier:     tier,
      p_score:    score,
    });
  }

  async function loseLive(username) {
    if (isGuest()) {
      _updateGuestSession(s => { s.lives = Math.max(0, (s.lives || 0) - 1); });
      return;
    }
    if (!_profile || _profile.role === 'admin') return;
    if (_profile.username !== username.toLowerCase()) return;
    // Optimiste
    _profile.lives = Math.max(0, (_profile.lives || 0) - 1);
    _writeLocalSession(_profile);
    // Appel sécurisé — le serveur vérifie que c'est bien sa session et bloque à 0
    await supabase.rpc('fn_lose_live', { p_username: username.toLowerCase() });
  }

  async function restoreLives(username, count = 3) {
    if (isGuest()) {
      _updateGuestSession(s => { s.lives = count; });
      return;
    }
    // Réservé à l'admin (vérifié côté serveur dans fn_admin_restore_lives)
    await supabase.rpc('fn_admin_restore_lives', {
      p_username: username.toLowerCase(),
      p_lives:    count,
    });
    if (_profile && _profile.username === username.toLowerCase()) {
      _profile.lives = count;
      _writeLocalSession(_profile);
    }
  }

  async function unlockLevel(tier, level) {
    const col = `progress_${tier}`;
    if (isGuest()) {
      _updateGuestSession(s => { s[col] = Math.max(s[col] || 1, level); });
      return;
    }
    const current = _profile ? (_profile[col] || 1) : 1;
    if (level <= current || !_profile) return;
    // Optimiste
    _profile[col] = level;
    _writeLocalSession(_profile);
    // Appel sécurisé — le serveur vérifie session et ne recule jamais (GREATEST)
    await supabase.rpc('fn_unlock_level', {
      p_username: _profile.username,
      p_tier:     tier,
      p_level:    level,
    });
  }

  // ── Leaderboard (async) ───────────────────────────────────

  async function getLeaderboard(tier) {
    const { data } = await supabase
      .from('profiles')
      .select('username, score_low, score_high')
      .eq('role', 'player');
    if (!data) return [];
    return data.map(u => {
      const score = tier === 'combined'
        ? (u.score_low || 0) + (u.score_high || 0)
        : tier === 'low' ? (u.score_low || 0) : (u.score_high || 0);
      return { username: u.username, score, low: u.score_low || 0, high: u.score_high || 0 };
    }).sort((a, b) => b.score - a.score);
  }

  // ── Admin ─────────────────────────────────────────────────

  async function getAllUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'player')
      .order('created_at');
    return data || [];
  }

  // ── Seed script exemple ───────────────────────────────────

  async function _seedScript(userId, username) {
    await supabase.from('scripts').insert({
      id:         'ex_' + Date.now().toString(36),
      name:       'script_exemple',
      tier:       'low',
      level:      1,
      user_id:    userId,
      username,
      blocks:     EXAMPLE_BLOCKS,
      is_example: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return {
    init, login, register, logout, loginGuest, isGuest,
    getSession, getCurrentUser, isAdmin,
    updateScore, loseLive, restoreLives, unlockLevel,
    getLeaderboard, getAllUsers,
  };
})();
