// ════════════════════════════════════════════
// SAVE / LOAD — Maps & Scripts Low Tier
// Dépend de : shared/persistence.js, shared/auth.js
// Toutes les ops Persistence sont async.
// ════════════════════════════════════════════

let _slType  = null; // 'map' | 'script'
let _slMode  = null; // 'save' | 'load'
let _slItems = [];   // cache de la liste courante (evite double-fetch)

// ── Ouverture ───────────────────────────────

function openSave(type) {
  if (type === 'map' && !Auth.isAdmin()) {
    _showMenuNotif('🔒 Création de carte réservée à l\'administrateur');
    return;
  }
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
  const isAdmin = Auth.isAdmin();
  const label = type === 'map'
    ? (isAdmin ? 'Mes cartes' : 'Choisir une carte')
    : 'Mes scripts';
  document.getElementById('slTitle').textContent      = label;
  document.getElementById('slSaveForm').style.display = 'none';
  document.getElementById('slLoadList').style.display = '';
  document.getElementById('slLoadList').innerHTML     = '<div class="sl-empty">Chargement…</div>';
  document.getElementById('slOverlay').style.display  = 'flex';
  _renderLoadList(); // async, démarre en arrière-plan
}

function closeSL() {
  document.getElementById('slOverlay').style.display = 'none';
}

// ── Sauvegarde (async) ──────────────────────

async function doSave() {
  const name  = document.getElementById('slNameInput').value.trim();
  const errEl = document.getElementById('slSaveError');
  errEl.textContent = '';
  if (!name)            { errEl.textContent = 'Donne un nom.'; return; }
  if (name.length > 40) { errEl.textContent = 'Nom trop long (max 40 car.).'; return; }
  if (!/^[\w\- ]+$/.test(name)) { errEl.textContent = 'Lettres, chiffres, - et espace uniquement.'; return; }

  if (_slType === 'map') {
    const entry = await Persistence.saveMap(name, mapData);
    if (!entry) { errEl.textContent = 'Erreur réseau — réessaie.'; return; }
    _flash('🗺️ Carte "' + name + '" sauvegardée');
  } else {
    const blocks = getBlocks().map(b => ({ type: b.type, val: b.val }));
    if (!blocks.length) { errEl.textContent = 'Aucun bloc à sauvegarder.'; return; }
    const entry = await Persistence.saveScript(name, currentLevel, blocks);
    if (!entry) { errEl.textContent = 'Erreur réseau — réessaie.'; return; }
    _flash('💾 Script "' + name + '" sauvegardé');
  }
  closeSL();
}

// ── Chargement — rendu de la liste (async) ──

async function _renderLoadList() {
  const el      = document.getElementById('slLoadList');
  const isAdmin = Auth.isAdmin();
  const session = Auth.getSession();

  try {
    // Maps : tous les utilisateurs voient les cartes admin (getAllMaps).
    // Scripts : admin voit tout, joueur voit les siens.
    _slItems = _slType === 'map'
      ? await Persistence.getAllMaps()
      : await (isAdmin ? Persistence.getAllScripts('low') : Persistence.getUserScripts('low'));
  } catch (e) {
    el.innerHTML = '<div class="sl-empty">Erreur réseau — réessaie.</div>';
    return;
  }

  if (!_slItems.length) {
    el.innerHTML = '<div class="sl-empty">Aucun élément sauvegardé.</div>';
    return;
  }

  el.innerHTML = _slItems.map(item => {
    // Support des deux formats de noms de champs (migration / nouveau)
    const date     = new Date(item.updated_at || item.updatedAt || item.created_at || item.createdAt).toLocaleDateString('fr');
    const owner    = item.username || item.owner || session?.username;
    const isOther  = owner && owner !== session?.username;
    const ownerTag = isOther ? `<span class="sl-tag sl-tag-owner">${owner}</span>` : '';
    const isEx     = item.is_example || item.isExample;
    const exTag    = isEx   ? '<span class="sl-tag sl-tag-ex">exemple</span>' : '';
    const lvlTag   = item.level ? `<span class="sl-tag">N${item.level}</span>` : '';
    let delDisabled = '';
    if (_slType === 'map') {
      if (!isAdmin) delDisabled = 'disabled title="Seul l\'administrateur peut supprimer des cartes"';
    } else {
      if (isEx && !isAdmin) delDisabled = 'disabled title="Script exemple non supprimable"';
    }
    return `
      <div class="sl-item">
        <div class="sl-item-info">
          <div class="sl-item-name">${item.name} ${exTag}${ownerTag}${lvlTag}</div>
          <div class="sl-item-meta">${date}</div>
        </div>
        <div class="sl-item-actions">
          <button class="sl-btn sl-btn-load" onclick="_slLoad('${item.id}')">Charger</button>
          <button class="sl-btn sl-btn-del"  onclick="_slDelete('${item.id}')" ${delDisabled}>✕</button>
        </div>
      </div>`;
  }).join('');
}

// Charge un élément depuis le cache _slItems
function _slLoad(id) {
  const entry = _slItems.find(i => i.id === id);
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

async function _slDelete(id) {
  if (!confirm('Supprimer cet élément ?')) return;
  if (_slType === 'map') await Persistence.deleteMap(id);
  else                   await Persistence.deleteScript(id);
  await _renderLoadList();
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
