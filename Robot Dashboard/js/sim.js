let simT = 0;
const SIM_WALLS = [
  { x:  0.5, y:  0.5, w: 1.5, h: 0.2 },
  { x: -1.0, y: -0.5, w: 0.2, h: 1.5 },
  { x:  1.2, y: -0.8, w: 1.0, h: 0.2 },
];

function simStep(dt) {
  simT += dt;
  const r = 1.2;

  state.odom.x = r * Math.sin(simT * .4);
  state.odom.y = r * .5 * Math.sin(simT * .8);
  state.heading = (Math.atan2(
    r * .8 * Math.cos(simT * .8) * Math.cos(simT * .4) - r * .4 * Math.sin(simT * .4) * Math.sin(simT * .8),
    r * .4 * Math.cos(simT * .4)
  ) * 180 / Math.PI + 360) % 360;
  state.odom.yaw = state.heading;
  state.odom.vx  = 0.3 + Math.sin(simT) * .1;
  state.odom.vz  = Math.cos(simT * .4) * .5;

  state.odomHistory.push({ x: state.odom.x, y: state.odom.y });
  if (state.odomHistory.length > 300) state.odomHistory.shift();
  state.totalDist += Math.abs(state.odom.vx) * dt;

  state.imu.gz = state.odom.vz * 57.3 + (Math.random() - .5) * 2;
  state.imu.gx = (Math.random() - .5) * 1.5;
  state.imu.gy = (Math.random() - .5) * 1;
  state.imu.ax = Math.sin(simT * .3) * .3 + (Math.random() - .5) * .05;
  state.imu.ay = Math.cos(simT * .5) * .2 + (Math.random() - .5) * .05;
  state.imu.az = 9.81 + (Math.random() - .5) * .1;

  const nRays = 360;
  state.lidar.ranges         = [];
  state.lidar.angleMin       = -Math.PI;
  state.lidar.angleIncrement = (2 * Math.PI) / nRays;
  for (let i = 0; i < nRays; i++) {
    const angle = -Math.PI + i * (2 * Math.PI) / nRays + state.heading * Math.PI / 180;
    let minD = state.lidar.maxRange;
    minD = Math.min(minD, simCastBorder(state.odom.x, state.odom.y, angle, 3));
    SIM_WALLS.forEach(w => {
      const d = simCastRect(state.odom.x, state.odom.y, angle, w);
      if (d > 0) minD = Math.min(minD, d);
    });
    state.lidar.ranges.push(minD + (Math.random() - .5) * .04);
  }

  state.battery    = Math.max(0, 87 - simT * .02);
  state.sys.cpu    = 25 + Math.sin(simT * .3) * 10 + Math.random() * 5;
  state.sys.temp   = 48 + Math.sin(simT * .1) * 5;
  state.sys.wifi   = -42 - Math.round(Math.random() * 8);
  state.sys.latency = 8 + Math.round(Math.random() * 6);
}

function simCastBorder(ox, oy, angle, size) {
  return size - Math.abs(ox * Math.cos(angle) + oy * Math.sin(angle)) + Math.random() * .1;
}

function simCastRect(ox, oy, angle, wall) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const t = (wall.x - ox) * dx + (wall.y - oy) * dy;
  if (t <= 0) return -1;
  const px = ox + dx * t - wall.x, py = oy + dy * t - wall.y;
  return (Math.abs(px) < wall.w / 2 && Math.abs(py) < wall.h / 2) ? t : -1;
}
