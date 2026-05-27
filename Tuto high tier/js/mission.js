// ══ MISSION SYSTEM ══

function completeMission(id) {
  const task = MISSION_TASKS.find(m => m.id === id);
  if (task && !task.done) {
    task.done = true;
    S.score += task.pts;
    updateMissionUI();
    showNotif(`Mission: ${task.label} ✓ (+${task.pts}pts)`, 'green');
  }
}

function checkMissionGoals() {
  const doneCount = GOALS.filter(g => g.done).length;
  if (doneCount >= 1) completeMission('goal1');
  if (doneCount >= 3) completeMission('goal2');
  if (GOALS.find(g => g.label.includes('Garde') && g.done)) completeMission('gardemanger');
}

function updateMissionUI() {
  const el = document.getElementById('missionTasks');
  el.innerHTML = '';
  MISSION_TASKS.forEach(t => {
    const d = document.createElement('div');
    d.className = 'mp-task' + (t.done ? ' done' : ' active');
    d.innerHTML = `<span class="mp-check">${t.done ? '✓' : '○'}</span><span>${t.label}</span>`;
    el.appendChild(d);
  });
  document.getElementById('mpScore').textContent = S.score;
}
