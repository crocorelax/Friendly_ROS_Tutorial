// ════════════════════════════════════════════
// USER INTEGRATION — vies, niveaux, tutoriels
// Dépend de : shared/storage.js, shared/auth.js
// ════════════════════════════════════════════

// ── Contenu des tutoriels par niveau ───────

const LEVEL_TUTORIALS = {
  1: {
    title: 'Niveau 1 — Vue complète',
    icon:  '🤖',
    desc:  "L'arène est entièrement visible. Programme le robot avec les blocs de base pour collecter toutes les ⭐ sans percuter les murs.",
    blocks: [
      { icon: '⬆',   name: 'Avancer (cases)',  desc: 'Avance le robot de N cases (1 case = 1 cellule de la grille). Collision frontale = perte de vie.' },
      { icon: '⬇',   name: 'Reculer (cases)',  desc: 'Recule de N cases vers l\'arrière. Même logique de collision.' },
      { icon: '↻ ↺', name: 'Tourner (°)',      desc: 'Tourne de N degrés. Valeur positive = droite, négative = gauche.' },
      { icon: '✏️',   name: 'Stylo ON/OFF',    desc: 'Active ou désactive le tracé du chemin parcouru.' },
      { icon: '⏱',   name: 'Attendre (ms)',    desc: 'Pause de N millisecondes avant le prochain bloc.' },
      { icon: '🔁',   name: 'Répéter (N×)',    desc: 'Répète tous les blocs qui suivent N fois. Valeur 0 = boucle infinie.' },
    ],
  },
  2: {
    title: 'Niveau 2 — Mode LiDAR',
    icon:  '📡',
    desc:  "L'arène est plongée dans le noir — seul le LiDAR révèle les obstacles proches. Programme sans voir ! Nouveaux blocs disponibles :",
    newBlocks: [
      { icon: '⬆⬜', name: "Jusqu'au mur",     desc: 'Le LiDAR mesure la distance devant et le robot avance jusqu\'à 1 case avant le mur.' },
      { icon: '🚧',  name: 'Si obstacle →',    desc: 'Si le LiDAR détecte un obstacle devant, tourne de N°. Sinon continue.' },
      { icon: '🛑',  name: 'Stop si obstacle', desc: 'Arrête tout le programme si un obstacle est détecté devant. Ne perd PAS de vie.' },
      { icon: '🔍',  name: 'Vers voie libre',  desc: 'Tourne par incréments de N° jusqu\'à trouver une direction dégagée.' },
      { icon: '🧭',  name: 'Cap absolu (°)',   desc: 'Oriente le robot vers un cap précis : 0°=Nord, 90°=Est, 180°=Sud, 270°=Ouest.' },
      { icon: '🔄',  name: 'Scan 360°',        desc: 'Fait tourner le robot d\'un tour complet — utile pour cartographier l\'environnement.' },
    ],
  },
  3: {
    title: 'Niveau 3 — LiDAR + Dérive',
    icon:  '⚠️',
    desc:  "Niveau expert : l'arène est cachée comme au niveau 2 (LiDAR uniquement) ET le robot dérape à chaque mouvement. Deux blocs supplémentaires permettent de recalibrer la dérive :",
    newBlocks: [
      { icon: '🧭', name: 'Corriger cap (°)',  desc: 'Réoriente le robot vers un angle précis — annule la dérive angulaire accumulée.' },
      { icon: '⚖️', name: 'Réduire dérive',   desc: 'Réduit progressivement la dérive latérale. À utiliser régulièrement dans une boucle.' },
    ],
    warning: '⚠️ Double défi : programme à l\'aveugle avec le LiDAR, et compense la dérive avec les blocs de correction. La dérive n\'annule pas les arrêts obstacle.',
  },
};

// ── Vies ───────────────────────────────────

function getLives() {
  const u = Auth.getCurrentUser();
  return u ? (u.lives ?? 3) : 0;
}

function updateLivesHud() {
  const el = document.getElementById('livesHud');
  if (!el) return;
  const u = Auth.getCurrentUser();
  if (!u) return;
  if (u.role === 'admin') {
    el.innerHTML = '<span style="color:var(--orange);font-size:12px;font-family:\'JetBrains Mono\',monospace">♾ Admin</span>';
    return;
  }
  const lives = Math.max(0, u.lives ?? 0);
  const hearts = Math.min(lives, 5);
  el.innerHTML =
    lives === 0
      ? '<span style="color:var(--red)">💀 0 vie</span>'
      : '❤️'.repeat(hearts) + (lives > 5 ? `<span style="font-size:10px;color:var(--muted)"> ×${lives}</span>` : '');
  el.style.animation = 'none';
  void el.offsetWidth; // reflow pour relancer l'animation
  el.style.animation = 'liveLost .35s ease';
}

function loseLife() {
  const s = Auth.getSession();
  if (!s) return;
  const u = Auth.getCurrentUser();
  if (!u || u.role === 'admin') return;
  Auth.loseLive(s.username);
  updateLivesHud();
  stopFlag = true;
  if (getLives() <= 0) {
    setTimeout(showGameOver, 300);
  }
}

