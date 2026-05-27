// ══ SCRIPT EDITOR PANEL ══

const SCRIPT_SYNTAX_HINT =
`# Syntaxe — une commande par ligne (ou séparées par ;)
# nav_to <lieu>          → nav_to plante1, nav_to gardemanger, nav_to centre...
# nav_to <x> <y>         → nav_to 150 100
# wait <secondes>        → wait 2.5
# cmd_vel <lin> <ang>    → cmd_vel 0.5 0.0
# estop off / estop on
# call <nom_script>      → call mon_script  (appel d'un script sauvegardé)
`;

function openScriptPanel() {
  const panel = document.getElementById('scriptPanel');
  panel.style.display = 'flex';
  const area = document.getElementById('scriptEditorArea');
  if (!area.value.trim()) area.value = SCRIPT_SYNTAX_HINT;
  renderScriptPresets();
}

function closeScriptPanel() {
  document.getElementById('scriptPanel').style.display = 'none';
  document.getElementById('termInput')?.focus();
}

function renderScriptPresets() {
  const el      = document.getElementById('scriptPresetList');
  const isAdmin = Auth.isAdmin();
  const session = Auth.getSession();
  el.innerHTML  = '';

  const saved = isAdmin
    ? Persistence.getAllScripts('high')
    : Persistence.getUserScripts('high');

  const secLabel = document.createElement('div');
  secLabel.className   = 'sp-section-label';
  secLabel.textContent = isAdmin ? 'Tous les scripts' : 'Mes scripts';
  el.appendChild(secLabel);

  if (!saved.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:10px;color:var(--muted);padding:6px 8px';
    empty.textContent   = 'Aucun script sauvegardé.';
    el.appendChild(empty);
    return;
  }

  saved.forEach(s => {
    const d = document.createElement('div');
    d.className = 'sp-preset-item';
    const ownerTag = s.owner && s.owner !== session?.username
      ? `<span style="font-size:8px;color:var(--purple);margin-left:4px">${s.owner}</span>` : '';
    d.innerHTML = `
      <div style="display:flex;align-items:center;gap:4px">
        <span style="font-weight:700;color:var(--green);flex:1">${s.name}${ownerTag}</span>
        <button onclick="event.stopPropagation();_htDeleteScript('${s.id}','${s.owner||session?.username}')"
          style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:11px;padding:1px 4px;transition:.15s"
          onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--muted)'">✕</button>
      </div>
      <div style="font-size:9px;color:var(--muted)">${new Date(s.updatedAt||s.createdAt).toLocaleDateString('fr')}</div>`;
    d.onclick = () => { document.getElementById('scriptEditorArea').value = s.code || ''; };
    el.appendChild(d);
  });
}

function _htDeleteScript(id, owner) {
  if (!confirm('Supprimer ce script ?')) return;
  Persistence.deleteScript(id, owner);
  renderScriptPresets();
}

function saveCurrentScript() {
  const code = document.getElementById('scriptEditorArea').value.trim();
  if (!code || code === SCRIPT_SYNTAX_HINT.trim()) {
    termLog('[script] Éditeur vide — rien à sauvegarder', 'warn');
    return;
  }
  const name = prompt('Nom du script :');
  if (!name || !name.trim()) return;
  Persistence.saveHighScript(name.trim(), code);
  termLog(`[script] Script "${name.trim()}" sauvegardé`, 'info');
  renderScriptPresets();
}

function clearEditor() {
  document.getElementById('scriptEditorArea').value = SCRIPT_SYNTAX_HINT;
}

function runEditorScript() {
  const raw = document.getElementById('scriptEditorArea').value;
  const lines = raw
    .split('\n')
    .map(l => l.replace(/#.*$/, '').trim())
    .filter(l => l);

  if (!lines.length) { termLog('[script] Éditeur vide', 'warn'); return; }
  if (!nodesLaunched) { termLog('[script] Nodes non démarrés', 'err'); return; }
  if (S.estop)        { termLog('[script] E-STOP actif', 'err'); return; }

  closeScriptPanel();
  termLog(`[script] Exécution — ${lines.length} instruction(s)`, 'info');
  runScript(lines.join('; '));
}

// ══ RESIZE ══

function initScriptResize() {
  const panel  = document.getElementById('scriptPanel');
  const handle = document.getElementById('scriptResizeHandle');
  let startX, startY, startW, startH;

  handle.addEventListener('mousedown', e => {
    startX = e.clientX; startY = e.clientY;
    startW = panel.offsetWidth; startH = panel.offsetHeight;
    panel.style.transform = 'none';
    panel.style.left = panel.getBoundingClientRect().left + 'px';
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup',   stopResize);
    e.preventDefault(); e.stopPropagation();
  });

  function onResize(e) {
    panel.style.width     = Math.max(440, startW + e.clientX - startX) + 'px';
    panel.style.height    = Math.max(260, startH + e.clientY - startY) + 'px';
    panel.style.maxWidth  = 'none';
    panel.style.maxHeight = 'none';
  }

  function stopResize() {
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup',   stopResize);
  }
}

// ══ DRAG TO MOVE ══

function initScriptDrag() {
  const panel  = document.getElementById('scriptPanel');
  const handle = panel.querySelector('.sp-drag-handle');
  let startX, startY, origLeft, origTop;

  handle.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    const rect = panel.getBoundingClientRect();
    panel.style.transform = 'none';
    panel.style.left = rect.left + 'px';
    panel.style.top  = rect.top  + 'px';
    origLeft = rect.left; origTop = rect.top;
    startX = e.clientX;   startY  = e.clientY;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup',   stopDrag);
    e.preventDefault();
  });

  function onDrag(e) {
    panel.style.left = Math.max(0, origLeft + e.clientX - startX) + 'px';
    panel.style.top  = Math.max(0, origTop  + e.clientY - startY) + 'px';
  }

  function stopDrag() {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup',   stopDrag);
  }
}
