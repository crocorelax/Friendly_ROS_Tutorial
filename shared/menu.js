// ════════════════════════════════════════════════════════════
// LOGIQUE DU MENU PLATEFORME — version Supabase (async)
// Dépend de : supabase-client.js, storage.js, auth.js
// ════════════════════════════════════════════════════════════

let _currentTab = 'low';

// ── Toggle visibilité mot de passe ───────────────────────
function togglePw(inputId, btn) {
  const el = document.getElementById(inputId);
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  btn.classList.toggle('visible', show);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Restaure la session Supabase et peuple le cache Auth._profile
  try { await Auth.init(); } catch (e) { console.error('[auth] Init error', e); }

  // Raccourcis clavier login / inscription
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
  document.getElementById('loginPanel').style.display    = 'flex';
  document.getElementById('registerPanel').style.display = 'none';
  document.getElementById('loginError').textContent      = '';
  setTimeout(() => document.getElementById('loginUser').focus(), 50);
}

function showRegister() {
  document.getElementById('loginPanel').style.display    = 'none';
  document.getElementById('registerPanel').style.display = 'flex';
  document.getElementById('regError').textContent        = '';
  setTimeout(() => document.getElementById('regUser').focus(), 50);
}

function showMenu() {
  document.getElementById('authScreen').classList.remove('active');
  document.getElementById('menuScreen').classList.add('active');
  _renderUserInfo();
  // Synchronise l'onglet actif
  ['tabLow', 'tabHigh', 'tabCombined'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  const activeTab = document.getElementById(
    _currentTab === 'low' ? 'tabLow' : _currentTab === 'high' ? 'tabHigh' : 'tabCombined'
  );
  if (activeTab) activeTab.classList.add('active');
  renderLeaderboard(_currentTab); // async, fire-and-forget
}

// ── Handlers auth (async) ────────────────────────────────

async function handleLogin() {
  const btn = document.querySelector('#loginPanel .btn-primary');
  if (btn) btn.disabled = true;
  document.getElementById('loginError').textContent = '';

  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const r = await Auth.login(username, password);

  if (btn) btn.disabled = false;

  if (r.ok) {
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    showMenu();
  } else {
    document.getElementById('loginError').textContent = r.error;
    document.getElementById('loginPass').select();
  }
}

async function handleRegister() {
  const btn = document.querySelector('#registerPanel .btn-primary');
  if (btn) btn.disabled = true;
  document.getElementById('regError').textContent = '';

  const username = document.getElementById('regUser').value.trim();
  const password = document.getElementById('regPass').value;
  const confirm  = document.getElementById('regPass2').value;

  if (password !== confirm) {
    document.getElementById('regError').textContent = 'Les mots de passe ne correspondent pas';
    if (btn) btn.disabled = false;
    return;
  }

  const r = await Auth.register(username, password);
  if (btn) btn.disabled = false;

  if (r.ok) {
    document.getElementById('regUser').value  = '';
    document.getElementById('regPass').value  = '';
    document.getElementById('regPass2').value = '';
    showMenu();
  } else {
    document.getElementById('regError').textContent = r.error;
  }
}

async function handleLogout() {
  await Auth.logout();
  document.getElementById('menuScreen').classList.remove('active');
  document.getElementById('authScreen').classList.add('active');
  showLogin();
}

// ── Mode découverte (invité) ─────────────────────────────

function handleGuestMode() {
  Auth.loginGuest();
  showMenu();
}

// ── Affichage utilisateur ────────────────────────────────

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

  const guestBadge = document.getElementById('ptGuestBadge');
  if (guestBadge) guestBadge.style.display = Auth.isGuest() ? '' : 'none';
}

// ── Classement (async) ───────────────────────────────────

function switchTab(tier) {
  _currentTab = tier;
  document.getElementById('tabLow').classList.toggle('active',      tier === 'low');
  document.getElementById('tabHigh').classList.toggle('active',     tier === 'high');
  document.getElementById('tabCombined').classList.toggle('active', tier === 'combined');
  renderLeaderboard(tier);
}

