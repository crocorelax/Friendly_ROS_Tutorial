// ════════════════════════════════════════════
// EXÉCUTION DU PROGRAMME
// ════════════════════════════════════════════

function getBlocks() {
  return [...document.querySelectorAll('#scriptBody .sblock')].map(el => ({
    el,
    type: el.dataset.type,
    val:  parseFloat(el.querySelector('input')?.value ?? el.dataset.val),
  }));
}

async function execList(blocks) {
  for (let i=0; i<blocks.length; i++) {
    if (stopFlag) return;
    const b = blocks[i];
    if (b.el) b.el.classList.add('exec');

    switch (b.type) {

      case 'move':
        setChip((b.val>0 ? '⬆ Avance ' : '⬇ Recule ') + Math.abs(b.val) + ' case(s)', 'ok');
        await animMove(b.val * CELL);
        break;

      case 'move_to_wall':
        setChip('⬆⬜ → Mur…', 'ok');
        await execMoveToWall();
        break;

      case 'turn':
        setChip('↻ Tourne ' + b.val + '°', 'ok');
        await animTurn(b.val);
        break;

      case 'face_dir':
        setChip('🧭 Oriente → ' + b.val + '°', 'ok');
        await execFaceDir(b.val);
        break;

      case 'scan_360':
        setChip('🔄 Scan 360°…', 'ok');
        await animTurn(360);
        break;

      case 'wait':
        setChip('⏱ Attend…', 'ok');
        await sleep(Math.max(50, b.val));
        break;

      case 'pen':
        bot.pen = b.val > 0;
        if (!bot.pen) bot.trail = [];
        setChip(bot.pen ? '✏️ Stylo ON' : '✏️ Stylo OFF', 'ok');
        break;

      case 'repeat': {
        const count = b.val === 0 ? Infinity : Math.round(Math.max(1, b.val));
        const sub = blocks.slice(i+1);
        for (let r=0; (count===Infinity || r<count) && !stopFlag; r++) {
          setChip(count===Infinity ? '∞ Tour '+(r+1) : '🔁 Tour '+(r+1)+'/'+count, 'ok');
          await execList(sub);
        }
        if (b.el) b.el.classList.remove('exec');
        return;
      }

      case 'fix_cap': {
        setChip('🧭 Correction cap…', 'warn');
        await sleep(400);
        const diff = b.val - ((bot.a%360+360)%360);
        await animTurn(diff);
        driftAccum = 0;
        setChip('🧭 Cap corrigé', 'ok');
        break;
      }

      case 'fix_drift':
        setChip('⚖️ Correction dérive…', 'warn');
        await sleep(300);
        driftAccum *= .2;
        updateHUD();
        setChip('⚖️ Dérive réduite', 'ok');
        break;

      case 'if_obstacle': {
        const blocked = checkAhead(CELL * .9);
        if (blocked) {
          setChip('🚧 Obstacle — tourne !', 'warn');
          await animTurn(b.val || 90);
        } else {
          setChip('✅ Voie libre', 'ok');
        }
        break;
      }

      case 'stop_obstacle':
        if (checkAhead(CELL * .9)) {
          setChip('🛑 Obstacle — arrêt programme !', 'err');
          stopFlag = true;
          if (b.el) b.el.classList.remove('exec');
          return;
        }
        setChip('✅ Voie libre', 'ok');
        break;

      case 'turn_to_open':
        setChip('🔍 Cherche voie libre…', 'ok');
        await execTurnToOpen(b.val || 90);
        break;
    }

    await sleep(12);
    if (b.el) b.el.classList.remove('exec');
  }
}

async function runProg() {
  if (running) return;
  if (getLives() <= 0) { setChip('💀 Plus de vies !', 'err'); showGameOver(); return; }
  const blocks = getBlocks();
  if (!blocks.length) { setChip('Ajoute des blocs !', 'err'); return; }
  running = true; stopFlag = false;
  document.getElementById('btnRun').style.display  = 'none';
  document.getElementById('btnStop').style.display = '';
  setChip('En cours…', 'ok');
  await execList(blocks);
  running = false;
  document.getElementById('btnRun').style.display  = '';
  document.getElementById('btnStop').style.display = 'none';
  document.querySelectorAll('.sblock').forEach(e => e.classList.remove('exec'));
  if (!stopFlag)
    setChip(score===mapData.goals.length && mapData.goals.length>0
      ? '🎉 Tous les objectifs !' : '✅ Terminé', 'ok');
  else
    setChip('Arrêté', '');
}

function stopProg() { stopFlag = true; }

function resetGame() {
  stopFlag = true;
  setTimeout(() => {
    running = false; stopFlag = false;
    mapData.goals.forEach(g => g.done = false);
    score = 0; driftAccum = 0; driftAngle = 0;
    document.getElementById('starCounter').textContent = '';
    document.getElementById('hudScore').textContent    = '';
    document.getElementById('btnRun').style.display  = '';
    document.getElementById('btnStop').style.display = 'none';
    document.querySelectorAll('.sblock').forEach(e => e.classList.remove('exec'));
    bot = {x:(mapData.spawn.col+.5)*CELL, y:(mapData.spawn.row+.5)*CELL, a:0, pen:false, trail:[]};
    if (currentLevel === 2) initFog();
    setChip('Prêt', ''); updateHUD(); drawGame();
  }, 80);
}
