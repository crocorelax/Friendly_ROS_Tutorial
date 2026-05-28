let ws = null;
let connected = false;
let simMode = false;

const state = {
  lidar: { ranges: [], angleMin: -Math.PI, angleIncrement: 0, maxRange: 6 },
  odom: { x: 0, y: 0, yaw: 0, vx: 0, vy: 0, vz: 0 },
  imu: { gx: 0, gy: 0, gz: 0, ax: 0, ay: 0, az: 9.81 },
  battery: 100,
  sys: { cpu: 0, temp: 45, wifi: -45, latency: 12 },
  camFilter: 'normal',
  camFrame: 0,
  odomHistory: [],
  totalDist: 0,
  uptimeStart: null,
  heading: 0,
};

let lidarCanvas, lidarCtx, camCanvas, camCtx, odomCanvas, odomCtx, gyroCanvas, gyroCtx, compassCanvas, compassCtx;
