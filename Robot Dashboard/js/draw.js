let camT = 0;
let gyroRoll = 0, gyroPitch = 0;

function initCanvases() {
  lidarCanvas   = document.getElementById('lidarCanvas');
  lidarCtx      = lidarCanvas.getContext('2d');
  camCanvas     = document.getElementById('cameraCanvas');
  camCtx        = camCanvas.getContext('2d');
  odomCanvas    = document.getElementById('odomTrailCanvas');
  odomCtx       = odomCanvas.getContext('2d');
  gyroCanvas    = document.getElementById('gyroCanvas');
  gyroCtx       = gyroCanvas.getContext('2d');
  compassCanvas = document.getElementById('compassCanvas');
  compassCtx    = compassCanvas.getContext('2d');

  resizeLidar(); resizeCam(); resizeOdom();
  window.addEventListener('resize', () => { resizeLidar(); resizeCam(); resizeOdom(); });
}

function resizeLidar() {
  const p = lidarCanvas.parentElement;
  lidarCanvas.width  = p.clientWidth;
  lidarCanvas.height = p.clientHeight - p.querySelector('.lidar-controls').offsetHeight - p.querySelector('.panel-head').offsetHeight;
}

function resizeCam() {
  const p = camCanvas.parentElement;
  camCanvas.width  = p.clientWidth;
  camCanvas.height = p.clientHeight - p.querySelector('.cam-controls').offsetHeight - p.querySelector('.panel-head').offsetHeight;
}

function resizeOdom() {
  const p    = odomCanvas.parentElement;
  const expl = p.querySelector('.odom-expl');
  odomCanvas.width  = p.clientWidth;
  odomCanvas.height = p.clientHeight - (expl ? expl.offsetHeight : 50) - p.querySelector('.panel-head').offsetHeight;
}

// ── LiDAR ─────────────────────────────────────────────────
function drawLidar() {
  const c = lidarCtx, W = lidarCanvas.width, H = lidarCanvas.height;
  if (!W || !H) return;
  c.fillStyle = '#060810'; c.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const maxR  = state.lidar.maxRange;
  const scale = Math.min(W, H) / 2 / maxR * .88;

  // Range rings
  for (let r = 1; r <= 6; r++) {
    if (r > maxR) break;
    c.beginPath(); c.arc(cx, cy, r * scale, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(30,37,53,.8)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = 'rgba(74,85,104,.4)'; c.font = '8px JetBrains Mono,monospace';
    c.textAlign = 'center'; c.fillText(r + 'm', cx + r * scale + 4, cy - 3);
  }
  c.strokeStyle = 'rgba(56,189,248,.12)'; c.lineWidth = .5;
  c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, H); c.stroke();
  c.beginPath(); c.moveTo(0, cy); c.lineTo(W, cy); c.stroke();

  const ranges = state.lidar.ranges;
  if (ranges.length > 0) {
    const angleInc = (2 * Math.PI) / ranges.length;

    // Filled scan polygon
    c.beginPath();
    ranges.forEach((r, i) => {
      const d = Math.min(r, maxR) * scale;
      const a = state.lidar.angleMin + i * angleInc - Math.PI / 2;
      i === 0 ? c.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d)
              : c.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
    });
    c.closePath();
    c.fillStyle = 'rgba(0,214,143,.06)'; c.fill();
    c.strokeStyle = 'rgba(0,214,143,.3)'; c.lineWidth = .8; c.stroke();

    // Hit dots
    ranges.forEach((r, i) => {
      if (r >= maxR * .98) return;
      const d = Math.min(r, maxR) * scale;
      const a = state.lidar.angleMin + i * angleInc - Math.PI / 2;
      const intensity = 1 - r / maxR;
      c.fillStyle = `rgba(0,214,143,${.4 + intensity * .5})`;
      c.beginPath(); c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.5, 0, Math.PI * 2); c.fill();
    });

    const valid = ranges.filter(r => r < maxR * .98);
    document.getElementById('lidarPoints').textContent = valid.length;
    document.getElementById('lidarMin').textContent    = (valid.length ? Math.min(...valid).toFixed(2) : '—') + 'm';
  }

  // Robot dot + heading arrow
  c.fillStyle = '#3b82f6'; c.strokeStyle = '#93c5fd'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(cx, cy, 7, 0, Math.PI * 2); c.fill(); c.stroke();
  const hr = (state.heading - 90) * Math.PI / 180;
  c.strokeStyle = '#93c5fd'; c.lineWidth = 2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(hr) * 18, cy + Math.sin(hr) * 18); c.stroke();

  c.fillStyle = 'rgba(74,85,104,.7)'; c.font = '8px JetBrains Mono,monospace'; c.textAlign = 'left';
  c.fillText(`${ranges.length} pts | max ${maxR}m | topic: /scan`, 8, H - 6);
}

