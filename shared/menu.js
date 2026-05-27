// ════════════════════════════════════════════════════════════
// LOGIQUE DU MENU PLATEFORME
// Dépend de : storage.js, auth.js
// ════════════════════════════════════════════════════════════

let _currentTab = 'low';

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();

  // Raccourcis clavier login
  ['loginPass', 'loginUser'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); })
  );
  ['regPass2', 'regUser', 'regPass'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); })
  );

  if (Auth.getSession()) showMenu();
  else                   showLogin();
});

// ── Navigation entre écrans ─────────────────────────────

function showLogin() {
  document.getElementById('loginPanel').style.display   = 'flex';
  document.getElementById('registerPanel').style.display = 'none';
  document.getElementById('loginError').textContent = '';
  setTimeout(() => document.getElementById('loginUser').focus(), 50);
}

function showRegister() {
  document.getElementById('loginPanel').style.display   = 'none';
  document.getElementById('registerPanel').style.display = 'flex';
  document.getElementById('regError').textContent = '';
  setTimeout(() => document.getElementById('regUser').focus(), 50);
}

function showMenu() {
  document.getElementById('authScreen').classList.remove('active');
  document.getElementById('menuScreen').classList.add('active');
  _renderUserInfo();
  // Synchronise l'onglet actif avec les boutons
  ['tabLow','tabHigh','tabCombined'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  const activeTab = document.getElementById(
    _currentTab === 'low' ? 'tabLow' : _currentTab === 'high' ? 'tabHigh' : 'tabCombined'
  );
  if (activeTab) activeTab.classList.add('active');
  renderLeaderboard(_currentTab);
}

// ── Handlers auth ───────────────────────────────────────

function handleLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const r = Auth.login(username, password);
  if (r.ok) {
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    showMenu();
  } else {
    document.getElementById('loginError').textContent = r.error;
    document.getElementById('loginPass').select();
  }
}

function handleRegister() {
  const username = document.getElementById('regUser').value.trim();
  const password = document.getElementById('regPass').value;
  const confirm  = document.getElementById('regPass2').value;
  if (password !== confirm) {
    document.getElementById('regError').textContent = 'Les mots de passe ne correspondent pas';
    return;
  }
  const r = Auth.register(username, password);
  if (r.ok) {
    document.getElementById('regUser').value = '';
    document.getElementById('regPass').value = '';
    document.getElementById('regPass2').value = '';
    showMenu();
  } else {
    document.getElementById('regError').textContent = r.error;
  }
}

function handleLogout() {
  Auth.logout();
  document.getElementById('menuScreen').classList.remove('active');
  document.getElementById('authScreen').classList.add('active');
  showLogin();
}

// ── Affichage utilisateur ───────────────────────────────

function _renderUserInfo() {
  const user = Auth.getCurrentUser();
  if (!user) return;

  document.getElementById('ptUsername').textContent = '👤 ' + user.username;

  const livesEl = document.getElementById('ptLives');
  if (user.role === 'admin') {
    livesEl.textContent = '♾ Admin';
  } else {
    const h = Math.min(user.lives, 5);
    livesEl.textContent = '❤️ '.repeat(h).trim() + (user.lives > 5 ? ` ×${user.lives}` : '') || '💀 0 vie';
  }

  const roleEl = document.getElementById('ptRole');
  roleEl.textContent = user.role === 'admin' ? 'ADMIN' : 'JOUEUR';
  if (user.role === 'admin') roleEl.classList.add('admin');
  else                       roleEl.classList.remove('admin');

  // Scores du joueur courant (cachés pour admin)
  const scoresEl = document.getElementById('ptScores');
  if (user.role !== 'admin' && scoresEl) {
    const sc = user.scores || {};
    scoresEl.textContent = `Low: ${sc.low || 0}pts  ·  High: ${sc.high || 0}pts`;
    scoresEl.style.display = '';
  } else if (scoresEl) {
    scoresEl.style.display = 'none';
  }

  document.getElementById('adminSection').style.display =
    user.role === 'admin' ? 'flex' : 'none';
}

// ── Classement ──────────────────────────────────────────

function switchTab(tier) {
  _currentTab = tier;
  document.getElementById('tabLow').classList.toggle('active',      tier === 'low');
  document.getElementById('tabHigh').classList.toggle('active',     tier === 'high');
  document.getElementById('tabCombined').classList.toggle('active', tier === 'combined');
  renderLeaderboard(tier);
}

function renderLeaderboard(tier) {
  const entries = Auth.getLeaderboard(tier);
  const session = Auth.getSession();
  const body    = document.getElementById('lbBody');

  if (!entries.length) {
    body.innerHTML = '<div class="lb-empty">Aucun score pour l\'instant — lance-toi !</div>';
    return;
  }

  const rankCls  = i => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
  const rankIcon = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
  const isMe     = e => e.username === session?.username;

  if (tier === 'combined') {
    body.innerHTML = entries.map((e, i) => `
      <div class="lb-row">
        <span class="lb-rank ${rankCls(i)}">${rankIcon(i)}</span>
        <span class="lb-name ${isMe(e) ? 'me' : ''}">${e.username}${isMe(e) ? ' ← toi' : ''}</span>
        <span class="lb-sub">Low: ${e.low} · High: ${e.high}</span>
        <span class="lb-score">${e.score} pts</span>
      </div>`).join('');
  } else {
    body.innerHTML = entries.map((e, i) => `
      <div class="lb-row">
        <span class="lb-rank ${rankCls(i)}">${rankIcon(i)}</span>
        <span class="lb-name ${isMe(e) ? 'me' : ''}">${e.username}${isMe(e) ? ' ← toi' : ''}</span>
        <span class="lb-score">${e.score} pts</span>
      </div>`).join('');
  }
}

