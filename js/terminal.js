// ══ COMMAND TABLE ══
// Les fonctions cmd* sont des déclarations hoistées — safe à référencer ici.
const COMMANDS = {
  'help':                                                     cmdHelp,
  'ros2 launch bipboup robot.launch.py':                      cmdLaunch,
  'ros2 service call /estop':                                 cmdEstop,
  'ros2 service call /estop std_srvs/srv/SetBool "{data: false}"': cmdEstop,
  'ros2 topic pub /cmd_vel':                                  cmdCmdvel,
  'ros2 topic echo /scan':                                    cmdEchoScan,
  'ros2 topic echo /odom':                                    cmdEchoOdom,
  'ros2 topic list':                                          cmdTopicList,
  'ros2 topic hz /scan':                                      cmdHz,
  'ros2 node list':                                           cmdNodeList,
  'ros2 run bipboup start_match':                             cmdStartMatch,
  // Téléop clavier
  'teleop':                                                   cmdTeleop,
  // Navigation autonome (arrow functions → résolution à l'appel, pas au parse)
  'nav_to':                      () => cmdNavTo(''),
  'auto_collect':                () => autoCollect(),
  // Script séquentiel
  'ros2 run bipboup run_script': () => cmdRunScript(''),
  // Stop navigation / script
  'nav_stop':                    () => navStop(),
  'stop_script':                 () => stopScript(),
  // Script editor
  'scripts':                     () => openScriptPanel(),
  'estop off': cmdEstop,
  'estop on': () => {
    S.estop = true;
    termLog('E-STOP activé — robot immobilisé', 'err');
    const overlay = document.getElementById('panicOverlay');
    overlay.style.display = 'block';
    setTimeout(() => overlay.style.display = 'none', 800);
    updateTopicVals();
  },
  'clear': () => { document.getElementById('termBody').innerHTML = ''; },
};

const CMD_HINTS = [
  'ros2 launch bipboup robot.launch.py',
  'ros2 service call /estop std_srvs/srv/SetBool "{data: false}"',
  'teleop',
  'nav_to 80 60',
  'nav_to 220 60',
  'nav_to 80 140',
  'nav_to 220 140',
  'nav_to 270 100',
  'nav_to 150 100',
  'auto_collect',
  'nav_stop',
  'stop_script',
  'scripts',
  'ros2 run bipboup run_script "tour_de_jardin"',
  'ros2 run bipboup run_script "rush_gardemanger"',
  'ros2 run bipboup run_script "nav_to 80 60; wait 1; nav_to 270 100"',
  'ros2 run bipboup start_match',
  'ros2 topic pub /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.5}, angular: {z: 0.0}}"',
  'ros2 topic list',
  'ros2 topic echo /scan',
  'ros2 topic echo /odom',
  'ros2 topic hz /scan',
  'ros2 node list',
  'estop off',
  'estop on',
  'clear',
  'help',
];

// ══ INIT ══

function initTerminal() {
  const input = document.getElementById('termInput');
  input.addEventListener('keydown', onTermKey);
  input.addEventListener('input', onTermInput);
  input.focus();
}

// ══ INPUT HANDLING ══

let cmdHistory = [], cmdHistIdx = -1;

function onTermKey(e) {
  if (e.key === 'Enter') {
    const val = e.target.value.trim();
    if (!val) return;
    cmdHistory.unshift(val);
    cmdHistIdx = -1;
    termLog('bipboup@robot:~$ ' + val, 'cmd');
    e.target.value = '';
    document.getElementById('autoHint').textContent = '';
    handleCommand(val);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (cmdHistIdx < cmdHistory.length - 1) { cmdHistIdx++; e.target.value = cmdHistory[cmdHistIdx]; }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (cmdHistIdx > 0) { cmdHistIdx--; e.target.value = cmdHistory[cmdHistIdx]; }
    else { cmdHistIdx = -1; e.target.value = ''; }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const hint = CMD_HINTS.find(c => c.startsWith(e.target.value) && c !== e.target.value);
    if (hint) e.target.value = hint;
  }
}

function onTermInput(e) {
  const val = e.target.value;
  const hint = CMD_HINTS.find(c => c.startsWith(val) && c !== val);
  document.getElementById('autoHint').textContent = hint ? hint.slice(val.length) : '';
}