// ── Camera ────────────────────────────────────────────────
function drawCamera(dt) {
  const c = camCtx, W = camCanvas.width, H = camCanvas.height;
  if (!W || !H) return;
  camT += dt;

  if (!simMode && !connected) {
    c.fillStyle = '#060810'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(74,85,104,.6)'; c.font = '12px JetBrains Mono,monospace'; c.textAlign = 'center';
    c.fillText('Caméra hors ligne', W / 2, H / 2 - 10);
    c.font = '10px JetBrains Mono,monospace'; c.fillText('/camera/image_raw', W / 2, H / 2 + 10);
    return;
  }

  if (connected && ws) {
    c.fillStyle = '#060810'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(56,189,248,.5)'; c.font = '11px JetBrains Mono,monospace'; c.textAlign = 'center';
    c.fillText('Flux caméra — connecter web_video_server', W / 2, H / 2);
    c.font = '9px JetBrains Mono,monospace'; c.fillStyle = 'rgba(74,85,104,.6)';
    c.fillText('http://' + document.getElementById('wsUrl').value.split(':')[0] + ':8080/stream?topic=/camera/image_raw', W / 2, H / 2 + 18);
    return;
  }

  // Simulation : vue top-down de l'arène
  const filter = state.camFilter;
  c.fillStyle = '#1a1208'; c.fillRect(0, 0, W, H);
  const s = Math.min(W, H) / 6;
  const ox = W / 2 - state.odom.x * s * 2, oy = H / 2 - state.odom.y * s * 2;

  c.fillStyle = '#2d2010'; c.fillRect(ox - 15 * s, oy - 10 * s, 30 * s, 20 * s);
  if (filter !== 'depth') {
    c.strokeStyle = 'rgba(80,60,20,.3)'; c.lineWidth = .5;
    for (let i = -15; i < 15; i++) { c.beginPath(); c.moveTo(ox + i * s, oy - 10 * s); c.lineTo(ox + i * s, oy + 10 * s); c.stroke(); }
    for (let j = -10; j < 10; j++) { c.beginPath(); c.moveTo(ox - 15 * s, oy + j * s); c.lineTo(ox + 15 * s, oy + j * s); c.stroke(); }
  }
  [[-2, -1], [1.5, 0.5], [-1, 1.5], [2.5, -1.5], [0.5, 2]].forEach(([kx, ky], i) => {
    const px = ox + kx * s, py = oy + ky * s;
    c.fillStyle = filter === 'gray' ? '#888' : filter === 'depth' ? `hsl(${200 + i * 20},80%,${50 + i * 5}%)` : (i % 2 === 0 ? '#8B5CF6' : '#F59E0B');
    c.fillRect(px - s * .3, py - s * .08, s * .6, s * .16);
    c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1; c.strokeRect(px - s * .3, py - s * .08, s * .6, s * .16);
  });
  [[3, 1], [-2.5, 2], [2, -2]].forEach(([gx, gy]) => {
    const px = ox + gx * s, py = oy + gy * s;
    c.fillStyle = filter === 'gray' ? '#aaa' : filter === 'depth' ? '#22d3ee' : '#22c55e';
    c.beginPath(); c.arc(px, py, s * .4, 0, Math.PI * 2); c.fill();
    if (filter !== 'depth') { c.fillStyle = '#16a34a'; c.font = `${s * .5}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🌱', px, py); }
  });
  c.save(); c.translate(W / 2, H / 2); c.rotate(state.heading * Math.PI / 180);
  const rb = s * .8;
  c.fillStyle = filter === 'depth' ? '#60a5fa' : '#1e3a8a';
  c.strokeStyle = filter === 'depth' ? '#bfdbfe' : '#3b82f6'; c.lineWidth = 2;
  c.beginPath(); c.roundRect(-rb, -rb, rb * 2, rb * 2, rb * .3); c.fill(); c.stroke();
  c.fillStyle = filter === 'depth' ? '#fff' : 'rgba(0,214,143,.9)';
  c.beginPath(); c.arc(0, -rb * .2, rb * .4, 0, Math.PI * 2); c.fill();
  c.restore();
  if (filter === 'edge') {
    c.strokeStyle = 'rgba(0,214,143,.6)'; c.lineWidth = 1.5; c.setLineDash([3, 3]);
    c.strokeRect(ox - 15 * s, oy - 10 * s, 30 * s, 20 * s);
    c.setLineDash([]);
  }
  c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(0, 0, W, 18);
  c.fillStyle = 'rgba(0,214,143,.8)'; c.font = '9px JetBrains Mono,monospace'; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText(`SIM | ${filter.toUpperCase()} | ${new Date().toTimeString().slice(0,8)} | cap: ${state.heading.toFixed(0)}°`, 6, 9);
  for (let y = 0; y < H; y += 4) { c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(0, y, W, 2); }
  state.camFrame++;
  document.getElementById('camFps').textContent     = '~30 fps';
  document.getElementById('camLatency').textContent = `${state.sys.latency}ms`;
}

// ── Odom trail ────────────────────────────────────────────
function drawOdom() {
  const c = odomCtx, W = odomCanvas.width, H = odomCanvas.height;
  if (!W || !H) return;
  c.fillStyle = '#060810'; c.fillRect(0, 0, W, H);

  c.strokeStyle = 'rgba(30,37,53,.8)'; c.lineWidth = .5;
  const gs = 30;
  for (let x = W / 2 % gs; x < W; x += gs) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = H / 2 % gs; y < H; y += gs) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

  const hist = state.odomHistory;
  if (hist.length < 2) {
    c.fillStyle = 'rgba(74,85,104,.5)'; c.font = '10px JetBrains Mono,monospace'; c.textAlign = 'center';
    c.fillText('En attente de données...', W / 2, H / 2);
    return;
  }

  const xs = hist.map(p => p.x), ys = hist.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = (maxX - minX) * .2 + .5, padY = (maxY - minY) * .2 + .5;
  const scale = Math.min(W / (maxX - minX + padX * 2), H / (maxY - minY + padY * 2), 80);
  const offX  = W / 2 - (minX + maxX) / 2 * scale;
  const offY  = H / 2 - (minY + maxY) / 2 * scale;
  const toC   = p => ({ cx: offX + p.x * scale, cy: offY + p.y * scale });

  c.save();
  for (let i = 1; i < hist.length; i++) {
    const a = toC(hist[i - 1]), b = toC(hist[i]);
    const t = i / hist.length;
    c.strokeStyle = `rgba(167,139,250,${.2 + t * .7})`;
    c.lineWidth = 1 + t;
    c.beginPath(); c.moveTo(a.cx, a.cy); c.lineTo(b.cx, b.cy); c.stroke();
  }
  c.restore();

  const start = toC(hist[0]);
  c.fillStyle = 'rgba(56,189,248,.6)'; c.beginPath(); c.arc(start.cx, start.cy, 4, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(56,189,248,.5)'; c.font = '8px JetBrains Mono,monospace'; c.textAlign = 'left';
  c.fillText('START', start.cx + 6, start.cy);

  const cur = toC(hist[hist.length - 1]);
  c.save(); c.translate(cur.cx, cur.cy); c.rotate(state.heading * Math.PI / 180);
  c.fillStyle = '#3b82f6'; c.strokeStyle = '#93c5fd'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill(); c.stroke();
  c.strokeStyle = '#93c5fd'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -12); c.stroke();
  c.restore();

  c.fillStyle = 'rgba(74,85,104,.7)'; c.font = '8px JetBrains Mono,monospace'; c.textAlign = 'left';
  c.fillText(`x:${state.odom.x.toFixed(2)}m  y:${state.odom.y.toFixed(2)}m  cap:${state.heading.toFixed(0)}°`, 6, H - 6);
}

// ── Gyro 3D cube ──────────────────────────────────────────
function drawGyro() {
  const c = gyroCtx, S = 110, cx = S / 2, cy = S / 2, sz = 32;
  c.clearRect(0, 0, S, S);
  c.fillStyle = '#060810'; c.fillRect(0, 0, S, S);

  const roll  = gyroRoll  * Math.PI / 180;
  const pitch = gyroPitch * Math.PI / 180;
  const yaw   = state.heading * Math.PI / 180;

  const verts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  const rotY  = v => [v[0]*Math.cos(yaw)+v[2]*Math.sin(yaw), v[1], -v[0]*Math.sin(yaw)+v[2]*Math.cos(yaw)];
  const rotX  = v => [v[0], v[1]*Math.cos(pitch)-v[2]*Math.sin(pitch), v[1]*Math.sin(pitch)+v[2]*Math.cos(pitch)];
  const rotZ  = v => [v[0]*Math.cos(roll)-v[1]*Math.sin(roll), v[0]*Math.sin(roll)+v[1]*Math.cos(roll), v[2]];

  const proj = verts.map(v => {
    const r = rotZ(rotX(rotY(v)));
    const z = r[2] + 3;
    return { x: cx + r[0] * sz / z * 2.5, y: cy + r[1] * sz / z * 2.5, z: r[2] };
  });

  const faces = [
    [0,1,2,3,'rgba(59,130,246,.6)'],[4,5,6,7,'rgba(56,189,248,.4)'],
    [0,1,5,4,'rgba(167,139,250,.5)'],[2,3,7,6,'rgba(139,92,246,.4)'],
    [0,3,7,4,'rgba(34,197,94,.4)'],[1,2,6,5,'rgba(239,68,68,.4)'],
  ];
  faces
    .map(([a,b,d,e,col]) => ({ idxs:[a,b,d,e], col, z:(proj[a].z+proj[b].z+proj[d].z+proj[e].z)/4 }))
    .sort((a, b) => a.z - b.z)
    .forEach(({ idxs, col }) => {
      c.beginPath();
      idxs.forEach((i, k) => k === 0 ? c.moveTo(proj[i].x, proj[i].y) : c.lineTo(proj[i].x, proj[i].y));
      c.closePath(); c.fillStyle = col; c.fill();
      c.strokeStyle = 'rgba(255,255,255,.15)'; c.lineWidth = .8; c.stroke();
    });

  c.font = '8px JetBrains Mono,monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#ef4444'; c.fillText('X', proj[1].x + 8, proj[1].y);
  c.fillStyle = '#22c55e'; c.fillText('Y', proj[3].x - 8, proj[3].y);
  c.fillStyle = '#38bdf8'; c.fillText('Z', proj[4].x, proj[4].y - 8);

  gyroRoll  += state.imu.gx * .016;
  gyroPitch += state.imu.gy * .016;
}

// ── Compass ───────────────────────────────────────────────
function drawCompass() {
  const c = compassCtx, S = 70, cx = 35, cy = 35, r = 28;
  c.clearRect(0, 0, S, S);
  c.fillStyle = '#060810'; c.fillRect(0, 0, S, S);

  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2);
  c.strokeStyle = 'rgba(74,85,104,.5)'; c.lineWidth = 1; c.stroke();

  for (let i = 0; i < 36; i++) {
    const a   = i / 36 * Math.PI * 2;
    const len = i % 9 === 0 ? 5 : 2;
    c.strokeStyle = i % 9 === 0 ? 'rgba(255,255,255,.3)' : 'rgba(74,85,104,.4)';
    c.lineWidth   = i % 9 === 0 ? 1.5 : .5;
    c.beginPath();
    c.moveTo(cx + Math.sin(a) * (r - len), cy - Math.cos(a) * (r - len));
    c.lineTo(cx + Math.sin(a) * r,         cy - Math.cos(a) * r);
    c.stroke();
  }
  [['N', 0, '#ef4444'], ['E', 90, 'rgba(255,255,255,.5)'], ['S', 180, 'rgba(255,255,255,.5)'], ['W', 270, 'rgba(255,255,255,.5)']].forEach(([l, deg, col]) => {
    const a = deg * Math.PI / 180;
    c.fillStyle = col; c.font = 'bold 7px JetBrains Mono,monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(l, cx + Math.sin(a) * (r - 8), cy - Math.cos(a) * (r - 8));
  });

  const a = state.heading * Math.PI / 180;
  c.save(); c.translate(cx, cy); c.rotate(a);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-3, 3); c.lineTo(0, -r + 6); c.lineTo(3, 3); c.closePath();
  c.fillStyle = '#ef4444'; c.fill();
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-3, -3); c.lineTo(0, r - 6); c.lineTo(3, -3); c.closePath();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.fill();
  c.restore();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 3, 0, Math.PI * 2); c.fill();
}
