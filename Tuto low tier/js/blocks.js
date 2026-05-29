// ════════════════════════════════════════════
// PALETTE, BLOCS & DRAG-AND-DROP
// ════════════════════════════════════════════

const ghost = document.getElementById('ghost');

// ── Construction de la palette ─────────────

function buildPalette(level) {
  const pal = document.getElementById('palette');
  pal.innerHTML = '';

  const sec = (t, color) => {
    const d = document.createElement('div');
    d.className = 'pal-sec';
    if (color) d.style.color = color;
    d.textContent = t;
    pal.appendChild(d);
  };

  const block = (type, val, label, tooltip) => {
    const d = document.createElement('div');
    d.className = 'pal-block ' + (clsMap[type] || 'pm');
    d.draggable = true;
    d.dataset.type = type;
    d.dataset.val  = val ?? defVal[type];
    if (tooltip) d.title = tooltip;
    d.innerHTML = `<span>${icoMap[type]}</span>${label || lblMap[type]}`;
    d.addEventListener('dragstart', palDragStart);
    d.addEventListener('dragend', () => ghost.style.display = 'none');
    pal.appendChild(d);
  };

  // ── Niveau 1 — blocs de base ─────────────────────────
  sec('Mouvement');
  block('move',  2,  'Avancer (cases)',  'Avance de N cases. 1 case = une cellule de la grille. Collision = perte de vie.');
  block('move', -1,  'Reculer (cases)',  'Recule de N cases vers l\'arrière.');

  sec('Rotation');
  block('turn',  90,  'Droite 90°',   'Tourne de 90° vers la droite.');
  block('turn', -90,  'Gauche 90°',   'Tourne de 90° vers la gauche.');
  block('turn',  45,  'Droite 45°',   'Tourne de 45° vers la droite.');
  block('turn', -45,  'Gauche 45°',   'Tourne de 45° vers la gauche.');

  sec('Contrôle');
  block('wait',   400, 'Attendre (ms)', 'Pause de N millisecondes.');
  block('repeat',   3, 'Répéter (N×)',  'Répète les blocs suivants N fois.');
  block('repeat',   0, 'Répéter ∞',    'Boucle infinie — utilise Stop pour sortir.');

  sec('Stylo');
  block('pen', 1, 'Stylo ON',  'Active le tracé du chemin du robot.');
  block('pen', 0, 'Stylo OFF', 'Désactive le tracé.');

  // ── Niveau 2 — capteurs LiDAR ────────────────────────
  if (level >= 2) {
    sec('Mouvement LiDAR', 'var(--blue)');
    block('move_to_wall', 0, "Jusqu'au mur", 'Le LiDAR mesure la distance et le robot s\'arrête à 1 case du mur.');

    sec('Capteurs LiDAR', 'var(--blue)');
    block('if_obstacle',   90, 'Si obstacle →',    'Si obstacle devant → tourne de N°, sinon continue.');
    block('stop_obstacle',  0, 'Stop si obstacle', 'Arrête le programme si obstacle détecté. Sans perte de vie.');
    block('turn_to_open',  90, 'Vers voie libre',  'Tourne par incréments jusqu\'à trouver une voie libre.');
    block('scan_360',       0, 'Scan 360°',        'Tourne d\'un tour complet pour cartographier.');

    sec('Orientation', 'var(--blue)');
    block('face_dir', 0, 'Cap absolu (°)', '0°=Nord · 90°=Est · 180°=Sud · 270°=Ouest');
  }

  // ── Niveau 3 — corrections de dérive ─────────────────
  if (level >= 3) {
    sec('Corrections dérive', 'var(--yellow)');
    block('fix_cap',   0, 'Corriger cap (°)', 'Réoriente vers un angle précis — annule la dérive angulaire.');
    block('fix_drift', 0, 'Réduire dérive',   'Réduit la dérive latérale accumulée.');
  }

  const hint = document.createElement('div');
  hint.className = 'pal-hint';
  hint.innerHTML = level >= 3
    ? '<b style="color:#fbbf24">⚠️ Expert</b><br>Arène cachée +<br>robot glissant !<br>LiDAR + dérive.'
    : level >= 2
    ? '📡 <b style="color:#00d68f">LiDAR</b><br>Survole un bloc<br>pour voir sa<br>description.'
    : '💡 Glisse les blocs<br>↕ Réordonne<br>▶ Lancer';
  pal.appendChild(hint);
}

// ── Création d'un bloc dans le programme ───