// ══ OUTPUT ══

function termLog(txt, cls = 'out') {
  const el = document.getElementById('termBody');
  const d = document.createElement('div');
  d.className = 'term-line ' + cls;
  d.textContent = txt;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}

// ══ COMMAND DISPATCH ══

function handleCommand(cmd) {
  const lower = cmd.toLowerCase().trim();

  // cmd_vel inline YAML
  const cvFull = cmd.match(/ros2 topic pub \/cmd_vel.*linear.*x:\s*([-\d.]+).*angular.*z:\s*([-\d.]+)/);
  if (cvFull) { cmdCmdvelArgs(parseFloat(cvFull[1]), parseFloat(cvFull[2])); return; }

  // cmd_vel shorthand
  const cvShort = cmd.match(/^cmd_vel\s+([-\d.]+)\s+([-\d.]+)/);
  if (cvShort) { cmdCmdvelArgs(parseFloat(cvShort[1]), parseFloat(cvShort[2])); return; }

  // nav_to avec arguments
  const navMatch = lower.match(/^nav_to\s+(.+)/);
  if (navMatch) { cmdNavTo(navMatch[1]); return; }

  // run_script avec arguments
  const scriptMatch = cmd.match(/^ros2 run bipboup run_script\s+"?(.+?)"?$/i);
  if (scriptMatch) { cmdRunScript(scriptMatch[1]); return; }

  const fn = COMMANDS[lower];
  if (fn) { fn(); }
  else { termLog(`bash: ${cmd}: command not found. Try "help"`, 'err'); }
}

// ══ COMMAND IMPLEMENTATIONS ══

function cmdHelp() {
  termLog('═══ BipBoup ROS2 CLI — aide complète ═══', 'info');
  termLog('', 'out');
  termLog('── DÉMARRAGE ──────────────────────────────────────', 'dim');
  termLog('ros2 launch bipboup robot.launch.py', 'out');
  termLog('ros2 service call /estop std_srvs/srv/SetBool "{data: false}"', 'out');
  termLog('', 'out');
  termLog('── PILOTAGE ────────────────────────────────────────', 'dim');
  termLog('teleop                        — clavier ZQSD / ↑↓←→  (toggle)', 'out');
  termLog('nav_to <x> <y>                — navigation autonome  ex: nav_to 80 60', 'out');
  termLog('                                Survole l\'arène pour voir les coords en temps réel', 'dim');
  termLog('auto_collect                  — collecte automatique de toutes les plantes', 'out');
  termLog('cmd_vel <lin> <ang>           — commande directe  ex: cmd_vel 0.5 0.0', 'out');
  termLog('nav_stop | stop_script        — interrompre la navigation / le script', 'out');
  termLog('', 'out');
  termLog('── SCRIPTS ─────────────────────────────────────────', 'dim');
  termLog('ros2 run bipboup run_script "<cmd1>; wait <s>; <cmd2>; ..."', 'out');
  termLog('  Prédéfinis: tour_de_jardin | rush_gardemanger | zigzag | demo_timed', 'out');
  termLog('  ex: ros2 run bipboup run_script "nav_to 80 60; wait 1; nav_to 270 100"', 'out');
  termLog('', 'out');
  termLog('── MATCH ───────────────────────────────────────────', 'dim');
  termLog('ros2 run bipboup start_match  — lancer le chrono (100s)', 'out');
  termLog('', 'out');
  termLog('── DIAGNOSTIC ──────────────────────────────────────', 'dim');
  termLog('ros2 topic list | echo /scan | echo /odom | hz /scan', 'out');
  termLog('ros2 node list', 'out');
  termLog('estop off | estop on  |  clear', 'out');
  termLog('', 'out');
  termLog('💡 Tab=autocomplétion  ↑↓=historique  clic arène=nav_to', 'dim');
}

