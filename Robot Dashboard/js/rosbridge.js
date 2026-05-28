function toggleConnect() {
  if (connected || simMode) disconnect();
  else connect();
}

function connect() {
  const url = 'ws://' + document.getElementById('wsUrl').value.trim();
  setConnStatus('connecting');
  setExpl('Tentative de connexion à ' + url + ' via rosbridge WebSocket...');

  try { ws = new WebSocket(url); }
  catch (e) { fallbackToSim(); return; }

  const timeout = setTimeout(() => {
    if (!connected) { ws.close(); fallbackToSim(); }
  }, 3000);

  ws.onopen = () => {
    clearTimeout(timeout);
    connected = true; simMode = false;
    setConnStatus('connected');
    showNotif('Connecté au robot !', 'green');
    setExpl('Connexion rosbridge établie — abonnement aux topics ROS...');
    subscribeTopics();
    state.uptimeStart = Date.now();
  };

  ws.onmessage = (e) => {
    try { handleRosMsg(JSON.parse(e.data)); } catch(err) {}
  };

  ws.onerror = () => { clearTimeout(timeout); fallbackToSim(); };
  ws.onclose = () => { if (connected) disconnect(); };
}

function disconnect() {
  if (ws) { ws.close(); ws = null; }
  connected = false; simMode = false;
  setConnStatus('disconnected');
  setExpl('Déconnecté du robot.');
  setBadgesOffline();
  showNotif('Déconnecté', 'red');
}

function fallbackToSim() {
  simMode = true; connected = false;
  setConnStatus('sim');
  showNotif('Robot non trouvé — mode simulation activé', 'yellow');
  setExpl('Mode simulation : données générées localement. Connectez un vrai robot via rosbridge.');
  state.uptimeStart = Date.now();
  setBadgesLive();
}

function setConnStatus(s) {
  const dot    = document.getElementById('connDot');
  const label  = document.getElementById('connLabel');
  const status = document.getElementById('connStatus');
  const info   = document.getElementById('connInfo');
  const btnC   = document.getElementById('btnConnect');
  const btnD   = document.getElementById('btnDisconnect');

  const cfg = {
    disconnected: { dotC:'var(--muted)',   dotAnim:'none',            labelC:'var(--muted)',  labelT:'Déconnecté',     statusC:'status-disconnected', statusT:'DÉCONNECTÉ',  infoT:'Entrez l\'IP du robot', btnC:true,  btnD:false },
    connecting:   { dotC:'var(--yellow)',  dotAnim:'pulse 1s infinite',labelC:'var(--yellow)', labelT:'Connexion…',    statusC:'status-connecting',   statusT:'CONNEXION…',  infoT:'Tentative…',            btnC:false, btnD:false },
    connected:    { dotC:'var(--green)',   dotAnim:'pulse 2s infinite',labelC:'var(--green)',  labelT:'Robot connecté', statusC:'status-connected',    statusT:'CONNECTÉ',    infoT:'rosbridge actif',       btnC:false, btnD:true  },
    sim:          { dotC:'var(--orange)',  dotAnim:'pulse 2s infinite',labelC:'var(--orange)', labelT:'Simulation',    statusC:'status-connecting',   statusT:'SIMULATION',  infoT:'Données simulées',      btnC:true,  btnD:false },
    error:        { dotC:'var(--red)',     dotAnim:'none',            labelC:'var(--red)',    labelT:'Erreur',         statusC:'status-error',        statusT:'ERREUR',      infoT:'Vérifiez IP/rosbridge', btnC:true,  btnD:false },
  };
  const c = cfg[s] || cfg.disconnected;
  dot.style.background  = c.dotC;
  dot.style.animation   = c.dotAnim;
  label.style.color     = c.labelC;
  label.textContent     = c.labelT;
  status.className      = 'conn-status ' + c.statusC;
  status.textContent    = c.statusT;
  info.textContent      = c.infoT;
  btnC.style.display    = c.btnC ? '' : 'none';
  btnD.style.display    = c.btnD ? '' : 'none';
}

function subscribeTopics() {
  [
    { topic: '/scan',          type: 'sensor_msgs/LaserScan'          },
    { topic: '/odom',          type: 'nav_msgs/Odometry'              },
    { topic: '/imu/data',      type: 'sensor_msgs/Imu'                },
    { topic: '/battery_state', type: 'sensor_msgs/BatteryState'       },
    { topic: '/diagnostics_agg', type: 'diagnostic_msgs/DiagnosticArray' },
  ].forEach(t => ws.send(JSON.stringify({ op: 'subscribe', topic: t.topic, type: t.type })));
}

function handleRosMsg(msg) {
  if (!msg.topic) return;
  if      (msg.topic === '/scan')          updateLidar(msg.msg);
  else if (msg.topic === '/odom')          updateOdom(msg.msg);
  else if (msg.topic === '/imu/data')      updateImu(msg.msg);
  else if (msg.topic === '/battery_state') state.battery = msg.msg.percentage * 100;
}

function updateLidar(msg) {
  state.lidar.ranges         = msg.ranges;
  state.lidar.angleMin       = msg.angle_min;
  state.lidar.angleIncrement = msg.angle_increment;
}

function updateOdom(msg) {
  const p = msg.pose.pose.position;
  const q = msg.pose.pose.orientation;
  const prevX = state.odom.x, prevY = state.odom.y;
  state.odom.x = p.x; state.odom.y = p.y;
  const yaw = Math.atan2(2*(q.w*q.z + q.x*q.y), 1 - 2*(q.y*q.y + q.z*q.z));
  state.odom.yaw = yaw * 180 / Math.PI;
  state.heading  = state.odom.yaw;
  state.odom.vx  = msg.twist.twist.linear.x;
  state.odom.vz  = msg.twist.twist.angular.z;
  state.totalDist += Math.hypot(p.x - prevX, p.y - prevY);
  state.odomHistory.push({ x: p.x, y: p.y });
  if (state.odomHistory.length > 500) state.odomHistory.shift();
}

function updateImu(msg) {
  const av = msg.angular_velocity;
  const la = msg.linear_acceleration;
  state.imu.gx = av.x * 180 / Math.PI;
  state.imu.gy = av.y * 180 / Math.PI;
  state.imu.gz = av.z * 180 / Math.PI;
  state.imu.ax = la.x; state.imu.ay = la.y; state.imu.az = la.z;
}
