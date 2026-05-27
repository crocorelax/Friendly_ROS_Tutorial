// ══ APP INIT ══

function initApp() {
  renderTopics();
  renderNodes();
  initCanvases();
  initTerminal();
  initTeleop();
  initArenaClick();
  initPaneSplitter();
  initScriptResize();
  initScriptDrag();
  initHandbook();
  startLoops();
  printOnboarding();
}

function printOnboarding() {
  termLog('╔══════════════════════════════════════════════════╗', 'info');
  termLog('║  BipBoup — Coupe de France de Robotique 2026     ║', 'info');
  termLog('╚══════════════════════════════════════════════════╝', 'info');
  termLog('État: 3/5 nodes actifs  |  E-STOP ON  |  Match en attente', 'warn');
  termLog('', 'out');
  termLog(' ÉTAPE 1 ─ Démarrer les nodes:', 'out');
  termLog('   ros2 launch bipboup robot.launch.py', 'dim');
  termLog(' ÉTAPE 2 ─ Relâcher l\'E-STOP:', 'out');
  termLog('   estop off', 'dim');
  termLog(' ÉTAPE 3 ─ Choisir un mode de pilotage:', 'out');
  termLog('   teleop          clavier ZQSD / ↑↓←→', 'dim');
  termLog('   auto_collect    collecte automatique des plantes', 'dim');
  termLog('   nav_to plante1  navigation vers un objectif', 'dim');
  termLog('   clic arène      nav_to direct sur la carte', 'dim');
  termLog(' ÉTAPE 4 ─ Lancer le match (100s):', 'out');
  termLog('   ros2 run bipboup start_match', 'dim');
  termLog('', 'out');
  termLog(' 💡 Tab=autocomplétion  ↑↓=historique  help=aide complète', 'dim');
  termLog('', 'out');
}

// ══ MAIN ANIMATION LOOP ══

let lastTime = null;

function mainLoop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, .05);
  lastTime = ts;
  physicsStep(dt);
  drawRviz();
  drawArena();
  requestAnimationFrame(mainLoop);
}

// ══ PERIODIC LOOPS ══

let topicTick = 0;

function startLoops() {
  requestAnimationFrame(mainLoop);
  startNodeLogs();

  setInterval(() => {
    updateTopicVals();
    topicTick++;

    // Statusbar refresh
    const bat = S.battery;
    document.getElementById('sbBat').textContent = bat.toFixed(0) + '%';
    document.getElementById('sbBat').style.color = bat < 20 ? 'var(--red)' : bat < 50 ? 'var(--yellow)' : 'var(--green)';
    document.getElementById('sbCpu').textContent = Math.round(20 + Math.random() * 15) + '%';

    const lidarEl = document.getElementById('sbLidar');
    lidarEl.textContent = S.showLidar ? 'OK' : 'OFF';
    lidarEl.style.color = S.showLidar ? 'var(--green)' : 'var(--muted)';

    document.getElementById('sbOdom').style.color = Math.abs(S.odomDrift) > .5 ? 'var(--yellow)' : 'var(--green)';
    document.getElementById('sbWifi').textContent = (-35 - Math.round(Math.random() * 10)) + 'dBm';
    document.getElementById('sbTime').textContent = new Date().toTimeString().slice(0, 8);

    // Diagnostics
    if (bat < 20 && !S.faults.includes('LOW_BATTERY'))      S.faults.push('LOW_BATTERY');
    if (Math.abs(S.odomDrift) > .5 && !S.faults.includes('ODOM_DRIFT')) S.faults.push('ODOM_DRIFT');
    if (topicTick % 30 === 0 && S.faults.length > 0)
      termLog(`[diagnostics] ⚠ ${S.faults.join(' | ')}`, 'warn');
  }, 500);
}

// ══ SÉPARATEUR TERMINAL / ROS LOG ══

