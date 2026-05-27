// ══ SCRIPT EDITOR PANEL ══

const SCRIPT_PRESETS = [
  {
    name: 'tour_de_jardin',
    label: 'Tour de jardin',
    desc: 'Visite les 4 plantes puis le garde-manger',
    script: `# Tour de jardin — 4 plantes + garde-manger
# Coordonnées arène: survole la carte pour les voir
nav_to 80 60
nav_to 220 60
nav_to 80 140
nav_to 220 140
nav_to 270 100`,
  },
  {
    name: 'rush_gardemanger',
    label: 'Rush garde-manger',
    desc: 'Cap direct via le centre (25 pts)',
    script: `# Rush garde-manger — priorité haute valeur
nav_to 150 100
nav_to 270 100`,
  },
  {
    name: 'zigzag',
    label: 'Exploration zigzag',
    desc: 'Balayage en zigzag de l\'arène',
    script: `# Exploration en zigzag
nav_to 80 50
nav_to 150 150
nav_to 220 50
nav_to 270 100`,
  },
  {
    name: 'demo_timed',
    label: 'Démo chronométrée',
    desc: 'Collecte avec pauses entre objectifs',
    script: `# Démo avec pauses — séquence réaliste
nav_to 80 60
wait 0.5
nav_to 80 140
wait 0.5
nav_to 220 60
wait 0.5
nav_to 220 140
wait 1
nav_to 270 100`,
  },
];

const SCRIPT_SYNTAX_HINT =
`# Syntaxe — une commande par ligne (ou séparées par ;)
# nav_to <lieu>          → nav_to plante1, nav_to gardemanger, nav_to centre...
# nav_to <x> <y>         → nav_to 150 100
# wait <secondes>        → wait 2.5
# cmd_vel <lin> <ang>    → cmd_vel 0.5 0.0
# estop off / estop on
# call <nom_script>      → call tour_de_jardin  (appel d'un autre script)
`;

function openScriptPanel() {
  const panel = document.getElementById('scriptPanel');
  panel.style.display = 'flex';
  // Charger le hint si l'éditeur est vide
  const area = document.getElementById('scriptEditorArea');
  if (!area.value.trim()) area.value = SCRIPT_SYNTAX_HINT;
  renderScriptPresets();
}

function closeScriptPanel() {
  document.getElementById('scriptPanel').style.display = 'none';
  document.getElementById('termInput')?.focus();
}

function renderScriptPresets() {
  const el = document.getElementById('scriptPresetList');
  el.innerHTML = '';
  SCRIPT_PRESETS.forEach(p => {
    const d = document.createElement('div');
    d.className = 'sp-preset-item';
    d.title = p.desc;
    d.innerHTML = `<div style="font-weight:700;color:var(--blue)">${p.label}</div><div style="font-size:9px;color:var(--muted)">${p.desc}</div>`;
    d.onclick = () => loadPreset(p);
    el.appendChild(d);
  });
}

function loadPreset(preset) {
  document.getElementById('scriptEditorArea').value = preset.script;
  document.getElementById('scriptEditorArea').focus();
}

function clearEditor() {
  document.getElementById('scriptEditorArea').value = SCRIPT_SYNTAX_HINT;
}

function runEditorScript() {
  const raw = document.getElementById('scriptEditorArea').value;
  // Filtrer les commentaires et lignes vides, rejoindre en séquence inline
  const lines = raw
    .split('\n')
    .map(l => l.replace(/#.*$/, '').trim())
    .filter(l => l);

  if (!lines.length) {
    termLog('[script] Éditeur vide', 'warn');
    return;
  }
  if (!nodesLaunched) { termLog('[script] Nodes non démarrés', 'err'); return; }
  if (S.estop)        { termLog('[script] E-STOP actif', 'err'); return; }

  const inline = lines.join('; ');
  closeScriptPanel();
  termLog(`[script] Exécution depuis l'éditeur — ${lines.length} instruction(s)`, 'info');
  runScript(inline);
}

// ══ RESIZE ══

function initScriptResize() {
  const panel  = document.getElementById('scriptPanel');
  const handle = document.getElementById('scriptResizeHandle');
  let startX, startY, startW, startH;

  handle.addEventListener('mousedown', e => {
    startX = e.clientX; startY = e.clientY;
    startW = panel.offsetWidth; startH = panel.offsetHeight;
    panel.style.transform = 'none'; // désactive le centrage CSS pour passer en position fixe
    panel.style.left = panel.getBoundingClientRect().left + 'px';
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup',   stopResize);
    e.preventDefault(); e.stopPropagation();
  });

  function onResize(e) {
    panel.style.width    = Math.max(480, startW + e.clientX - startX) + 'px';
    panel.style.height   = Math.max(280, startH + e.clientY - startY) + 'px';
    panel.style.maxWidth = 'none';
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
    // Figer la position avant de retirer le transform centré
    panel.style.transform = 'none';
    panel.style.left = rect.left + 'px';
    panel.style.top  = rect.top  + 'px';
    origLeft = rect.left; origTop = rect.top;
    startX = e.clientX;  startY  = e.clientY;
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