// ── Progression de niveau ───────────────────

function getUnlockedLevel() {
  const u = Auth.getCurrentUser();
  if (!u) return 1;
  if (u.role === 'admin') return 3;
  return (u.progress && u.progress.lowUnlocked) || 1;
}

function unlockNextLevel(current) {
  const next = current + 1;
  if (next > 3) return;
  Auth.unlockLevel('low', next); // async fire-and-forget
}

function updateMenuCards() {
  const unlocked = getUnlockedLevel();
  [1, 2, 3].forEach(n => {
    const card = document.getElementById(`menuCard${n}`);
    if (!card) return;
    let lock = card.querySelector('.mc-lock');
    if (n <= unlocked) {
      card.style.opacity = '1';
      card.style.cursor  = 'pointer';
      card.style.pointerEvents = '';
      if (lock) { lock.remove(); lock = null; }
      card.onclick = () => startLevel(n);
    } else {
      card.style.opacity = '.42';
      card.style.cursor  = 'not-allowed';
      card.style.pointerEvents = '';
      if (!lock) {
        lock = document.createElement('span');
        lock.className = 'mc-lock';
        lock.textContent = '🔒';
        card.style.position = 'relative';
        card.appendChild(lock);
      }
      card.onclick = () => _showMenuNotif(`🔒 Termine le niveau ${n - 1} pour débloquer`);
    }
  });
}

function _showMenuNotif(msg) {
  let el = document.getElementById('_menuNotif');
  if (!el) {
    el = document.createElement('div');
    el.id = '_menuNotif';
    el.style.cssText =
      'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);'
      + 'background:var(--surface);border:1px solid var(--border2);border-radius:8px;'
      + 'padding:10px 22px;font-size:13px;font-weight:700;z-index:999;'
      + 'pointer-events:none;transition:opacity .3s';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2400);
}

// Appelé par game.js quand tous les objectifs sont atteints
function onLevelComplete() {
  unlockNextLevel(currentLevel);
  const hasNext = currentLevel < 3;
  showLevelComplete(hasNext);
}

// ── Tutoriel ────────────────────────────────

function showTutorial(level) {
  if (sessionStorage.getItem(`tut_skip_${level}`) === '1') return;
  const tut = LEVEL_TUTORIALS[level];
  if (!tut) return;

  document.getElementById('tutIcon').textContent  = tut.icon;
  document.getElementById('tutTitle').textContent = tut.title;
  document.getElementById('tutDesc').textContent  = tut.desc;
  document.getElementById('tutNoShow').checked    = false;

  const list    = tut.newBlocks || tut.blocks;
  const isNew   = !!tut.newBlocks;
  const blocksEl = document.getElementById('tutBlocks');
  blocksEl.innerHTML =
    (isNew ? '<div class="tut-new-label">Nouveaux blocs disponibles</div>' : '') +
    list.map(b => `
      <div class="tut-block-row">
        <span class="tut-block-icon">${b.icon}</span>
        <div class="tut-block-info">
          <div class="tut-block-name">${b.name}</div>
          <div class="tut-block-desc">${b.desc}</div>
        </div>
      </div>`).join('');

  if (isNew) {
    blocksEl.innerHTML += '<div class="tut-also">Tous les blocs des niveaux précédents restent disponibles.</div>';
  }

  const warnEl = document.getElementById('tutWarning');
  if (tut.warning) { warnEl.textContent = tut.warning; warnEl.style.display = ''; }
  else              { warnEl.style.display = 'none'; }

  document.getElementById('tutorialModal').style.display = 'flex';
}

function closeTutorial() {
  if (document.getElementById('tutNoShow').checked) {
    sessionStorage.setItem(`tut_skip_${currentLevel}`, '1');
  }
  document.getElementById('tutorialModal').style.display = 'none';
}

// ── Modaux ──────────────────────────────────

function showGameOver() {
  document.getElementById('gameOverModal').style.display = 'flex';
}

function closeGameOver() {
  document.getElementById('gameOverModal').style.display = 'none';
}

function showLevelComplete(hasNext) {
  const stars = mapData.goals.length;
  document.getElementById('lcStars').textContent = '⭐'.repeat(stars);
  document.getElementById('lcMsg').textContent =
    hasNext ? `Niveau ${currentLevel + 1} débloqué !` : '🏆 Tu as terminé tous les niveaux !';
  const nextBtn = document.getElementById('lcNextBtn');
  nextBtn.style.display  = hasNext ? '' : 'none';
  nextBtn.dataset.nextLv = currentLevel + 1;
  document.getElementById('levelCompleteModal').style.display = 'flex';
}

function closeLevelComplete() {
  document.getElementById('levelCompleteModal').style.display = 'none';
  updateMenuCards();
}

function goNextLevel() {
  const n = parseInt(document.getElementById('lcNextBtn').dataset.nextLv);
  closeLevelComplete();
  startLevel(n);
}