// ── Navigation vers les tiers ───────────────────────────

function goToTier(tier) {
  const path = tier === 'low'
    ? 'Tuto low tier/index.html'
    : 'Tuto high tier/index.html';
  window.location.href = path;
}

// ── Panel Admin ─────────────────────────────────────────

function openAdminPanel() {
  if (!Auth.isAdmin()) return;
  _renderAdminPanel();
  document.getElementById('adminOverlay').style.display = 'block';
  document.getElementById('adminPanel').classList.add('open');
}

function closeAdminPanel() {
  document.getElementById('adminOverlay').style.display = 'none';
  document.getElementById('adminPanel').classList.remove('open');
}

function _renderAdminPanel() {
  const users   = Storage.getUsers();
  const players = Object.values(users).filter(u => u.role === 'player');

  const scriptCount = u => {
    const all = Storage.getScripts(u.username.toLowerCase());
    return all.filter(s => !s.isExample).length;
  };

  const rows = players.length
    ? players.map(u => `
        <div class="admin-user-row">
          <span class="aur-name">${u.username}</span>
          <span class="aur-lives">❤️ ${u.lives}</span>
          <span class="aur-score">Low: ${(u.scores||{}).low||0} · High: ${(u.scores||{}).high||0} pts</span>
          <span class="aur-scripts">📄 ${scriptCount(u)}</span>
          <div class="aur-actions">
            <button class="aur-btn" onclick="adminResetLives('${u.username}')"   title="Redonner 3 vies">❤️ Vies</button>
            <button class="aur-btn" onclick="adminResetScore('${u.username}','low')"  title="Reset score Low">↺ Low</button>
            <button class="aur-btn" onclick="adminResetScore('${u.username}','high')" title="Reset score High">↺ High</button>
            <button class="aur-btn aur-btn-del" onclick="adminDeleteUser('${u.username}')" title="Supprimer le compte">✕</button>
          </div>
        </div>`)
      .join('')
    : '<p style="font-size:12px;color:var(--muted);padding:4px 10px">Aucun joueur inscrit.</p>';

  document.getElementById('adminContent').innerHTML = `
    <div class="admin-section">
      <h4>Joueurs (${players.length})</h4>
      ${rows}
    </div>
    <div class="admin-section">
      <h4>Actions globales</h4>
      <div class="admin-actions">
        <button class="admin-action-btn aab-warn"   onclick="adminRestoreAllLives()">❤️ Redonner vies à tous</button>
        <button class="admin-action-btn aab-danger" onclick="adminResetAllScores()">🗑 Reset tous les scores</button>
        <button class="admin-action-btn aab-blue"   onclick="adminExportData()">↓ Exporter JSON</button>
      </div>
    </div>`;
}

function adminResetLives(username) {
  Auth.restoreLives(username, 3);
  _renderAdminPanel();
}

function adminRestoreAllLives() {
  if (!confirm('Redonner 3 vies à tous les joueurs ?')) return;
  const users = Storage.getUsers();
  Object.values(users).forEach(u => { if (u.role === 'player') u.lives = 3; });
  Storage.setUsers(users);
  _renderAdminPanel();
}

function adminResetScore(username, tier) {
  if (!confirm(`Remettre le score ${tier.toUpperCase()} de ${username} à 0 ?`)) return;
  const users = Storage.getUsers();
  const u = users[username.toLowerCase()];
  if (!u) return;
  u.scores = u.scores || { low: 0, high: 0 };
  u.scores[tier] = 0;
  Storage.setUsers(users);
  _renderAdminPanel();
  renderLeaderboard(_currentTab);
}

function adminDeleteUser(username) {
  if (!confirm(`Supprimer le compte "${username}" et tous ses scripts ? Cette action est irréversible.`)) return;
  const users = Storage.getUsers();
  delete users[username.toLowerCase()];
  Storage.setUsers(users);
  // Supprimer aussi ses scripts et maps
  Storage.setScripts(username.toLowerCase(), []);
  Storage.setMaps(username.toLowerCase(), []);
  _renderAdminPanel();
  renderLeaderboard(_currentTab);
}

function adminResetAllScores() {
  if (!confirm('Remettre TOUS les scores à 0 ?')) return;
  const users = Storage.getUsers();
  Object.values(users).forEach(u => { if (u.role === 'player') u.scores = { low: 0, high: 0 }; });
  Storage.setUsers(users);
  _renderAdminPanel();
  renderLeaderboard(_currentTab);
}

function adminExportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    users: Storage.getUsers(),
    scripts: Object.fromEntries(
      Object.keys(Storage.getUsers()).map(u => [u, Storage.getScripts(u)])
    ),
    maps: Object.fromEntries(
      Object.keys(Storage.getUsers()).map(u => [u, Storage.getMaps(u)])
    ),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `bipboup_export_${new Date().toISOString().slice(0,10)}.json`,
  });
  a.click();
}