function addBlock(type, val, insertBefore) {
  document.getElementById('emptyHint').style.opacity = '0';

  const div = document.createElement('div');
  div.className   = 'sblock ' + (clsMap[type] || 'pm');
  div.dataset.type = type;
  div.dataset.val  = val ?? defVal[type];
  div.draggable    = true;

  let inner = `<span class="drag-handle" title="Déplacer">⠿</span>`;

  const noInput = ['pen','fix_drift','stop_obstacle','scan_360','move_to_wall'];
  if (noInput.includes(type)) {
    let lbl = lblMap[type];
    if (type === 'pen') lbl = 'Stylo ' + (parseFloat(val??1) > 0 ? 'ON' : 'OFF');
    inner += `<span>${icoMap[type]}</span><span class="slabel">${lbl}</span>`;
  } else if (type === 'repeat' && parseFloat(val??3) === 0) {
    inner += `<span>${icoMap[type]}</span><span class="slabel">Répéter</span><span class="sval-inf">∞</span>`;
  } else {
    const step = type==='wait' ? 100 : (type==='turn'||type==='face_dir') ? 15 : type==='move' ? 0.5 : 10;
    inner += `<span>${icoMap[type]}</span><span class="slabel">${lblMap[type]}</span>`
           + `<input type="number" class="sval" value="${val ?? defVal[type]}" step="${step}">`
           + `<span>${sufMap[type]}</span>`;
  }
  inner += `<button class="del" onclick="this.parentNode.remove();checkEmpty()">✕</button>`;
  div.innerHTML = inner;

  div.addEventListener('dragstart', scriptDragStart);
  div.addEventListener('dragend',   scriptDragEnd);

  const body = document.getElementById('scriptBody');
  if (insertBefore) body.insertBefore(div, insertBefore);
  else              body.appendChild(div);
}

function clearScript() {
  document.querySelectorAll('#scriptBody .sblock').forEach(e => e.remove());
  document.getElementById('emptyHint').style.opacity = '1';
}

function checkEmpty() {
  if (!document.querySelector('#scriptBody .sblock'))
    document.getElementById('emptyHint').style.opacity = '1';
}

// ── Drag depuis la palette ─────────────────

function palDragStart(e) {
  dragMode = 'palette';
  dragType = e.currentTarget.dataset.type;
  dragVal  = e.currentTarget.dataset.val;
  ghost.style.cssText =
    `display:flex;position:fixed;z-index:9999;pointer-events:none;border-radius:9px;`
    + `padding:7px 12px;font-size:12px;font-weight:800;font-family:Nunito,sans-serif;`
    + `gap:7px;align-items:center;opacity:.92;transform:rotate(-3deg);border:1.5px solid;`
    + (styleMap[dragType] || '');
  ghost.innerHTML = `<span>${icoMap[dragType]}</span>${lblMap[dragType]}`;
  e.dataTransfer.effectAllowed = 'copy';
}

// ── Drag pour réordonner le programme ──────

function scriptDragStart(e) {
  dragMode = 'reorder';
  dragSrc  = e.currentTarget;
  dragSrc.classList.add('dragging');
  ghost.style.display = 'none';
  e.dataTransfer.effectAllowed = 'move';
}

function scriptDragEnd() {
  if (dragSrc) dragSrc.classList.remove('dragging');
  if (currentDropTarget) {
    currentDropTarget.classList.remove('drop-above','drop-below');
    currentDropTarget = null;
  }
  dragSrc = null;
  if (dragMode === 'reorder') dragMode = null;
}

// ── Zone programme : dragover / drop ──────

const scriptBody = document.getElementById('scriptBody');

scriptBody.addEventListener('dragover', e => {
  e.preventDefault();
  if (dragMode === 'palette') { scriptBody.classList.add('over'); return; }
  if (dragMode !== 'reorder' || !dragSrc) return;
  const target = e.target.closest('.sblock');
  if (!target || target === dragSrc) return;
  if (currentDropTarget !== target) {
    if (currentDropTarget) currentDropTarget.classList.remove('drop-above','drop-below');
    currentDropTarget = target;
  }
  const rect = target.getBoundingClientRect();
  const cls = e.clientY < rect.top + rect.height/2 ? 'drop-above' : 'drop-below';
  const other = cls === 'drop-above' ? 'drop-below' : 'drop-above';
  if (!target.classList.contains(cls)) {
    target.classList.remove(other);
    target.classList.add(cls);
  }
});

scriptBody.addEventListener('dragleave', e => {
  if (!scriptBody.contains(e.relatedTarget)) scriptBody.classList.remove('over');
});

scriptBody.addEventListener('drop', e => {
  e.preventDefault();
  scriptBody.classList.remove('over');
  if (currentDropTarget) {
    currentDropTarget.classList.remove('drop-above','drop-below');
    currentDropTarget = null;
  }

  if (dragMode === 'palette' && dragType) {
    addBlock(dragType, dragVal, getInsertPosition(e.clientY));
    ghost.style.display = 'none';
    dragType = null; dragMode = null;
    return;
  }

  if (dragMode === 'reorder' && dragSrc) {
    const target = e.target.closest('.sblock');
    if (target && target !== dragSrc) {
      const rect = target.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height/2) scriptBody.insertBefore(dragSrc, target);
      else                                        scriptBody.insertBefore(dragSrc, target.nextSibling);
    }
  }
});

// ── Ghost suit le curseur ──────────────────

document.addEventListener('dragover', e => {
  if (ghost.style.display !== 'none') {
    ghost.style.left = (e.clientX + 14) + 'px';
    ghost.style.top  = (e.clientY - 18) + 'px';
  }
});

// Retourne le bloc devant lequel insérer (null = fin de liste)
function getInsertPosition(clientY) {
  const blocks = [...document.querySelectorAll('#scriptBody .sblock')];
  for (const b of blocks) {
    const rect = b.getBoundingClientRect();
    if (clientY < rect.top + rect.height/2) return b;
  }
  return null;
}
