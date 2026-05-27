// ══ DIMENSIONS ══
const ARENA_W = 300, ARENA_H = 200;

// ══ ROBOT + SIM STATE ══
const S = {
  // Robot pose (arena coords)
  x: 30, y: 100, a: 0,
  vx: 0, vy: 0, va: 0,
  // Control
  cmdVel: { linear: 0, angular: 0 },
  estop: true,
  // Sensors
  lidarNoise: 0.08,
  odomDrift: 0,
  batteryDrain: true,
  battery: 87,
  // Diagnostics
  faults: [],
  // Viz toggles
  showLidar: true, showOdom: true, showMap: true, showRobot: true,
  // Match
  matchRunning: false, matchTime: 100, score: 0,
  // History
  odomHistory: [],
  lidarHistory: [],
  // Navigation autonome
  navTarget: null,    // { x, y, label, onArrival }
  navMode: 'idle',    // 'idle' | 'navigating' | 'auto' | 'script'
  // Téléop clavier
  teleop: false,
};

// ══ ARENA LAYOUT ══
const WALLS = [
  { x: 60,  y: 20,  w: 40, h: 15, label: 'Bac A' },
  { x: 130, y: 20,  w: 40, h: 15, label: 'Bac B' },
  { x: 200, y: 20,  w: 40, h: 15, label: 'Bac C' },
  { x: 60,  y: 165, w: 40, h: 15, label: 'Bac D' },
  { x: 130, y: 165, w: 40, h: 15, label: 'Bac E' },
  { x: 200, y: 165, w: 40, h: 15, label: 'Bac F' },
  { x: 140, y: 80,  w: 20, h: 40, label: 'Mur central' },
];

const GOALS = [
  { x: 80,  y: 60,  r: 12, pts: 10, label: 'Plante 1',     done: false, color: '#22c55e' },
  { x: 220, y: 60,  r: 12, pts: 10, label: 'Plante 2',     done: false, color: '#22c55e' },
  { x: 80,  y: 140, r: 12, pts: 10, label: 'Plante 3',     done: false, color: '#22c55e' },
  { x: 220, y: 140, r: 12, pts: 10, label: 'Plante 4',     done: false, color: '#22c55e' },
  { x: 270, y: 100, r: 14, pts: 25, label: 'Garde-manger', done: false, color: '#f97316' },
];

// ══ MISSION ══
const MISSION_TASKS = [
  { id: 'launch',      label: 'Lancer les nodes',         cmd: 'ros2 launch bipboup robot.launch.py',             done: false, pts: 5  },
  { id: 'estop',       label: "Désactiver l'arrêt urgence", cmd: 'ros2 service call /estop std_srvs/srv/SetBool', done: false, pts: 5  },
  { id: 'move',        label: 'Publier un cmd_vel',        cmd: 'ros2 topic pub /cmd_vel geometry_msgs/msg/Twist', done: false, pts: 10 },
  { id: 'goal1',       label: 'Atteindre une plante',      cmd: '(automatique)',                                  done: false, pts: 10 },
  { id: 'goal2',       label: '3 plantes collectées',      cmd: '(automatique)',                                  done: false, pts: 15 },
  { id: 'gardemanger', label: 'Atteindre le garde-manger', cmd: '(automatique)',                                  done: false, pts: 25 },
];

// ══ ROS TOPICS ══
const TOPICS = [
  { name: '/scan',         type: 'sensor_msgs/LaserScan',    freq: '10Hz',   getValue: () => `ranges[360]: [${(0.3 + Math.random() * .5).toFixed(2)}...] noise:±${S.lidarNoise.toFixed(2)}` },
  { name: '/cmd_vel',      type: 'geometry_msgs/Twist',      freq: '20Hz',   getValue: () => `lin.x:${S.cmdVel.linear.toFixed(2)} ang.z:${S.cmdVel.angular.toFixed(2)}` },
  { name: '/odom',         type: 'nav_msgs/Odometry',        freq: '50Hz',   getValue: () => `x:${S.x.toFixed(1)} y:${S.y.toFixed(1)} θ:${S.a.toFixed(1)}° drift:${S.odomDrift.toFixed(2)}` },
  { name: '/battery_state',type: 'sensor_msgs/BatteryState', freq: '1Hz',    getValue: () => `${S.battery.toFixed(1)}% ${S.battery < 20 ? '⚠ CRITIQUE' : 'OK'}` },
  { name: '/tf',           type: 'tf2_msgs/TFMessage',       freq: '100Hz',  getValue: () => `map→odom→base_link drift:${(S.odomDrift * .1).toFixed(3)}m` },
  { name: '/map',          type: 'nav_msgs/OccupancyGrid',   freq: '0.5Hz',  getValue: () => `300×200 res:0.01m/px` },
  { name: '/diagnostics',  type: 'diagnostic_msgs/Array',    freq: '1Hz',    getValue: () => S.faults.length ? `⚠ ${S.faults.join(', ')}` : 'OK — all systems nominal' },
  { name: '/estop',        type: 'std_msgs/Bool',            freq: '10Hz',   getValue: () => S.estop ? 'TRUE — ARRÊT URGENCE' : 'false' },
];

// ══ ROS NODES ══
const NODES = [
  { name: 'robot_state_publisher', cpu: '2%',  ok: true  },
  { name: 'lidar_driver',          cpu: '8%',  ok: true  },
  { name: 'nav2_bringup',          cpu: '15%', ok: false },
  { name: 'bipboup_strategy',      cpu: '5%',  ok: false },
  { name: 'rosbridge_server',      cpu: '3%',  ok: true  },
];

let nodesLaunched = false;
