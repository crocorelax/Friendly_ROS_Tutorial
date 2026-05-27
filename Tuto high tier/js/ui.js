// ══ TOPICS / NODES PANEL ══

let selectedTopic = null;

function renderTopics() {
  const el = document.getElementById('topicsList');
  el.innerHTML = '';
  TOPICS.forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'topic-item' + (selectedTopic === i ? ' active' : '');
    d.onclick = () => { selectedTopic = i; renderTopics(); };
    d.innerHTML = `<div class="ti-name">${t.name}<span class="ti-freq">${t.freq}</span></div>`
                + `<div class="ti-type">${t.type}</div>`
                + `<div class="ti-val" id="tval${i}">${t.getValue()}</div>`;
    el.appendChild(d);
  });
}

function renderNodes() {
  const el = document.getElementById('nodesList');
  el.innerHTML = '';
  NODES.forEach(n => {
    const d = document.createElement('div');
    d.className = 'node-item';
    const active = nodesLaunched || n.ok;
    d.innerHTML = `<div class="node-dot" style="background:${active ? 'var(--green)' : 'var(--red)'}"></div>`
                + `<div class="node-name">${n.name}</div>`
                + `<div class="node-cpu">${n.cpu}</div>`;
    el.appendChild(d);
  });
}

// ══ VIZ TOGGLES ══

function toggleViz(key) {
  const stateKey = { lidar: 'showLidar', odom: 'showOdom', map: 'showMap', robot: 'showRobot' };
  const btnId    = { lidar: 'btnLidar',  odom: 'btnOdom',  map: 'btnMap',  robot: 'btnRobot' };
  S[stateKey[key]] = !S[stateKey[key]];
  document.getElementById(btnId[key]).classList.toggle('active', S[stateKey[key]]);
}

function resetView() {
  S.x = 30; S.y = 100; S.a = 0; S.cmdVel = { linear: 0, angular: 0 };
  termLog('[view] Position reset', 'dim');
}

// ══ NOTIFICATIONS ══

let notifTimer;
function showNotif(txt, type = '') {
  const el = document.getElementById('notif');
  el.textContent = txt;
  el.className = 'notif show ' + type;
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => el.className = 'notif', 2500);
}

// ══ TOPIC VALUES REFRESH ══

function updateTopicVals() {
  TOPICS.forEach((t, i) => {
    const el = document.getElementById('tval' + i);
    if (el) el.textContent = t.getValue();
  });
}
