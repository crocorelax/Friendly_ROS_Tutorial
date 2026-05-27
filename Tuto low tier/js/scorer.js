// ════════════════════════════════════════════
// SCORER — Test du programme sur N maps générées
// Dépend de : config.js, auth.js, program.js (getBlocks)
// ════════════════════════════════════════════

const SCORE_MAP_COUNT = 10;
const SCORE_GRID_W    = 15;
const SCORE_GRID_H    = 15;
const SCORE_MAX_STEPS = 120000; // sécurité anti-boucle infinie

// ── Générateur pseudo-aléatoire déterministe ─

function _seededRng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0x100000000; };
}

// ── Génération des maps de test ──────────────

function generateTestMaps(count) {
  const maps = [];
  for (let m = 0; m < count; m++) {
    const rng  = _seededRng(m * 137 + 2026);
    const walls = new Set();

    // Murs intérieurs (on évite le coin spawn et les bords extrêmes)
    const wallCount = 8 + Math.floor(rng() * 14);
    let attempts = wallCount * 4;
    while (walls.size < wallCount && attempts-- > 0) {
      const col = 1 + Math.floor(rng() * (SCORE_GRID_W - 2));
      const row = 1 + Math.floor(rng() * (SCORE_GRID_H - 2));
      if (col <= 2 && row <= 2) continue; // préserve la zone spawn
      walls.add(`${col},${row}`);
    }

    // Zone spawn garantie libre
    walls.delete('1,1'); walls.delete('1,2'); walls.delete('2,1');

    const spawn = { col: 1, row: 1 };

    // 1 à 3 objectifs dans la zone centrale
    const goalCount = 1 + Math.floor(rng() * 3);
    const goals = [];
    for (let g = 0; g < goalCount; g++) {
      for (let a = 0; a < 80; a++) {
        const col = 3 + Math.floor(rng() * (SCORE_GRID_W - 6));
        const row = 3 + Math.floor(rng() * (SCORE_GRID_H - 6));
        if (!walls.has(`${col},${row}`) && !goals.find(x => x.col === col && x.row === row)) {
          goals.push({ col, row, done: false });
          break;
        }
      }
    }
    // Fallback : si aucun objectif placé
    if (!goals.length) goals.push({ col: 7, row: 7, done: false });

    maps.push({ walls, goals, spawn });
  }
  return maps;
}

// ── Simulateur synchrone (sans rendu) ────────
// Exécute la liste de blocs sur une map de test et retourne
// { scored, total, passed }

