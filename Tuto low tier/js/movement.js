// ════════════════════════════════════════════
// PRIMITIVES DE MOUVEMENT
// ════════════════════════════════════════════

async function animMove(dist) {
  const steps = Math.abs(dist);
  const dir   = dist > 0 ? 1 : -1;

  let driftPerStep = 0;
  if (currentLevel === 3) driftPerStep = (Math.random() - .45) * .4;

  const rad0 = bot.a * Math.PI / 180;
  let dx = Math.sin(rad0) * dir;
  let dy = -Math.cos(rad0) * dir;
  // Direction originale (sans dérive) — sert à distinguer collision frontale vs collision par dérive
  const origDx = dx, origDy = dy;

  // Glissement aléatoire (N3)
  const slip = currentLevel === 3 ? (Math.random()*.3 + .85) : 1;
  const actualSteps = Math.round(steps * slip);

  for (let i=0; i<actualSteps; i++) {
    if (stopFlag) return;

    if (currentLevel === 3) {
      driftAccum += driftPerStep;
      const rad2 = (bot.a + driftAccum) * Math.PI / 180;
      dx = Math.sin(rad2) * dir;
      dy = -Math.cos(rad2) * dir;
    }

    const nx = bot.x + dx, ny = bot.y + dy;
    if (collidesAt(nx, ny)) {
      if (collidesAt(bot.x + origDx, bot.y + origDy)) {
        // Collision frontale → perte de vie
        setChip('💥 Collision ! (-1 vie)', 'err');
        gCanvas.style.animation = 'shake .3s';
        setTimeout(() => gCanvas.style.animation = '', 400);
        loseLife();
      } else {
        // Collision causée uniquement par la dérive → arrêt sans pénalité
        setChip('⚠️ Dérive — arrêt automatique', 'warn');
      }
      return;
    }
    bot.x = nx; bot.y = ny;
    if (bot.pen) bot.trail.push({x:bot.x, y:bot.y});
    checkGoals(); updateHUD(); drawGame();
    await sleep(currentLevel === 3 ? 9 : 7);
  }
}

async function animTurn(deg) {
  const steps = Math.abs(deg);
  const dir   = deg > 0 ? 1 : -1;
  const slip  = currentLevel === 3 ? (Math.random()*.25 + .88) : 1;
  const actual = Math.round(steps * slip);
  for (let i=0; i<actual; i++) {
    if (stopFlag) return;
    bot.a += dir; updateHUD(); drawGame(); await sleep(5);
  }
}

// ── Blocs intelligents ─────────────────────

// Avance jusqu'à ~1 cellule avant le mur (utilise le LiDAR)
async function execMoveToWall() {
  const fwdAngle = bot.a - 90;
  const ray = castRay(fwdAngle);
  const moveDist = Math.max(0, ray.dist - CELL * 0.65);
  if (moveDist > 2) await animMove(moveDist);
}

// Tourne par pas de `stepDeg` jusqu'à trouver une voie libre
async function execTurnToOpen(stepDeg) {
  const step = stepDeg || 90;
  const maxTries = Math.ceil(360 / Math.abs(step));
  let tries = 0;
  while (tries < maxTries && !stopFlag) {
    if (!checkAhead(CELL * 0.9)) break;
    await animTurn(step);
    tries++;
  }
}

// Oriente le robot vers un cap absolu (0=Nord, 90=Est, 180=Sud, 270=Ouest)
async function execFaceDir(targetDeg) {
  const current = ((bot.a % 360) + 360) % 360;
  let diff = targetDeg - current;
  if (diff > 180)  diff -= 360;
  if (diff < -180) diff += 360;
  await animTurn(diff);
}
