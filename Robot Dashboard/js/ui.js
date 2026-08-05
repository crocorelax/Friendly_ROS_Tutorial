function updateDataUI() {
  const active = simMode || connected;

  const setBadge = (id, text, cls) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = text; el.className = 'ph-badge ' + cls; }
  };
  setBadge('lidarBadge', active ? 'LIVE' : 'OFFLINE', active ? 'live' : 'offline');
  setBadge('odomBadge',  active ? 'LIVE' : 'OFFLINE', active ? 'live' : 'offline');
  // La caméra n'est jamais simulée : "LIVE" seulement en vraie connexion robot
  setBadge('camBadge', (connected && ws) ? 'LIVE' : 'OFFLINE', (connected && ws) ? 'live' : 'offline');
  setBadge('imuBadge',   active ? 'LIVE' : 'OFFLINE', active ? 'live' : 'offline');
  setBadge('diagBadge',  active ? 'LIVE' : 'OFFLINE', active ? 'live' : 'offline');
  setBadge('sysBadge',   active ? 'LIVE' : 'OFFLINE', active ? 'live' : 'offline');

  if (!active) return;

  const fmt = (v, d = 2) => v.toFixed(d);
  document.getElementById('posX').textContent   = fmt(state.odom.x);
  document.getElementById('posY').textContent   = fmt(state.odom.y);
  document.getElementById('posYaw').textContent = fmt(state.heading, 0) + '°';
  document.getElementById('velLin').textContent = fmt(state.odom.vx);
  document.getElementById('velAng').textContent = fmt(state.odom.vz);
  document.getElementById('batVal').textContent = fmt(state.battery, 0);

  const pct = (v, max) => Math.min(100, Math.abs(v) / max * 100);
  setBar('posXBar',   pct(state.odom.x,    3),   'var(--blue)');
  setBar('posYBar',   pct(state.odom.y,    3),   'var(--blue)');
  setBar('posYawBar', pct(state.heading,   360),  'var(--purple)');
  setBar('velLinBar', pct(state.odom.vx,   1),   'var(--green)');
  setBar('velAngBar', pct(state.odom.vz,   2),   'var(--orange)');

  const batCol = state.battery > 50 ? 'var(--green)' : state.battery > 20 ? 'var(--yellow)' : 'var(--red)';
  setBar('batBar', state.battery, batCol);
  document.getElementById('batVal').style.color = batCol;

  document.getElementById('compassDeg').textContent = state.heading.toFixed(0) + '°';
  document.getElementById('totalDist').textContent  = state.totalDist.toFixed(1) + ' m';
  if (state.uptimeStart) {
    const s = Math.floor((Date.now() - state.uptimeStart) / 1000);
    document.getElementById('uptime').textContent = `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  document.getElementById('gvX').textContent = state.imu.gx.toFixed(1);
  document.getElementById('gvY').textContent = state.imu.gy.toFixed(1);
  document.getElementById('gvZ').textContent = state.imu.gz.toFixed(1);
  document.getElementById('accelXVal').textContent = state.imu.ax.toFixed(2) + ' m/s²';
  document.getElementById('accelYVal').textContent = state.imu.ay.toFixed(2) + ' m/s²';
  document.getElementById('accelZVal').textContent = state.imu.az.toFixed(2) + ' m/s²';
  setBar('accelXBar', 50 + state.imu.ax / 12 * 50, '#ef4444');
  setBar('accelYBar', 50 + state.imu.ay / 12 * 50, '#22c55e');
  setBar('accelZBar', state.imu.az / 12 * 100,      '#38bdf8');

  document.getElementById('sysBat').textContent     = state.battery.toFixed(0) + '%';
  document.getElementById('sysBat').style.color     = batCol;
  setBar('sysBatBar', state.battery, batCol);

  const cpuCol = state.sys.cpu > 80 ? 'var(--red)' : state.sys.cpu > 60 ? 'var(--yellow)' : 'var(--text)';
  document.getElementById('sysCpu').textContent     = state.sys.cpu.toFixed(0) + '%';
  document.getElementById('sysCpu').style.color     = cpuCol;
  setBar('sysCpuBar', state.sys.cpu, 'var(--blue)');

  const tempCol = state.sys.temp > 70 ? 'var(--red)' : state.sys.temp > 60 ? 'var(--yellow)' : 'var(--text)';
  document.getElementById('sysTemp').textContent    = state.sys.temp.toFixed(0) + '°C';
  document.getElementById('sysTemp').style.color    = tempCol;
  setBar('sysTempBar', state.sys.temp / 85 * 100, 'var(--orange)');

  document.getElementById('sysWifi').textContent    = state.sys.wifi + ' dBm';
  setBar('sysWifiBar', Math.max(0, 100 + state.sys.wifi * 1.5), 'var(--cyan)');

  const latCol = state.sys.latency > 50 ? 'var(--red)' : state.sys.latency > 20 ? 'var(--yellow)' : 'var(--text)';
  document.getElementById('sysLatency').textContent = state.sys.latency + ' ms';
  document.getElementById('sysLatency').style.color = latCol;
  setBar('sysLatencyBar', Math.min(100, state.sys.latency), 'var(--purple)');

  document.getElementById('topicsList').innerHTML = [
    { name: '/scan',          freq: '10Hz',  val: `${state.lidar.ranges.length} pts`,            ok: true },
    { name: '/cmd_vel',       freq: '20Hz',  val: `lin:${state.odom.vx.toFixed(2)}`,             ok: true },
    { name: '/odom',          freq: '50Hz',  val: `(${state.odom.x.toFixed(1)},${state.odom.y.toFixed(1)})`, ok: true },
    { name: '/imu/data',      freq: '100Hz', val: `gz:${state.imu.gz.toFixed(1)}°/s`,            ok: true },
    { name: '/battery_state', freq: '1Hz',   val: `${state.battery.toFixed(0)}%`,                ok: state.battery > 20 },
    { name: '/tf',            freq: '100Hz', val: 'map→odom→base',                               ok: true },
  ].map(t => `
    <div class="topic-row">
      <div class="topic-dot" style="background:${t.ok ? 'var(--green)' : 'var(--red)'}"></div>
      <span class="topic-name">${t.name}</span>
      <span class="topic-freq">${t.freq}</span>
      <span class="topic-val">${t.val}</span>
    </div>`).join('');

  document.getElementById('freqBadge').textContent = simMode ? 'SIM 30Hz' : '~30Hz';
}

function setBar(id, pct, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = Math.min(100, Math.max(0, pct)) + '%';
  if (color) el.style.background = color;
}

function setBadgesOffline() {
  ['lidarBadge','odomBadge','camBadge','imuBadge','diagBadge','sysBadge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = 'OFFLINE'; el.className = 'ph-badge offline'; }
  });
}

function setBadgesLive() {
  ['lidarBadge','odomBadge','imuBadge','diagBadge','sysBadge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = 'LIVE'; el.className = 'ph-badge live'; }
  });
  const cb = document.getElementById('camBadge');
  if (cb) { cb.textContent = 'SIM'; cb.className = 'ph-badge live'; }
}

const EXPLANATIONS = [
  'Le <span>LiDAR</span> tourne à 10 Hz et émet 360 rayons laser — chaque point représente une surface réfléchissante.',
  'L\'<span>odométrie</span> calcule la position à partir des encodeurs de roues. Elle dérive avec le temps sans correction externe.',
  'L\'<span>IMU</span> mesure accélérations et vitesses angulaires sur 3 axes à 100 Hz — indispensable pour stabiliser le cap.',
  'La <span>caméra</span> est utilisée pour détecter visuellement les objets à collecter (Kaplas, plantes).',
  '<span>rosbridge</span> convertit les topics ROS en WebSocket JSON — c\'est ce qui permet cette page de fonctionner !',
  'Le <span>cmd_vel</span> est le topic de commande : linear.x = avancer/reculer, angular.z = tourner.',
  'Le <span>cap (yaw)</span> est l\'angle de direction dans le plan horizontal, calculé depuis le gyroscope Z.',
  'Le <span>drift d\'odométrie</span> s\'accumule à chaque déplacement — c\'est pourquoi on fusionne avec le LiDAR (SLAM).',
];
let explIdx = 0;

function rotateExpl() {
  document.getElementById('explText').innerHTML = EXPLANATIONS[explIdx % EXPLANATIONS.length];
  explIdx++;
}

function updateLidarRange() {
  state.lidar.maxRange = parseFloat(document.getElementById('lidarRange').value);
  document.getElementById('lidarRangeVal').textContent = state.lidar.maxRange + 'm';
}

function setCamFilter(f) {
  state.camFilter = f;
  ['camNormal','camGray','camEdge','camDepth'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById('cam' + f.charAt(0).toUpperCase() + f.slice(1)).classList.add('active');
}

let notifT;
function showNotif(txt, type) {
  const el = document.getElementById('notif');
  el.textContent = txt; el.className = 'notif show ' + type;
  clearTimeout(notifT);
  notifT = setTimeout(() => el.className = 'notif', 2500);
}

function setExpl(txt) { document.getElementById('explText').textContent = txt; }
