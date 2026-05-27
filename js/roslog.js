// ══ ROS LOG STORE ══

const ROS_LOG = [];
const LOG_FILTERS = { info: true, warn: true, error: true, debug: false };

// ══ LOGGING API ══

function rosLog(node, msg, level = 'info') {
  const entry = {
    t: new Date().toTimeString().slice(0, 8),
    node,
    msg,
    level,
  };
  ROS_LOG.push(entry);
  if (ROS_LOG.length > 600) ROS_LOG.shift();
  _appendEntry(entry);
}

function _appendEntry(entry) {
  if (!LOG_FILTERS[entry.level]) return;
  const el = document.getElementById('roslogBody');
  if (!el) return;

  const COLORS = { info: 'var(--cyan)', warn: 'var(--yellow)', error: 'var(--red)', debug: 'var(--muted)' };
  const LABELS = { info: 'INFO ', warn: 'WARN ', error: 'ERROR', debug: 'DEBUG' };

  const d = document.createElement('div');
  d.className = 'term-line';
  d.dataset.level = entry.level;
  d.innerHTML =
    `<span style="color:var(--muted)">${entry.t} </span>` +
    `<span style="color:${COLORS[entry.level]};font-weight:700">[${LABELS[entry.level]}]</span> ` +
    `<span style="color:var(--muted2);color:#4a6080">[${entry.node}]</span> ` +
    `<span style="color:var(--text)">${entry.msg}</span>`;

  el.appendChild(d);
  // Auto-scroll seulement si déjà en bas
  if (el.scrollHeight - el.scrollTop < el.clientHeight + 40) el.scrollTop = el.scrollHeight;
}

// ══ FILTER TOGGLES ══

function toggleFilter(level) {
  LOG_FILTERS[level] = !LOG_FILTERS[level];
  const id = 'f' + level.charAt(0).toUpperCase() + level.slice(1);
  document.getElementById(id)?.classList.toggle('active', LOG_FILTERS[level]);
  _rerenderLog();
}

function _rerenderLog() {
  const el = document.getElementById('roslogBody');
  if (!el) return;
  el.innerHTML = '';
  ROS_LOG.forEach(e => _appendEntry(e));
}

// ══ GÉNÉRATEURS DE MESSAGES NODES ══

let _logTick = 0;

function startNodeLogs() {
  // Messages périodiques légers (1.5s)
  setInterval(() => {
    _logTick++;
    if (!nodesLaunched) return;

    // lidar_driver — fréquence + qualité scan
    if (_logTick % 2 === 0) {
      const avg = (1.5 + Math.random() * 4).toFixed(2);
      const noise = S.lidarNoise > 0.1 ? ` — noise:±${S.lidarNoise.toFixed(2)}` : '';
      rosLog('lidar_driver', `Scan OK — 90 rays, avg_range: ${avg}m${noise}`, 'info');
    }

    // nav2 — état navigation
    if (_logTick % 3 === 0) {
      if (S.navMode !== 'idle' && S.navTarget) {
        const dist = Math.hypot(S.navTarget.x - S.x, S.navTarget.y - S.y).toFixed(1);
        rosLog('nav2_bringup', `Following path — dist_to_goal: ${dist}m`, 'info');
      } else if (nodesLaunched) {
        rosLog('nav2_bringup', 'Idle — waiting for NavigateToPose goal', 'debug');
      }
    }

    // bipboup_strategy — état interne
    if (_logTick % 4 === 0) {
      const state = S.navMode === 'idle' ? (S.teleop ? 'TELEOP' : 'STANDBY') : S.navMode.toUpperCase();
      rosLog('bipboup_strategy', `state=${state} | pos=(${S.x.toFixed(1)},${S.y.toFixed(1)}) | θ=${S.a.toFixed(0)}°`, 'debug');
    }

    // robot_state_publisher — tf
    if (_logTick % 6 === 0) {
      rosLog('robot_state_publisher', `Publishing TF: map→odom→base_link | drift=${S.odomDrift.toFixed(3)}m`, 'debug');
    }

  }, 1500);

  // Warnings + erreurs (3s)
  setInterval(() => {
    if (!nodesLaunched) return;
    if (S.battery < 20)
      rosLog('battery_monitor', `LOW BATTERY: ${S.battery.toFixed(0)}% — charge immediately`, 'warn');
    if (Math.abs(S.odomDrift) > 0.5)
      rosLog('robot_state_publisher', `Odometry drift: ${S.odomDrift.toFixed(3)}m — consider re-localization`, 'warn');
    if (S.estop)
      rosLog('safety_controller', 'E-STOP active — all motion inhibited', 'warn');
  }, 3000);

  // Erreurs critiques (10s)
  setInterval(() => {
    if (!nodesLaunched) return;
    if (S.faults.includes('LOW_BATTERY'))
      rosLog('diagnostics', `CRITICAL: LOW_BATTERY — ${S.battery.toFixed(0)}% remaining`, 'error');
    if (S.faults.includes('ODOM_DRIFT'))
      rosLog('diagnostics', `CRITICAL: ODOM_DRIFT — accumulated error ${S.odomDrift.toFixed(3)}m`, 'error');
  }, 10000);

  // Événements ponctuels au lancement
  setTimeout(() => {
    if (nodesLaunched) {
      rosLog('nav2_bringup', 'Costmap initialized — global 300×200, local 100×100', 'info');
      rosLog('bipboup_strategy', 'Arena map loaded: arena_2026.yaml — 5 goals registered', 'info');
    }
  }, 100);
}
