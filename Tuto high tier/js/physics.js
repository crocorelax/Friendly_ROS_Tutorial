// ══ PHYSICS STEP ══

function physicsStep(dt) {
  // Navigation autonome — surcharge cmdVel avant calcul physique
  if (S.navMode !== 'idle') navStep(dt);

  if (S.estop) { S.cmdVel.linear = 0; S.cmdVel.angular = 0; }

  const speed = S.cmdVel.linear * 60;
  const omega = S.cmdVel.angular * 60;
  const rad = S.a * Math.PI / 180;
  const nx = S.x + Math.cos(rad) * speed * dt;
  const ny = S.y + Math.sin(rad) * speed * dt;

  // Collision detection
  let blocked = nx < 5 || nx > ARENA_W - 5 || ny < 5 || ny > ARENA_H - 5;
  if (!blocked) {
    for (const w of WALLS) {
      if (nx > w.x - 8 && nx < w.x + w.w + 8 && ny > w.y - 8 && ny < w.y + w.h + 8) {
        blocked = true; break;
      }
    }
  }
  if (!blocked) {
    S.x = Math.max(5, Math.min(ARENA_W - 5, nx));
    S.y = Math.max(5, Math.min(ARENA_H - 5, ny));
  }
  S.a += omega * dt;

  // Odometry drift accumulation
  S.odomDrift += (Math.random() - .5) * .01;
  S.odomHistory.push({ x: S.x, y: S.y, drift: S.odomDrift * 10 });
  if (S.odomHistory.length > 80) S.odomHistory.shift();

  // Goal proximity check
  GOALS.forEach(g => {
    if (!g.done && Math.hypot(S.x - g.x, S.y - g.y) < g.r + 8) {
      g.done = true;
      S.score += g.pts;
      termLog(`✓ Objectif atteint: ${g.label} (+${g.pts} pts)`, 'info');
      showNotif(`+${g.pts} pts — ${g.label}`, 'green');
      checkMissionGoals();
      if (S.matchRunning) document.getElementById('mpScore').textContent = S.score;
    }
  });

  // Battery drain
  if (S.batteryDrain && nodesLaunched) {
    S.battery = Math.max(0, S.battery - dt * .05);
    if (S.battery < 20 && !S.faults.includes('LOW_BATTERY')) S.faults.push('LOW_BATTERY');
  }

  // Match timer
  if (S.matchRunning) {
    S.matchTime -= dt;
    if (S.matchTime <= 0) {
      S.matchTime = 0; S.matchRunning = false;
      S.cmdVel = { linear: 0, angular: 0 };
      termLog(`=== FIN DU MATCH === Score final: ${S.score} pts`, 'warn');
      showNotif(`Match terminé ! Score: ${S.score} pts`, 'yellow');
      // Sauvegarde du meilleur score
      const _sess = Auth.getSession();
      if (_sess) {
        Auth.updateScore(_sess.username, 'high', S.score);
        termLog(`[score] Score ${S.score} pts sauvegardé pour ${_sess.username}`, 'info');
      }
      const ms = document.getElementById('matchStatus');
      ms.textContent = 'TERMINÉ'; ms.style.background = 'rgba(239,68,68,.15)'; ms.style.color = 'var(--red)';
      const timer = document.getElementById('mpTimer');
      timer.style.color = 'var(--muted)'; timer.textContent = 'FIN';
    } else {
      const m = Math.floor(S.matchTime / 60), sec = Math.floor(S.matchTime % 60);
      const timer = document.getElementById('mpTimer');
      timer.textContent = `${m}:${sec.toString().padStart(2, '0')}`;
      timer.style.color = S.matchTime < 20 ? 'var(--red)' : 'var(--yellow)';
    }
  }
}
