// ════════════════════════════════════════════
// MOTEUR DE JEU — initialisation, dessin, collision, HUD
// ════════════════════════════════════════════

function initGame(level) {
  gCanvas     = document.getElementById('gameArena');
  gCtx        = gCanvas.getContext('2d');
  fogCanvas   = document.getElementById('fogCanvas');
  fogCtx      = fogCanvas.getContext('2d');
  lidarCanvas = document.getElementById('lidarMap');
  lidarCtx    = lidarCanvas.getContext('2d');

  const wrap = document.getElementById('gameArenaWrap');
  gSZ    = Math.min(wrap.clientWidth - 20, wrap.clientHeight - 20);
  gGridW = Math.floor(gSZ / CELL);
  gGridH = Math.floor(gSZ / CELL);
  gSZ    = Math.max(gGridW, gGridH) * CELL;
  gCanvas.width  = gGridW * CELL; gCanvas.height = gGridH * CELL;
  gCanvas.style.width  = gCanvas.width  + 'px';
  gCanvas.style.height = gCanvas.height + 'px';

  fogCanvas.width  = gCanvas.width;  fogCanvas.height = gCanvas.height;
  fogCanvas.style.width  = gCanvas.style.width;
  fogCanvas.style.height = gCanvas.style.height;
  fogCanvas.style.display = level === 2 ? 'block' : 'none';

  lidarCanvas.style.display = level === 2 ? 'block' : 'none';
  if (level === 2) {
    lidarCanvas.width  = 120; lidarCanvas.height = 120;
    lidarCanvas.style.width = '120px'; lidarCanvas.style.height = '120px';
  }

  document.getElementById('driftInfo').style.display = level === 3 ? '' : 'none';

  const titles = {
    1:'NIVEAU 1 <em>· Vue complète</em>',
    2:'NIVEAU 2 <em>· Mode LiDAR</em>',
    3:'NIVEAU 3 <em>· Robot glissant</em>',
  };
  const tips = {
    1:'Programme le robot pour collecter les ⭐ sans toucher les murs',
    2:'Tu ne vois que le LiDAR — programme à l\'aveugle !',
    3:'Le robot glisse et dérive — utilise les blocs de correction',
  };
  document.getElementById('levelTitle').innerHTML = titles[level];
  document.getElementById('levelTip').textContent = tips[level];

  mapData.goals.forEach(g => g.done = false);
  score = 0; driftAngle = 0; driftAccum = 0;

  document.getElementById('starCounter').textContent = '';
  document.getElementById('hudScore').textContent    = '';
  document.getElementById('btnRun').style.display  = '';
  document.getElementById('btnStop').style.display = 'none';
  setChip('Prêt', '');

  bot = {
    x: (mapData.spawn.col + .5) * CELL,
    y: (mapData.spawn.row + .5) * CELL,
    a: 0, pen: false, trail: [],
  };

  buildPalette(level);
  clearScript();
  if (level === 2) initFog();
  updateHUD();
  updateLivesHud();
  drawGame();
  setTimeout(() => showTutorial(level), 300);
}

// ── Collision ──────────────────────────────

function wallAt(col, row) {
  if (col<0||row<0||col>=gGridW||row>=gGridH) return true;
  return mapData.walls.has(`${col},${row}`);
}

function collidesAt(x, y) {
  const rb = CELL * .38;
  if (x-rb<0||y-rb<0||x+rb>gGridW*CELL||y+rb>gGridH*CELL) return true;
  const c0=Math.floor((x-rb)/CELL), c1=Math.floor((x+rb)/CELL);
  const r0=Math.floor((y-rb)/CELL), r1=Math.floor((y+rb)/CELL);
  for(let c=c0;c<=c1;c++) for(let r=r0;r<=r1;r++) if(wallAt(c,r)) return true;
  return false;
}

function checkAhead(dist) {
  const rad = bot.a * Math.PI / 180;
  return collidesAt(bot.x + Math.sin(rad)*dist, bot.y - Math.cos(rad)*dist);
}

// ── Objectifs ──────────────────────────────

