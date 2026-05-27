// ══ NAVIGATION AUTONOME ══

function navTo(x, y, label, onArrival) {
  if (!nodesLaunched) { termLog('[nav2] Erreur: nodes non démarrés', 'err'); return; }
  if (S.estop)        { termLog('[nav2] Erreur: E-STOP actif', 'err'); return; }
  S.navTarget = { x, y, label: label || null, onArrival: onArrival || null };
  S.navMode = 'navigating';
  const lbl = label ? ` — ${label}` : '';
  termLog(`[nav2] Goal envoyé: (${x}, ${y})${lbl}`, 'info');
  termLog('[nav2] Computing path...', 'dim');
}

function navStop() {
  S.navTarget = null;
  S.navMode = 'idle';
  S.cmdVel = { linear: 0, angular: 0 };
}

// Lookahead raycast — renvoie la distance au prochain obstacle (dans le cap actuel)
function _checkAhead(lookDist) {
  const rad = S.a * Math.PI / 180;
  for (let d = 6; d <= lookDist; d += 2) {
    const nx = S.x + Math.cos(rad) * d;
    const ny = S.y + Math.sin(rad) * d;
    if (nx < 9 || nx > ARENA_W - 9 || ny < 9 || ny > ARENA_H - 9) return d;
    for (const w of WALLS) {
      if (nx > w.x - 9 && nx < w.x + w.w + 9 && ny > w.y - 9 && ny < w.y + w.h + 9) return d;
    }
  }
  return lookDist + 1; // dégagé
}

let _obstacleWarnCooldown = 0;

// Appelé à chaque physicsStep quand navMode !== 'idle'
function navStep(dt) {
  if (!S.navTarget || S.estop) { navStop(); return; }

  const { x: tx, y: ty, onArrival } = S.navTarget;
  const dist = Math.hypot(tx - S.x, ty - S.y);

  if (dist < 10) {
    const label = S.navTarget.label;
    const cb = onArrival;
    navStop();
    termLog(`[nav2] Goal atteint${label ? ': ' + label : ''} ✓`, 'info');
    if (cb) cb();
    return;
  }

  // Contrôleur proportionnel cap + vitesse
  const targetAngle = Math.atan2(ty - S.y, tx - S.x) * 180 / Math.PI;
  let angleDiff = targetAngle - S.a;
  while (angleDiff >  180) angleDiff -= 360;
  while (angleDiff < -180) angleDiff += 360;

  const angular = Math.max(-2.0, Math.min(2.0, angleDiff * 0.06));
  const aligned = Math.abs(angleDiff) < 25;
  let   linear  = aligned ? Math.min(0.8, dist / 40) : 0.05;

  // Obstacle avoidance — lookahead 28 unités
  if (linear > 0.05) {
    const clearance = _checkAhead(28);
    if (clearance <= 28) {
      // Freinage progressif + déviation latérale
      linear = Math.min(linear, (clearance / 28) * 0.4);
      const sideBoost = clearance < 14 ? (angleDiff >= 0 ? 1.2 : -1.2) : 0;
      S.cmdVel = { linear, angular: angular + sideBoost };

      // Log d'avertissement (throttlé)
      _obstacleWarnCooldown--;
      if (_obstacleWarnCooldown <= 0) {
        termLog(`[nav2] Obstacle détecté à ${clearance.toFixed(0)} unités — freinage`, 'warn');
        if (typeof rosLog === 'function')
          rosLog('nav2_bringup', `Obstacle in path — clearance: ${clearance.toFixed(0)}u, replanning...`, 'warn');
        _obstacleWarnCooldown = 40; // ~2s à 20fps
      }
      return;
    }
  }
  _obstacleWarnCooldown = Math.max(0, _obstacleWarnCooldown - 1);

  S.cmdVel = { linear, angular };
}

// ══ COMMANDE nav_to (depuis terminal ou script) ══

function cmdNavTo(args, callback) {
  if (!args || !args.trim()) {
    termLog('Usage: nav_to <x> <y>  — ex: nav_to 150 100', 'dim');
    termLog('Survole l\'arène pour voir les coordonnées en temps réel', 'dim');
    return;
  }

  const m = args.match(/([-\d.]+)\s+([-\d.]+)/);
  if (m) { navTo(parseFloat(m[1]), parseFloat(m[2]), null, callback); return; }

  termLog(`[nav2] Format invalide: "${args}" — utilise nav_to <x> <y>`, 'err');
  termLog('Exemple: nav_to 80 60  |  nav_to 270 100', 'dim');
}

// ══ AUTO COLLECT ══

function autoCollect() {
  if (!nodesLaunched) { termLog('[auto] Nodes non démarrés', 'err'); return; }
  if (S.estop)        { termLog('[auto] E-STOP actif', 'err'); return; }

  const pending = GOALS.filter(g => !g.done);
  if (pending.length === 0) { termLog('[auto] Toutes les plantes déjà collectées ✓', 'warn'); return; }

  termLog(`[auto] Démarrage collecte autonome — ${pending.length} objectif(s)`, 'info');
  S.navMode = 'auto';

  const sequence = pending
    .map(g => `nav_to ${g.x} ${g.y}`)
    .join('; ');
  runScript(sequence);
}

// ══ SCRIPT SÉQUENTIEL ══

let _scriptQueue = [];

function runScript(text) {
  const lines = text.split(';').map(l => l.trim()).filter(l => l);
  _scriptQueue = lines;
  termLog(`[script] ${lines.length} instruction(s) chargée(s)`, 'info');
  _execNextScript();
}

function _execNextScript() {
  if (_scriptQueue.length === 0) {
    S.navMode = 'idle';
    termLog('[script] ✓ Séquence terminée', 'info');
    return;
  }

  const cmd = _scriptQueue.shift();
  termLog(`[script] > ${cmd}`, 'dim');

  if (cmd.startsWith('wait ')) {
    const ms = parseFloat(cmd.slice(5)) * 1000;
    setTimeout(_execNextScript, ms);

  } else if (cmd.startsWith('nav_to ')) {
    cmdNavTo(cmd.slice(7), _execNextScript);

  } else if (cmd.startsWith('call ')) {
    // Appel d'un script sauvegardé par l'utilisateur courant uniquement
    const name = cmd.slice(5).trim().toLowerCase();
    const userScripts = Persistence.getUserScripts('high');
    const found = userScripts.find(s => s.name.toLowerCase() === name);
    if (found && found.code) {
      const sub = found.code.split('\n').map(l => l.replace(/#.*$/, '').trim()).filter(l => l);
      _scriptQueue.unshift(...sub);
      termLog(`[script] call "${found.name}" — ${sub.length} instruction(s) injectée(s)`, 'info');
    } else {
      termLog(`[script] call: script introuvable — "${name}"`, 'err');
      termLog('[script] Vérifiez vos scripts sauvegardés (Scripts > liste)', 'dim');
    }
    _execNextScript();

  } else {
    handleCommand(cmd);
    setTimeout(_execNextScript, 300);
  }
}

function stopScript() {
  _scriptQueue = [];
  navStop();
  termLog('[script] Séquence interrompue', 'warn');
}