function _simulateBlocks(blocks, testMap) {
  const C  = CELL;
  const GW = SCORE_GRID_W, GH = SCORE_GRID_H;

  // État local de simulation (n'affecte pas les globaux du jeu)
  let sx  = (testMap.spawn.col + 0.5) * C;
  let sy  = (testMap.spawn.row + 0.5) * C;
  let sa  = 0;
  let stopped = false;
  let steps   = 0;

  const goals = testMap.goals.map(g => ({ ...g, done: false }));
  let scored  = 0;

  // Collision locale
  function collides(x, y) {
    const rb = C * 0.38;
    if (x-rb<0||y-rb<0||x+rb>GW*C||y+rb>GH*C) return true;
    const c0 = Math.floor((x-rb)/C), c1 = Math.floor((x+rb)/C);
    const r0 = Math.floor((y-rb)/C), r1 = Math.floor((y+rb)/C);
    for (let c=c0; c<=c1; c++) for (let r=r0; r<=r1; r++) {
      if (c<0||r<0||c>=GW||r>=GH) return true;
      if (testMap.walls.has(`${c},${r}`)) return true;
    }
    return false;
  }

  function checkGoals() {
    const thresh = C * 0.7;
    goals.forEach(g => {
      if (g.done) return;
      if (Math.hypot(sx-(g.col+.5)*C, sy-(g.row+.5)*C) < thresh) { g.done=true; scored++; }
    });
  }

  // Mouvements
  function doMove(pixels) {
    const dir = pixels > 0 ? 1 : -1;
    const pix = Math.abs(Math.round(pixels));
    const rad = sa * Math.PI / 180;
    const dx  = Math.sin(rad) * dir, dy = -Math.cos(rad) * dir;
    for (let i=0; i<pix; i++) {
      if (stopped || steps++ > SCORE_MAX_STEPS) return;
      if (collides(sx+dx, sy+dy)) { stopped = true; return; }
      sx+=dx; sy+=dy; checkGoals();
    }
  }

  function doTurn(deg) { sa += deg; }

  function aheadBlocked(dist) {
    const rad = sa * Math.PI / 180;
    return collides(sx + Math.sin(rad)*(dist||C*0.9), sy - Math.cos(rad)*(dist||C*0.9));
  }

  function doMoveToWall() {
    const rad = sa * Math.PI / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    while (!stopped && steps++ < SCORE_MAX_STEPS) {
      if (collides(sx+dx, sy+dy)) break;
      sx+=dx; sy+=dy; checkGoals();
    }
    // Recule de ~0.65 case pour ne pas coller au mur
    const backDist = Math.round(C * 0.65);
    for (let i=0; i<backDist; i++) {
      const bx=sx-dx, by=sy-dy;
      if (!collides(bx,by)) { sx=bx; sy=by; } else break;
    }
  }

  // Interpréteur
  function runList(list) {
    for (let i=0; i<list.length; i++) {
      if (stopped || steps > SCORE_MAX_STEPS) return;
      const b = list[i];

      switch (b.type) {

        case 'move':
          doMove(b.val * C);
          break;

        case 'move_to_wall':
          doMoveToWall();
          break;

        case 'turn':
          doTurn(b.val);
          break;

        case 'face_dir': {
          const curr = ((sa % 360) + 360) % 360;
          let diff = b.val - curr;
          if (diff > 180) diff -= 360; if (diff < -180) diff += 360;
          doTurn(diff);
          break;
        }

        case 'scan_360':
          doTurn(360);
          break;

        case 'wait':
          break; // pas de délai en simulation

        case 'pen':
          break; // stylo ignoré

        case 'repeat': {
          const count = b.val === 0 ? 500 : Math.max(1, Math.round(b.val)); // cap ∞ à 500
          const sub   = list.slice(i + 1);
          for (let r=0; r<count && !stopped && steps<SCORE_MAX_STEPS; r++) runList(sub);
          return; // repeat consomme tous les blocs suivants
        }

        case 'fix_cap': {
          const curr2 = ((sa % 360) + 360) % 360;
          let diff2 = b.val - curr2;
          if (diff2 > 180) diff2 -= 360; if (diff2 < -180) diff2 += 360;
          doTurn(diff2);
          break;
        }

        case 'fix_drift':
          break; // pas de dérive en simulation (toujours N1)

        case 'if_obstacle':
          if (aheadBlocked()) doTurn(b.val || 90);
          break;

        case 'stop_obstacle':
          if (aheadBlocked()) { stopped = true; return; }
          break;

        case 'turn_to_open': {
          const step    = b.val || 90;
          const maxTurn = Math.ceil(360 / Math.abs(step));
          for (let t=0; t<maxTurn && !stopped; t++) {
            if (!aheadBlocked()) break;
            doTurn(step);
          }
          break;
        }
      }
    }
  }

  runList(blocks);
  return { scored, total: goals.length, passed: goals.length > 0 && scored === goals.length };
}

// ── Point d'entrée public ─────────────────────

let _lastTestMaps    = null;  // stocke les maps pour le "charger & tester"
let _lastTestResults = null;