function checkGoals() {
  const thresh = CELL * .7;
  mapData.goals.forEach(g => {
    if (g.done) return;
    const gx=(g.col+.5)*CELL, gy=(g.row+.5)*CELL;
    if (Math.hypot(bot.x-gx, bot.y-gy) < thresh) {
      g.done = true; score++;
      document.getElementById('starCounter').textContent = '⭐'.repeat(score);
      document.getElementById('hudScore').innerHTML =
        `⭐ <b style="color:#ff6b35">${score}/${mapData.goals.length}</b>`;
      if (score === mapData.goals.length)
        setTimeout(() => { setChip('🎉 Bravo ! Tous les objectifs !', 'ok'); onLevelComplete(); }, 300);
    }
  });
}

// ── HUD ────────────────────────────────────

function updateHUD() {
  document.getElementById('hudX').textContent = Math.round(bot.x/CELL);
  document.getElementById('hudY').textContent = Math.round(bot.y/CELL);
  document.getElementById('hudA').textContent = (((Math.round(bot.a)%360)+360)%360) + '°';
  if (currentLevel === 3) {
    document.getElementById('driftInfo').textContent =
      `Drift: ${driftAccum>0?'+':''}${Math.round(driftAccum)}° | Gliss: ${Math.round(driftAngle*10)/10}`;
  }
}

function setChip(txt, cls) {
  const c = document.getElementById('chip');
  c.textContent = txt;
  c.className   = 'chip' + (cls ? ' '+cls : '');
}

// ── Dessin ─────────────────────────────────

function drawGame() {
  if (!gCtx) return;
  const W=gCanvas.width, H=gCanvas.height;
  gCtx.clearRect(0,0,W,H);
  gCtx.fillStyle='#080a10'; gCtx.fillRect(0,0,W,H);

  // Grille
  gCtx.strokeStyle='rgba(255,255,255,.03)'; gCtx.lineWidth=1;
  for(let c=0;c<=gGridW;c++){gCtx.beginPath();gCtx.moveTo(c*CELL,0);gCtx.lineTo(c*CELL,H);gCtx.stroke();}
  for(let r=0;r<=gGridH;r++){gCtx.beginPath();gCtx.moveTo(0,r*CELL);gCtx.lineTo(W,r*CELL);gCtx.stroke();}

  // Tracé stylo
  if (bot.trail.length > 1) {
    gCtx.save();
    gCtx.strokeStyle='rgba(0,214,143,.55)'; gCtx.lineWidth=2.5;
    gCtx.lineCap='round'; gCtx.lineJoin='round';
    gCtx.beginPath();
    bot.trail.forEach((p,i) => i===0 ? gCtx.moveTo(p.x,p.y) : gCtx.lineTo(p.x,p.y));
    gCtx.stroke(); gCtx.restore();
  }

  // Murs
  mapData.walls.forEach(key => {
    const [c,r] = key.split(',').map(Number);
    if (c>=gGridW||r>=gGridH) return;
    gCtx.fillStyle='rgba(30,58,138,.3)';
    gCtx.beginPath(); gCtx.roundRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2,3); gCtx.fill();
    gCtx.save();
    gCtx.beginPath(); gCtx.roundRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2,3); gCtx.clip();
    gCtx.strokeStyle='rgba(59,130,246,.12)'; gCtx.lineWidth=1;
    for(let i=-CELL;i<CELL*2;i+=8){gCtx.beginPath();gCtx.moveTo(c*CELL+i,r*CELL);gCtx.lineTo(c*CELL+i+CELL,r*CELL+CELL);gCtx.stroke();}
    gCtx.restore();
    gCtx.strokeStyle='rgba(59,130,246,.6)'; gCtx.lineWidth=1.5;
    gCtx.beginPath(); gCtx.roundRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2,3); gCtx.stroke();
  });

  // Objectifs
  mapData.goals.forEach(g => {
    const gx=(g.col+.5)*CELL, gy=(g.row+.5)*CELL, gr=CELL*.36;
    if (g.done) {
      gCtx.beginPath(); gCtx.arc(gx,gy,gr,0,Math.PI*2);
      gCtx.fillStyle='rgba(0,214,143,.15)'; gCtx.fill();
      gCtx.strokeStyle='rgba(0,214,143,.5)'; gCtx.lineWidth=2; gCtx.stroke();
      gCtx.font=`${gr*1.1}px sans-serif`;
      gCtx.textAlign='center'; gCtx.textBaseline='middle';
      gCtx.fillStyle='rgba(0,214,143,.8)'; gCtx.fillText('✓',gx,gy);
    } else {
      gCtx.beginPath(); gCtx.arc(gx,gy,gr,0,Math.PI*2);
      gCtx.fillStyle='rgba(255,107,53,.1)'; gCtx.fill();
      gCtx.strokeStyle='rgba(255,107,53,.85)'; gCtx.lineWidth=2;
      gCtx.setLineDash([4,3]); gCtx.stroke(); gCtx.setLineDash([]);
      gCtx.font=`${gr*1.2}px sans-serif`;
      gCtx.textAlign='center'; gCtx.textBaseline='middle';
      gCtx.fillText('⭐',gx,gy);
    }
  });

  // Zone spawn
  gCtx.strokeStyle='rgba(0,214,143,.2)'; gCtx.lineWidth=1; gCtx.setLineDash([4,4]);
  gCtx.strokeRect((mapData.spawn.col+.05)*CELL,(mapData.spawn.row+.05)*CELL,CELL*.9,CELL*.9);
  gCtx.setLineDash([]);

  if (currentLevel === 2) drawLidar();
  drawRobot(bot.x, bot.y, bot.a);
  if (currentLevel === 2) { drawFog(); drawLidarMap(); }
}

