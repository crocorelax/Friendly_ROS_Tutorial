// ════════════════════════════════════════════
// SAVE / LOAD — Maps & Scripts Low Tier
// Dépend de : shared/persistence.js, shared/auth.js
// ════════════════════════════════════════════

let _slType = null; // 'map' | 'script'
let _slMode = null; // 'save' | 'load'

// ── Ouverture ───────────────────────────────

function openSave(type) {
  _slType = type; _slMode = 'save';
  const label = type === 'map' ? 'une carte' : 'un script';
  document.getElementById('slTitle').textContent     = `Sauvegarder ${label}`;
  document.getElementById('slNameInput').value       = '';
  document.getElementById('slSaveError').textContent = '';
  document.getElementById('slSaveForm').style.display = '';
  document.getElementById('slLoadList').style.display = 'none';
  document.getElementById('slOverlay').style.display  = 'flex';
  setTimeout(() => document.getElementById('slNameInput').focus(), 80);
}

function openLoad(type) {
  _slType = type; _slMode = 'load';
  const label = type === 'map' ? 'Mes cartes' : 'Mes scripts';
  document.getElementById('slTitle').textContent      = label;
  document.getElementById('slSaveForm').style.display = 'none';
  document.getElementById('slLoadList').style.display = '';
  _renderLoadList();
  document.getElementById('slOverlay').style.display  = 'flex';
}

function closeSL() {
  document.getElementById('slOverlay').style.display = 'none';
}

// ── Sauvegarde ──────────────────────────────

function doSave() {
  const name  = document.getElementById('slNameInput').value.trim();
  const errEl = document.getElementById('slSaveError');
  errEl.textContent = '';
  if (!name)            { errEl.textContent = 'Donne un nom.'; return; }
  if (name.length > 40) { errEl.textContent = 'Nom trop long (max 40 car.).'; return; }
  if (!/^[\w\- ]+$/.test(name)) { errEl.textContent = 'Lettres, chiffres, - et espace uniquement.'; return; }

  if (_slType === 'map') {
    Persistence.saveMap(name, mapData);
    _flash('🗺️ Carte "' + name + '" sauvegardée');
  } else {
    const blocks = getBlocks().map(b => ({ type: b.type, val: b.val }));
    if (!blocks.length) { errEl.textContent = 'Aucun bloc à sauvegarder.'; return; }
    Persistence.saveScript(name, currentLevel, blocks);
    _flash('💾 Script "' + name + '" sauvegardé');
  }
  closeSL();
}

// ── Chargement — rendu de la liste ──────────

function _renderLoadList() {
  const el      = document.getElementById('slLoadList');
  const isAdmin = Auth.isAdmin();
  const session = Auth.getSession();

  let items = _slType === 'map'
    ? (isAdmin ? Persistence.getAllMaps()          : Persistence.getUserMaps())
    : (isAdmin ? Persistence.getAllScripts('low')  : Persistence.getUserScripts('low'));

  if (!items.length) {
    el.innerHTML = '<div class="sl-empty">Aucun élément sauvegardé.</div>';
    return;
  }

  el.innerHTML = items.map(item => {
    const date     = new Date(item.updatedAt || item.createdAt).toLocaleDateString('fr');
    const isOther  = item.owner && item.owner !== session.username;
    const ownerTag = isOther  ? `<span class="sl-tag sl-tag-owner">${item.owner}</span>` : '';
    const exTag    = item.isExample ? '<span class="sl-tag sl-tag-ex">exemple</span>'  : '';
    const lvlTag   = item.level    ? `<span class="sl-tag">N${item.level}</span>`      : '';
    const delDisabled = item.isExample && !isAdmin ? 'disabled title="Script exemple non supprimable"' : '';
    const owner    = item.owner || session.username;
    return `
      <div class="sl-item">
        <div class="sl-item-info">
          <div class="sl-item-name">${item.name} ${exTag}${ownerTag}${lvlTag}</div>
          <div class="sl-item-meta">${date}</div>
        </div>
        <div class="sl-item-actions">
          <button class="sl-btn sl-btn-load" onclick="_slLoad('${item.id}','${owner}')">Charger</button>
          <button class="sl-btn sl-btn-del"  onclick="_slDelete('${item.id}','${owner}')" ${delDisabled}>✕</button>
        </div>
      </div>`;
  }).join('');
}

function _slLoad(id, owner) {
  const isAdmin = Auth.isAdmin();
  const items   = _slType === 'map'
    ? (isAdmin ? Persistence.getAllMaps()         : Persistence.getUserMaps())
    : (isAdmin ? Persistence.getAllScripts('low') : Persistence.getUserScripts('low'));
  const entry   = items.find(i => i.id === id);
  if (!entry) return;

  if (_slType === 'map') {
    mapData.walls = new Set(entry.data.walls);
    mapData.goals = entry.data.goals.map(g => ({ ...g, done: false }));
    mapData.spawn = { ...entry.data.spawn };
    if (document.getElementById('editorScreen').classList.contains('active')) {
      drawEditor(); updateEdStats();
    } else {
      resetGame();
    }
    _flash('🗺️ Carte "' + entry.name + '" chargée');
  } else {
    clearScript();
    (entry.blocks || []).forEach(b => addBlock(b.type, b.val));
    _flash('💾 Script "' + entry.name + '" chargé');
  }
  closeSL();
}

function _slDelete(id, owner) {
  if (!confirm('Supprimer cet élément ?')) return;
  _slType === 'map'
    ? Persistence.deleteMap(id, owner)
    : Persistence.deleteScript(id, owner);
  _renderLoadList();
}

// ── Notification flash ──────────────────────

function _flash(msg) {
  let el = document.getElementById('_slFlash');
  if (!el) {
    el = Object.assign(document.createElement('div'), { id: '_slFlash' });
    el.style.cssText =
      'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);'
      + 'background:var(--surface);border:1px solid var(--green);color:var(--green);'
      + 'border-radius:8px;padding:10px 22px;font-size:13px;font-weight:700;z-index:1200;'
      + 'pointer-events:none;transition:opacity .35s';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2400);
}

// Enter pour valider le nom
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('slNameInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSave();
  });
});