function runScoreTest() {
  const rawBlocks = getBlocks();
  if (!rawBlocks.length) {
    _flashScore('⚠️ Ajoute un programme avant de tester !');
    return;
  }

  // Génération déterministe — toujours les mêmes 10 maps
  _lastTestMaps = generateTestMaps(SCORE_MAP_COUNT);

  const blocks  = rawBlocks.map(b => ({ type: b.type, val: b.val }));
  _lastTestResults = _lastTestMaps.map((map, idx) => ({
    mapIdx: idx, map, ..._simulateBlocks(blocks, map),
  }));

  const totalPassed = _lastTestResults.filter(r => r.passed).length;

  // Sauvegarde du meilleur score
  const s = Auth.getSession();
  if (s) Auth.updateScore(s.username, 'low', totalPassed);

  showScoreResults(_lastTestResults, totalPassed);
}

// ── Affichage des résultats ───────────────────

function showScoreResults(results, totalPassed) {
  const total = results.length;
  const pct   = Math.round(totalPassed / total * 100);

  const color = totalPassed >= 8 ? 'var(--green)'
              : totalPassed >= 5 ? 'var(--yellow)'
              : 'var(--red)';

  const medal = totalPassed === total ? '🏆'
              : totalPassed >= 8     ? '🥇'
              : totalPassed >= 5     ? '🥈'
              : totalPassed >= 2     ? '🥉' : '💀';

  document.getElementById('scoreMedal').textContent   = medal;
  document.getElementById('scoreNum').textContent     = `${totalPassed} / ${total}`;
  document.getElementById('scoreNum').style.color     = color;
  document.getElementById('scoreLabel').textContent   =
    totalPassed === total ? 'Parfait ! Ton robot est universel 🎉'
    : totalPassed === 0   ? 'Le robot a échoué sur toutes les maps…'
    : `${pct}% des maps réussies`;

  const fill = document.getElementById('scoreBarFill');
  fill.style.transition = 'none';
  fill.style.width      = '0%';
  requestAnimationFrame(() => {
    fill.style.transition  = 'width 0.7s ease';
    fill.style.background  = color;
    fill.style.width       = pct + '%';
  });

  document.getElementById('scoreList').innerHTML = results.map((r, i) => `
    <div class="sc-item ${r.passed ? 'sc-ok' : 'sc-fail'}"
         ${!r.passed ? `onclick="loadScoreMap(${i})"` : ''}>
      <span class="sc-idx">${i + 1}</span>
      <span class="sc-icon">${r.passed ? '✅' : '❌'}</span>
      <span class="sc-txt">
        Map ${i+1} — <b>${r.scored}/${r.total}</b> objectif${r.total > 1 ? 's' : ''}
      </span>
      ${!r.passed ? '<span class="sc-load">▶ Charger</span>' : ''}
    </div>`).join('');

  document.getElementById('scoreModal').style.display = 'flex';
}

function closeScoreModal() {
  document.getElementById('scoreModal').style.display = 'none';
}

// Charge une map de test dans l'arène pour analyse temps réel
function loadScoreMap(idx) {
  if (!_lastTestMaps || !_lastTestMaps[idx]) return;
  const testMap = _lastTestMaps[idx];

  mapData.walls = new Set(testMap.walls);
  mapData.goals = testMap.goals.map(g => ({ ...g, done: false }));
  mapData.spawn = { ...testMap.spawn };

  closeScoreModal();
  resetGame();
  setChip(`Map test n°${idx + 1} chargée — lance pour tester`, 'ok');
}

// ── Notif flash (si pas encore dans le jeu) ──

function _flashScore(msg) {
  let el = document.getElementById('_scoreFlash');
  if (!el) {
    el = Object.assign(document.createElement('div'), { id: '_scoreFlash' });
    el.style.cssText =
      'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);'
      + 'background:var(--surface);border:1px solid var(--yellow);color:var(--yellow);'
      + 'border-radius:8px;padding:10px 22px;font-size:13px;font-weight:700;'
      + 'z-index:1200;pointer-events:none;transition:opacity .35s';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2600);
}