function drawRobot(x, y, a) {
  const r = CELL * .42;
  gCtx.save();
  gCtx.translate(x,y); gCtx.rotate(a*Math.PI/180);

  // Ombre
  gCtx.fillStyle='rgba(0,0,0,.3)';
  gCtx.beginPath(); gCtx.ellipse(2,4,r*.85,r*.5,0,0,Math.PI*2); gCtx.fill();

  // Roues
  gCtx.fillStyle='#0f172a';
  [[-r*.9,-r*.42],[-r*.9,r*.16],[r*.9,-r*.42],[r*.9,r*.16]].forEach(([wx,wy]) => {
    gCtx.beginPath(); gCtx.roundRect(wx-3,wy-3,6,9,2); gCtx.fill();
    gCtx.strokeStyle='#334155'; gCtx.lineWidth=.5; gCtx.stroke();
  });

  // Corps
  gCtx.fillStyle='#1e3a8a'; gCtx.strokeStyle='#3b82f6'; gCtx.lineWidth=2;
  gCtx.beginPath(); gCtx.roundRect(-r,-r,r*2,r*2,r*.3); gCtx.fill(); gCtx.stroke();

  // Flèche de direction
  gCtx.fillStyle='#93c5fd';
  gCtx.beginPath(); gCtx.moveTo(0,-r*1.25); gCtx.lineTo(-r*.38,-r*.65); gCtx.lineTo(r*.38,-r*.65);
  gCtx.closePath(); gCtx.fill();

  // Œil
  gCtx.fillStyle='rgba(0,214,143,.9)'; gCtx.beginPath(); gCtx.arc(0,-r*.15,r*.42,0,Math.PI*2); gCtx.fill();
  gCtx.fillStyle='#000';                gCtx.beginPath(); gCtx.arc(0,-r*.15,r*.2, 0,Math.PI*2); gCtx.fill();
  gCtx.fillStyle='#fff';                gCtx.beginPath(); gCtx.arc(r*.08,-r*.22,r*.08,0,Math.PI*2); gCtx.fill();

  // Antenne
  gCtx.strokeStyle='#3b82f6'; gCtx.lineWidth=1.5;
  gCtx.beginPath(); gCtx.moveTo(0,-r); gCtx.lineTo(0,-r*1.6); gCtx.stroke();
  const pc = currentLevel===3 && Math.abs(driftAccum)>10 ? '#ef4444' : '#a855f7';
  gCtx.fillStyle=pc; gCtx.beginPath(); gCtx.arc(0,-r*1.65,3.5,0,Math.PI*2); gCtx.fill();

  // Dérive visuelle (N3)
  if (currentLevel===3 && Math.abs(driftAccum)>2) {
    gCtx.strokeStyle='rgba(239,68,68,.7)'; gCtx.lineWidth=1.5;
    gCtx.beginPath(); gCtx.moveTo(0,0); gCtx.lineTo(driftAccum*1.5,0); gCtx.stroke();
  }

  gCtx.restore();
}
