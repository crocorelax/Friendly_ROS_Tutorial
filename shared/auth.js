// ════════════════════════════════════════════════════════════
// AUTHENTIFICATION & GESTION UTILISATEURS
// Dépend de : storage.js
// ════════════════════════════════════════════════════════════

const Auth = (() => {

  // Script exemple donné à chaque nouveau joueur (niveau 1, map default)
  const EXAMPLE_BLOCKS = [
    { type: 'move', val: 3 },
    { type: 'turn', val: 90 },
    { type: 'move', val: 2 },
    { type: 'turn', val: -90 },
    { type: 'move', val: 3 },
  ];

  function _makeUser(username, password, role, lives) {
    return {
      username,
      password,
      role,
      lives,
      scores: { low: 0, high: 0 },
      createdAt: new Date().toISOString(),
    };
  }

  // Crée le compte admin si absent
  function init() {
    const users = Storage.getUsers();
    if (!users.admin) {
      users.admin = _makeUser('admin', 'admin', 'admin', 99);
      Storage.setUsers(users);
    }
  }

  function login(username, password) {
    const users = Storage.getUsers();
    const u = users[username.toLowerCase()];
    if (!u)              return { ok: false, error: 'Utilisateur introuvable' };
    if (u.password !== password) return { ok: false, error: 'Mot de passe incorrect' };
    Storage.setSession({ username: u.username, role: u.role, loginAt: Date.now() });
    return { ok: true };
  }

  function register(username, password) {
    if (username.length < 3)      return { ok: false, error: 'Pseudo trop court (min. 3 car.)' };
    if (password.length < 4)      return { ok: false, error: 'Mot de passe trop court (min. 4 car.)' };
    if (!/^\w+$/.test(username))  return { ok: false, error: 'Pseudo : lettres, chiffres et _ seulement' };
    const users = Storage.getUsers();
    if (users[username.toLowerCase()]) return { ok: false, error: 'Pseudo déjà utilisé' };
    users[username.toLowerCase()] = _makeUser(username, password, 'player', 3);
    Storage.setUsers(users);
    _seedScript(username);
    return login(username, password);
  }

  function logout() { Storage.clearSession(); }

  function getSession()  { return Storage.getSession(); }

  function getCurrentUser() {
    const s = getSession();
    if (!s) return null;
    return Storage.getUsers()[s.username.toLowerCase()] || null;
  }

  function isAdmin() {
    const s = getSession();
    return !!(s && s.role === 'admin');
  }

  function updateScore(username, tier, score) {
    const users = Storage.getUsers();
    const u = users[username.toLowerCase()];
    if (!u) return;
    u.scores = u.scores || { low: 0, high: 0 };
    if (score > (u.scores[tier] || 0)) u.scores[tier] = score;
    Storage.setUsers(users);
  }

  function loseLive(username) {
    const users = Storage.getUsers();
    const u = users[username.toLowerCase()];
    if (!u || u.role === 'admin') return;
    u.lives = Math.max(0, (u.lives || 0) - 1);
    Storage.setUsers(users);
  }

  function restoreLives(username, count = 3) {
    const users = Storage.getUsers();
    const u = users[username.toLowerCase()];
    if (!u) return;
    u.lives = count;
    Storage.setUsers(users);
  }

  function getLeaderboard(tier) {
    const users = Storage.getUsers();
    return Object.values(users)
      .filter(u => u.role === 'player')
      .map(u => {
        const sc = u.scores || {};
        const score = tier === 'combined'
          ? (sc.low || 0) + (sc.high || 0)
          : (sc[tier] || 0);
        return { username: u.username, score, low: sc.low || 0, high: sc.high || 0 };
      })
      .sort((a, b) => b.score - a.score);
  }

  function _seedScript(username) {
    Storage.setScripts(username, [{
      id: 'ex_' + Date.now(),
      name: 'script_exemple',
      tier: 'low',
      level: 1,
      blocks: EXAMPLE_BLOCKS,
      isExample: true,
      lockedToMap: 'default',
      createdAt: new Date().toISOString(),
    }]);
  }

  return {
    init, login, register, logout,
    getSession, getCurrentUser, isAdmin,
    updateScore, loseLive, restoreLives, getLeaderboard,
  };
})();
