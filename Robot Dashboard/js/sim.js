let simT = 0;

// ── Arène : 5 m × 3.6 m, centrée en (0,0) ─────────────────
const ARENA = { w: 5, h: 3.6, hw: 2.5, hh: 1.8 };

// Obstacles intérieurs (mur + piliers)
const SIM_WALLS = [
  { x:  0.0, y: -0.2, w: 1.0, h: 0.2 },  // mur central bas
  { x: -1.3, y:  0.6, w: 0.2, h: 0.9 },  // pilier gauche
  { x:  1.3, y:  0.6, w: 0.2, h: 0.9 },  // pilier droit
];

// Trajectoire rectangulaire du robot (sens horaire)
const WAYPOINTS = [
  { x: -1.8, y: -1.2 },
  { x:  1.8, y: -1.2 },
  { x:  1.8,  y: 1.2 },
  { x: -1.8,  y: 1.2 },
];
let _wpIdx  = 0;
let _robotH = 0;          // cap courant en radians (interpolé)

const SIM_SPEED   = 0.45; // m/s en ligne droite
const SIM_TURNMAX = 2.2;  // rad/s max

function simStep(dt) {
  simT += dt;

  // ── Guidage vers le waypoint courant ───────────────────
  const wp   = WAYPOINTS[_wpIdx];
  const dx   = wp.x - state.odom.x;
  const dy   = wp.y - state.odom.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.15) _wpIdx = (_wpIdx + 1) % WAYPOINTS.length;

  // Interpolation douce du cap
  const targetH = Math.atan2(dy, dx);
  let dH = targetH - _robotH;
  while (dH >  Math.PI) dH -= 2 * Math.PI;
  while (dH < -Math.PI) dH += 2 * Math.PI;
  _robotH += Math.sign(dH) * Math.min(Math.abs(dH), SIM_TURNMAX * dt);

  // Avance (ralentit en approche)
  const speed = SIM_SPEED * Math.min(1, dist / 0.35);
  state.odom.x += Math.cos(_robotH) * speed * dt;
  state.odom.y += Math.sin(_robotH) * speed * dt;

  state.heading  = ((_robotH * 180 / Math.PI) % 360 + 360) % 360;
  state.odom.yaw = state.heading;
  state.odom.vx  = speed;
  state.odom.vz  = dH;

  state.odomHistory.push({ x: state.odom.x, y: state.odom.y });
  if (state.odomHistory.length > 600) state.odomHistory.shift();
  state.totalDist += speed * dt;

  // ── IMU — bruit réaliste calé sur le mouvement ─────────
  const angVel = Math.abs(dH) > 0.01 ? dH / Math.max(dt, 0.016) : 0;
  state.imu.gz = angVel + (Math.random() - .5) * 0.08;
  state.imu.gx = (Math.random() - .5) * 0.25;
  state.imu.gy = (Math.random() - .5) * 0.18;
  state.imu.ax = Math.cos(_robotH) * speed * 1.5 + (Math.random() - .5) * .04;
  state.imu.ay = Math.sin(_robotH) * speed * 1.5 + (Math.random() - .5) * .04;
  state.imu.az = 9.81 + (Math.random() - .5) * .08;

  // ── LiDAR — lancers de rayon contre l'arène rectangulaire
  const nRays = 360;
  state.lidar.ranges         = [];
  state.lidar.angleMin       = -Math.PI;
  state.lidar.angleIncrement = (2 * Math.PI) / nRays;
  for (let i = 0; i < nRays; i++) {
    const angle = -Math.PI + i * (2 * Math.PI) / nRays + _robotH;
    let minD = state.lidar.maxRange;
    minD = Math.min(minD, simCastArena(state.odom.x, state.odom.y, angle, ARENA.hw, ARENA.hh));
    SIM_WALLS.forEach(w => {
      const d = simCastRect(state.odom.x, state.odom.y, angle, w);
      if (d < minD) minD = d;
    });
    state.lidar.ranges.push(Math.max(0.05, minD + (Math.random() - .5) * .025));
  }

  state.battery     = Math.max(0, 87 - simT * .02);
  state.sys.cpu     = 25 + Math.sin(simT * .3) * 10 + Math.random() * 5;
  state.sys.temp    = 48 + Math.sin(simT * .1) * 5;
  state.sys.wifi    = -42 - Math.round(Math.random() * 8);
  state.sys.latency = 8  + Math.round(Math.random() * 6);
}

// ── Géométrie ────────────────────────────────────────────────

/** Intersection rayon / segment [P0→P1]. Renvoie t ou Infinity. */
function simCastSegment(ox, oy, angle, x0, y0, x1, y1) {
  const rdx = Math.cos(angle), rdy = Math.sin(angle);
  const sdx = x1 - x0,        sdy = y1 - y0;
  const denom = rdx * sdy - rdy * sdx;
  if (Math.abs(denom) < 1e-10) return Infinity;
  const t = ((x0 - ox) * sdy - (y0 - oy) * sdx) / denom;
  const u = ((x0 - ox) * rdy - (y0 - oy) * rdx) / denom;
  return (t > 0.02 && u >= 0 && u <= 1) ? t : Infinity;
}

/** Intersection contre les 4 murs de l'arène rectangulaire. */
function simCastArena(ox, oy, angle, hw, hh) {
  return Math.min(
    simCastSegment(ox, oy, angle, -hw, -hh,  hw, -hh),  // bas
    simCastSegment(ox, oy, angle,  hw, -hh,  hw,  hh),  // droite
    simCastSegment(ox, oy, angle,  hw,  hh, -hw,  hh),  // haut
    simCastSegment(ox, oy, angle, -hw,  hh, -hw, -hh),  // gauche
  );
}

/** Intersection contre les 4 faces d'un obstacle rect { x, y, w, h }. */
function simCastRect(ox, oy, angle, wall) {
  const hw = wall.w / 2, hh = wall.h / 2;
  const wx = wall.x,     wy = wall.y;
  return Math.min(
    simCastSegment(ox, oy, angle, wx - hw, wy - hh, wx + hw, wy - hh),
    simCastSegment(ox, oy, angle, wx + hw, wy - hh, wx + hw, wy + hh),
    simCastSegment(ox, oy, angle, wx + hw, wy + hh, wx - hw, wy + hh),
    simCastSegment(ox, oy, angle, wx - hw, wy + hh, wx - hw, wy - hh),
  );
}