function cmdLaunch() {
  if (nodesLaunched) { termLog('[nav2] Déjà lancé', 'warn'); return; }
  termLog('[launch] Chargement de bipboup/robot.launch.py...', 'info');
  setTimeout(() => termLog('[nav2_bringup] Initialisation navigation stack...', 'out'), 400);
  setTimeout(() => termLog('[bipboup_strategy] Chargement de la stratégie...', 'out'), 800);
  setTimeout(() => termLog('[bipboup_strategy] Carte chargée: arena_2026.yaml', 'out'), 1100);
  setTimeout(() => termLog('[nav2] Nav2 ready — costmaps initialized', 'info'), 1500);
  setTimeout(() => {
    nodesLaunched = true;
    NODES[2].ok = true; NODES[3].ok = true;
    renderNodes();
    termLog('[launch] Tous les nodes actifs ✓', 'info');
    rosLog('roslaunch', 'All nodes started successfully — 5/5 active', 'info');
    rosLog('nav2_bringup', 'Costmap initialized — global 300×200, local 100×100', 'info');
    rosLog('bipboup_strategy', 'Arena map loaded: arena_2026.yaml — goals registered', 'info');
    completeMission('launch');
    termLog('', 'out');
    termLog('► Étape suivante: relâcher l\'E-STOP', 'warn');
    termLog('  ros2 service call /estop std_srvs/srv/SetBool "{data: false}"', 'dim');
    termLog('  raccourci: estop off', 'dim');
  }, 2000);
}

function cmdEstop() {
  if (!nodesLaunched) { termLog('Erreur: nodes non démarrés. Lance d\'abord robot.launch.py', 'err'); return; }
  S.estop = false;
  termLog('[estop] E-STOP relâché — robot opérationnel ✓', 'info');
  rosLog('safety_controller', 'E-STOP released — motion enabled', 'info');
  showNotif('Robot débloqué !', 'green');
  completeMission('estop');
  updateTopicVals();
  termLog('', 'out');
  termLog('► Robot prêt — choisir un mode de pilotage:', 'info');
  termLog('  teleop          — clavier ZQSD/flèches', 'dim');
  termLog('  auto_collect    — collecte automatique', 'dim');
  termLog('  nav_to 80 60    — navigation (survole arène pour coords)', 'dim');
  termLog('  cmd_vel 0.5 0.0 — commande manuelle', 'dim');
  termLog('  Puis: ros2 run bipboup start_match', 'dim');
}

function cmdCmdvel() {
  termLog('Usage: ros2 topic pub /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.5}, angular: {z: 0.0}}"', 'dim');
  termLog('Raccourci: cmd_vel <linear> <angular>', 'dim');
  termLog('Exemples:', 'dim');
  termLog('  cmd_vel 0.5 0.0   → avancer', 'dim');
  termLog('  cmd_vel 0.0 1.0   → tourner gauche', 'dim');
  termLog('  cmd_vel -0.3 0.0  → reculer', 'dim');
  termLog('  cmd_vel 0.0 0.0   → stop', 'dim');
}

function cmdCmdvelArgs(lin, ang) {
  if (S.estop)        { termLog("E-STOP actif — relâchez d'abord l'arrêt urgence", 'err'); return; }
  if (!nodesLaunched) { termLog('Nodes non démarrés', 'err'); return; }
  S.cmdVel.linear = lin; S.cmdVel.angular = ang;
  termLog(`[cmd_vel] linear.x=${lin.toFixed(2)} angular.z=${ang.toFixed(2)}`, 'info');
  completeMission('move');
  updateTopicVals();
}

function cmdEchoScan() {
  termLog('[/scan] sensor_msgs/LaserScan:', 'info');
  termLog('  angle_min: -3.14  angle_max: 3.14  range_max: 12.0', 'out');
  termLog(`  ranges[0..5]: [${[0,1,2,3,4].map(() => (0.2 + Math.random() * 8).toFixed(3)).join(', ')}...]`, 'out');
  termLog(`  noise level: ±${S.lidarNoise.toFixed(2)}`, 'out');
  termLog('Ctrl+C pour arrêter (tapez clear)', 'dim');
}

function cmdEchoOdom() {
  termLog('[/odom] nav_msgs/Odometry:', 'info');
  termLog(`  pose.position: x=${S.x.toFixed(4)} y=${S.y.toFixed(4)} z=0.0`, 'out');
  termLog(`  pose.orientation (yaw): ${(S.a * Math.PI / 180).toFixed(4)} rad`, 'out');
  termLog(`  twist.linear.x: ${S.cmdVel.linear.toFixed(4)}`, 'out');
  termLog(`  cumulative drift: ${S.odomDrift.toFixed(4)} m`, 'out');
}