async function renderLeaderboard(tier) {
  const body = document.getElementById('lbBody');
  body.innerHTML = '<div class="lb-empty">Chargement…</div>';

  let entries;
  try { entries = await Auth.getLeaderboard(tier); }
  catch (e) { body.innerHTML = '<div class="lb-empty">Erreur réseau — réessaie.</div>'; return; }

  const session = Auth.getSession();

  if (!entries.length) {
    body.innerHTML = '<div class="lb-empty">Aucun score pour l\'instant — lance-toi !</div>';
    return;
  }

  const rankCls  = i => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
  const rankIcon = i => i === 0 ? '🥇'   : i === 1 ? '🥈'     : i === 2 ? '🥉'    : `${i + 1}.`;
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

// ── Navigation vers les tiers ────────────────────────────

function goToTier(tier) {
  const path = tier === 'low'
    ? 'Tuto low tier/index.html'
    : 'Tuto high tier/index.html';
  window.location.href = path;
}

function goToDashboard() {
  window.location.href = 'Robot Dashboard/index.html';
}

// ── Panel Admin ──────────────────────────────────────────

function openAdminPanel() {
  if (!Auth.isAdmin()) return;
  document.getElementById('adminOverlay').style.display = 'block';
  document.getElementById('adminPanel').classList.add('open');
  _renderAdminPanel();
}

function closeAdminPanel() {
  document.getElementById('adminOverlay').style.display = 'none';
  document.getElementById('adminPanel').classList.remove('open');
}

async function _renderAdminPanel() {
  const content = document.getElementById('adminContent');
  content.innerHTML = '<p style="font-size:12px;color:var(--muted);padding:8px 10px">Chargement…</p>';

  let players, allScripts;
  try {
    [players, allScripts] = await Promise.all([
      Auth.getAllUsers(),
      supabase.from('scripts').select('username, is_example'),
    ]);
    allScripts = allScripts.data || [];
  } catch (e) {
    content.innerHTML = '<p style="font-size:12px;color:var(--red);padding:8px 10px">Erreur réseau.</p>';
    return;
  }

  // Compte de scripts (non-exemple) par username
  const scriptCounts = {};
  allScripts.forEach(s => {
    if (!s.is_example) scriptCounts[s.username] = (scriptCounts[s.username] || 0) + 1;
  });

  const rows = players.length
    ? players.map(u => `
        <div class="admin-user-row">
          <span class="aur-name">${u.username}</span>
          <span class="aur-lives">❤️ ${u.lives}</span>
          <span class="aur-score">Low: ${u.score_low || 0} · High: ${u.score_high || 0} pts</span>
          <span class="aur-scripts">📄 ${scriptCounts[u.username] || 0}</span>
          <div class="aur-actions">
            <button class="aur-btn" onclick="adminResetLives('${u.username}')"        title="Redonner 3 vies">❤️ Vies</button>
            <button class="aur-btn" onclick="adminResetScore('${u.username}','low')"  title="Reset score Low">↺ Low</button>
            <button class="aur-btn" onclick="adminResetScore('${u.username}','high')" title="Reset score High">↺ High</button>
            <button class="aur-btn aur-btn-del" onclick="adminDeleteUser('${u.username}')" title="Supprimer le compte">✕</button>
          </div>
        </div>`)
      .join('')
    : '<p style="font-size:12px;color:var(--muted);padding:4px 10px">Aucun joueur inscrit.</p>';

  content.innerHTML = `
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

async function adminResetLives(username) {
  await supabase.rpc('fn_admin_restore_lives', { p_username: username, p_lives: 3 });
  _renderAdminPanel();
}

async function adminRestoreAllLives() {
  if (!confirm('Redonner 3 vies à tous les joueurs ?')) return;
  await supabase.rpc('fn_admin_restore_all_lives', { p_lives: 3 });
  _renderAdminPanel();
}

async function adminResetScore(username, tier) {
  if (!confirm(`Remettre le score ${tier.toUpperCase()} de ${username} à 0 ?`)) return;
  await supabase.rpc('fn_admin_reset_score', { p_username: username, p_tier: tier });
  _renderAdminPanel();
  renderLeaderboard(_currentTab);
}

async function adminDeleteUser(username) {
  if (!confirm(
    `Supprimer le compte "${username}" et toutes ses maps/scripts ?\n\n` +
    `Note : les identifiants Supabase Auth restent — pour suppression complète, ` +
    `utilise le dashboard Supabase (Authentication → Users).`
  )) return;
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('username', username.toLowerCase());
  if (error) { alert('Erreur: ' + error.message); return; }
  _renderAdminPanel();
  renderLeaderboard(_currentTab);
}

async function adminResetAllScores() {
  if (!confirm('Remettre TOUS les scores à 0 ?')) return;
  await supabase.rpc('fn_admin_reset_all_scores');
  _renderAdminPanel();
  renderLeaderboard(_currentTab);
}

async function adminExportData() {
  const [profilesRes, scriptsRes, mapsRes] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('scripts').select('*'),
    supabase.from('maps').select('*'),
  ]);
  const payload = {
    exportedAt: new Date().toISOString(),
    profiles:   profilesRes.data || [],
    scripts:    scriptsRes.data  || [],
    maps:       mapsRes.data     || [],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `bipboup_export_${new Date().toISOString().slice(0, 10)}.json`,
  });
  a.click();
}