function initPaneSplitter() {
  const splitter = document.getElementById('paneSplitter');
  const termPane = document.getElementById('termPane');
  const logPane  = document.getElementById('logPane');
  let startX, startTermW;

  splitter.addEventListener('mousedown', e => {
    startX     = e.clientX;
    startTermW = termPane.offsetWidth;
    splitter.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup',   stopDrag);
    e.preventDefault();
  });

  function onDrag(e) {
    const total   = termPane.offsetWidth + logPane.offsetWidth;
    const newW    = Math.max(240, Math.min(total - 180, startTermW + e.clientX - startX));
    termPane.style.flex  = 'none';
    termPane.style.width = newW + 'px';
    logPane.style.flex   = '1';
    logPane.style.width  = '';
  }

  function stopDrag() {
    splitter.classList.remove('dragging');
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup',   stopDrag);
  }
}

// ══ KEYBOARD TELEOP ══

function initTeleop() {
  const PRESSED = {};

  document.addEventListener('keydown', e => {
    if (!S.teleop) return;
    // Ne pas capturer si le terminal a le focus
    if (document.activeElement === document.getElementById('termInput')) return;
    PRESSED[e.key] = true;
    if (e.key === ' ') { e.preventDefault(); S.cmdVel = { linear: 0, angular: 0 }; return; }
    _applyTeleopVel(PRESSED);
  });

  document.addEventListener('keyup', e => {
    delete PRESSED[e.key];
    if (S.teleop) _applyTeleopVel(PRESSED);
  });
}

function _applyTeleopVel(keys) {
  if (S.estop) return;
  const fwd  = keys['z'] || keys['Z'] || keys['ArrowUp'];
  const bwd  = keys['s'] || keys['S'] || keys['ArrowDown'];
  const left = keys['q'] || keys['Q'] || keys['ArrowLeft'];
  const rgt  = keys['d'] || keys['D'] || keys['ArrowRight'];
  S.cmdVel = {
    linear:  fwd ? 0.6 : bwd ? -0.35 : 0,
    angular: left ? 1.4 : rgt ? -1.4 : 0,
  };
}

// ══ COORDONNÉES ARÈNE AU SURVOL ══

function _arenaPixelToCoords(e) {
  const rect = arenaCanvas.getBoundingClientRect();
  const ox = (arenaW - ARENA_W * arenaScale) / 2;
  const oy = (arenaH - ARENA_H * arenaScale) / 2;
  const ax = Math.round((e.clientX - rect.left - ox) / arenaScale);
  const ay = Math.round((e.clientY - rect.top  - oy) / arenaScale);
  return { ax, ay };
}

// ══ CLIC ARÈNE → nav_to ══

function initArenaClick() {
  arenaCanvas.style.cursor = 'crosshair';

  const coordEl = document.getElementById('arenaCoords');
  arenaCanvas.addEventListener('mousemove', e => {
    const { ax, ay } = _arenaPixelToCoords(e);
    if (coordEl) coordEl.textContent = (ax >= 0 && ax <= ARENA_W && ay >= 0 && ay <= ARENA_H)
      ? `x:${ax} y:${ay}` : '';
  });
  arenaCanvas.addEventListener('mouseleave', () => { if (coordEl) coordEl.textContent = ''; });

  arenaCanvas.addEventListener('click', e => {
    if (!nodesLaunched || S.estop) return;
    const rect = arenaCanvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const ox = (arenaW - ARENA_W * arenaScale) / 2;
    const oy = (arenaH - ARENA_H * arenaScale) / 2;
    const ax = Math.round((cx - ox) / arenaScale);
    const ay = Math.round((cy - oy) / arenaScale);
    if (ax < 0 || ax > ARENA_W || ay < 0 || ay > ARENA_H) return;
    navTo(ax, ay, null, null);
    // Désactive le téléop si actif (nav prend le dessus)
    if (S.teleop) { S.teleop = false; termLog('[teleop] Téléop suspendu (nav_to actif)', 'dim'); }
  });
}

// ══ ENTRY POINT ══
runBoot();