function cmdTopicList() {
  termLog('Topics actifs:', 'info');
  TOPICS.forEach(t => termLog(`  ${t.name}  [${t.type}]`, 'out'));
}

function cmdHz() {
  termLog('[ros2 topic hz /scan] subscribing to /scan...', 'info');
  setTimeout(() => termLog(`average rate: ${(9.8 + Math.random() * .4).toFixed(1)} Hz`, 'out'), 300);
  setTimeout(() => termLog('  min: 0.098s  max: 0.104s  std dev: 0.002s', 'out'), 400);
}

function cmdNodeList() {
  termLog("Nodes en cours d'exécution:", 'info');
  NODES.forEach(n => {
    const ok = nodesLaunched || n.ok;
    termLog(`  ${ok ? '●' : '○'} /${n.name}  [CPU: ${n.cpu}]`, ok ? 'out' : 'warn');
  });
}

function cmdStartMatch() {
  if (!nodesLaunched) { termLog('Lance d\'abord: ros2 launch bipboup robot.launch.py', 'err'); return; }
  if (S.estop)        { termLog('E-STOP actif — relâchez avant le match', 'err'); return; }
  if (S.matchRunning) { termLog('Match déjà en cours', 'warn'); return; }

  S.matchRunning = true; S.matchTime = 100; S.score = 0;
  GOALS.forEach(g => g.done = false);

  const ms = document.getElementById('matchStatus');
  ms.textContent = 'EN JEU';
  ms.style.background = 'rgba(0,214,143,.15)';
  ms.style.color = 'var(--green)';

  document.getElementById('missionPanel').style.display = 'block';
  termLog('=== MATCH DÉMARRÉ — 100 secondes ===', 'warn');
  termLog('Collecte les plantes, atteins le garde-manger !', 'info');
  termLog('💡 Conseil: auto_collect pour tout faire automatiquement', 'dim');
  showNotif('Match démarré ! 100 secondes pour scorer !', 'yellow');
  updateMissionUI();
}

function cmdTeleop() {
  if (!nodesLaunched) { termLog('[teleop] Nodes non démarrés', 'err'); return; }
  S.teleop = !S.teleop;
  if (S.teleop) {
    navStop(); // annule toute nav en cours
    termLog('[teleop_twist_keyboard] Téléop activé ✓', 'info');
    termLog('  Z / ↑   avancer        S / ↓   reculer', 'out');
    termLog('  Q / ←   tourner gauche D / →   tourner droite', 'out');
    termLog('  Espace  stop           "teleop" pour désactiver', 'dim');
    showNotif('Téléop ON — ZQSD / flèches', 'green');
    document.getElementById('termInput').blur();
  } else {
    S.cmdVel = { linear: 0, angular: 0 };
    termLog('[teleop] Téléop désactivé', 'dim');
    showNotif('Téléop OFF', '');
    document.getElementById('termInput').focus();
  }
}

function cmdRunScript(args) {
  if (!args || !args.trim()) {
    termLog('Usage: ros2 run bipboup run_script "<séquence>"', 'dim');
    termLog('', 'out');
    termLog('Format: "cmd1; wait <s>; cmd2; ..."', 'dim');
    termLog('Commandes disponibles dans un script:', 'dim');
    termLog('  nav_to <x> <y>  wait <secondes>  cmd_vel <l> <a>  call <script>', 'dim');
    termLog('', 'out');
    termLog('Scripts prédéfinis:', 'dim');
    termLog('  tour_de_jardin    — visite toutes les plantes', 'dim');
    termLog('  rush_gardemanger  — cap direct vers le garde-manger', 'dim');
    termLog('  zigzag            — exploration en zigzag', 'dim');
    termLog('  ex: ros2 run bipboup run_script "tour_de_jardin"', 'dim');
    return;
  }
  if (!nodesLaunched) { termLog('[script] Nodes non démarrés', 'err'); return; }
  if (S.estop)        { termLog('[script] E-STOP actif', 'err'); return; }
  runScript(args.trim());
}
