// ══ CANVAS GLOBALS ══
let rvizCanvas, rvizCtx, rvizW, rvizH;
let arenaCanvas, arenaCtx, arenaW, arenaH;
let arenaScale;
let arenaStaticCanvas = null, arenaStaticCtx = null;

const LIDAR_RAYS = 90;

// ══ INIT ══

function initCanvases() {
  rvizCanvas = document.getElementById('rvizCanvas');
  rvizCtx = rvizCanvas.getContext('2d');
  const rvizWrap = rvizCanvas.parentElement;
  rvizW = rvizWrap.clientWidth;
  rvizH = rvizWrap.clientHeight
        - rvizWrap.querySelector('.rviz-toolbar').offsetHeight
        - rvizWrap.querySelector('.panel-head').offsetHeight;
  rvizCanvas.width = rvizW;
  rvizCanvas.height = rvizH;

  arenaCanvas = document.getElementById('arenaCanvas');
  arenaCtx = arenaCanvas.getContext('2d');
  const arenaWrap = arenaCanvas.parentElement;
  arenaW = arenaWrap.clientWidth;
  arenaH = arenaWrap.clientHeight - arenaWrap.querySelector('.panel-head').offsetHeight;
  arenaCanvas.width = arenaW;
  arenaCanvas.height = arenaH;
  arenaScale = Math.min(arenaW / ARENA_W, arenaH / ARENA_H) * .9;
  rebuildArenaStatic();
}

// ══ LIDAR RAY CAST ══
// Intersection analytique (méthode des slabs) : O(N) par rayon au lieu de O(maxD×N)

function castRay(angle, noise) {
  const rad = (S.a + angle) * Math.PI / 180;
  const dx = Math.cos(rad), dy = Math.sin(rad);
  const maxD = 150;
  let minD = maxD;

  // Sortie de l'arène : distance jusqu'au bord le plus proche dans le sens du rayon
  if (Math.abs(dx) > 1e-9) {
    const t = dx > 0 ? (ARENA_W - S.x) / dx : -S.x / dx;
    if (t > 0) minD = Math.min(minD, t);
  }
  if (Math.abs(dy) > 1e-9) {
    const t = dy > 0 ? (ARENA_H - S.y) / dy : -S.y / dy;
    if (t > 0) minD = Math.min(minD, t);
  }

  // Intersection avec chaque mur (slab AABB — calcul exact)
  for (const w of WALLS) {
    let tLo = 0, tHi = minD;
    if (Math.abs(dx) > 1e-9) {
      const t1 = (w.x - S.x) / dx, t2 = (w.x + w.w - S.x) / dx;
      tLo = Math.max(tLo, Math.min(t1, t2));
      tHi = Math.min(tHi, Math.max(t1, t2));
    } else if (S.x <= w.x || S.x >= w.x + w.w) { continue; }
    if (Math.abs(dy) > 1e-9) {
      const t1 = (w.y - S.y) / dy, t2 = (w.y + w.h - S.y) / dy;
      tLo = Math.max(tLo, Math.min(t1, t2));
      tHi = Math.min(tHi, Math.max(t1, t2));
    } else if (S.y <= w.y || S.y >= w.y + w.h) { continue; }
    if (tLo <= tHi && tLo >= 0) minD = Math.min(minD, tLo);
  }

  return minD + (noise ? (Math.random() - .5) * noise * minD : 0);
}

// ══ RVIZ DRAW ══

function drawRviz() {
  const c = rvizCtx, W = rvizW, H = rvizH;
  c.fillStyle = '#060810';
  c.fillRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const scale = Math.min(W, H) / ARENA_W * 0.8;

  // Grid — un seul stroke pour tout
  c.strokeStyle = 'rgba(30,37,53,.8)'; c.lineWidth = 1;
  const gs = 10 * scale;
  c.beginPath();
  for (let x = cx % gs; x < W; x += gs) { c.moveTo(x, 0); c.lineTo(x, H); }
  for (let y = cy % gs; y < H; y += gs) { c.moveTo(0, y); c.lineTo(W, y); }
  c.stroke();

  // Origin cross
  c.strokeStyle = 'rgba(56,189,248,.3)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, cy); c.lineTo(W, cy); c.moveTo(cx, 0); c.lineTo(cx, H); c.stroke();

  const toS = (x, y) => ({ sx: cx + (x - S.x) * scale, sy: cy + (y - S.y) * scale });

  // MAP overlay
  if (S.showMap) {
    const { sx: ax, sy: ay } = toS(0, 0);
    c.strokeStyle = 'rgba(56,189,248,.25)'; c.lineWidth = 1; c.setLineDash([4, 4]);
    c.strokeRect(ax, ay, ARENA_W * scale, ARENA_H * scale);
    c.setLineDash([]);
    WALLS.forEach(w => {
      const { sx, sy } = toS(w.x, w.y);
      c.fillStyle = 'rgba(30,58,138,.4)'; c.strokeStyle = 'rgba(59,130,246,.5)'; c.lineWidth = 1;
      c.fillRect(sx, sy, w.w * scale, w.h * scale);
      c.strokeRect(sx, sy, w.w * scale, w.h * scale);
    });
  }

  // LIDAR scan
  if (S.showLidar) {
    const scan = [];
    for (let i = 0; i < LIDAR_RAYS; i++) {
      const angle = (i / LIDAR_RAYS) * 360;
      const d = castRay(angle, S.lidarNoise);
      const rad = (S.a + angle) * Math.PI / 180;
      scan.push({ d, rx: Math.cos(rad) * d, ry: Math.sin(rad) * d });
    }
    // Rayons — un seul stroke pour les 90
    c.strokeStyle = 'rgba(0,214,143,.12)'; c.lineWidth = .5;
    c.beginPath();
    scan.forEach(r => { c.moveTo(cx, cy); c.lineTo(cx + r.rx * scale, cy + r.ry * scale); });
    c.stroke();
    // Points d'impact — un seul fill pour tous
    c.fillStyle = 'rgba(0,214,143,.7)';
    c.beginPath();
    scan.forEach(r => {
      if (r.d < 140) {
        const noise = (Math.random() - .5) * S.lidarNoise * 15;
        c.arc(cx + r.rx * scale + noise, cy + r.ry * scale + noise, 1.8, 0, Math.PI * 2);
      }
    });
    c.fill();
    S.lidarHistory.push(Date.now());
  }

  // ODOM trail
  if (S.showOdom && S.odomHistory.length > 1) {
    c.strokeStyle = 'rgba(167,139,250,.6)'; c.lineWidth = 1.5; c.lineCap = 'round';
    c.beginPath();
    S.odomHistory.forEach((p, i) => {
      const px = cx + (p.x - S.x) * scale + p.drift;
      const py = cy + (p.y - S.y) * scale + p.drift;
      i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    });
    c.stroke();
    if (S.odomHistory.length > 0) {
      const last = S.odomHistory[S.odomHistory.length - 1];
      c.fillStyle = 'rgba(167,139,250,.8)'; c.font = '9px JetBrains Mono,monospace';
      c.fillText(`odom: (${last.x.toFixed(1)}, ${last.y.toFixed(1)})`, cx + 8, cy - 4);
    }
  }

  // ROBOT
  if (S.showRobot) {
    c.save(); c.translate(cx, cy); c.rotate(S.a * Math.PI / 180);
    const rb = 10 * scale;
    c.fillStyle = S.estop ? 'rgba(239,68,68,.3)' : 'rgba(30,58,138,.6)';
    c.strokeStyle = S.estop ? 'var(--red)' : 'var(--blue)'; c.lineWidth = 1.5;
    c.beginPath(); c.roundRect(-rb, -rb, rb * 2, rb * 2, rb * .3); c.fill(); c.stroke();
    c.fillStyle = S.estop ? 'var(--red)' : '#93c5fd';
    c.beginPath(); c.moveTo(rb * 1.4, 0); c.lineTo(rb * .7, -rb * .4); c.lineTo(rb * .7, rb * .4); c.closePath(); c.fill();
    c.fillStyle = S.estop ? 'var(--red)' : 'var(--green)';
    c.beginPath(); c.arc(rb * .2, 0, rb * .35, 0, Math.PI * 2); c.fill();
    if (S.estop) {
      c.fillStyle = 'rgba(239,68,68,.9)'; c.font = `bold ${rb * .8}px monospace`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 0, rb * .4);
    }
    c.restore();
    c.fillStyle = 'rgba(56,189,248,.7)'; c.font = '9px JetBrains Mono,monospace';
    c.textAlign = 'left';
    c.fillText(`(${S.x.toFixed(1)}, ${S.y.toFixed(1)}) ${S.a.toFixed(0)}°`, cx + 14 * scale, cy + 14 * scale);
  }

  // Nav goal marker
  if (S.navTarget) {
    const { sx: gx, sy: gy } = toS(S.navTarget.x, S.navTarget.y);
    // Line robot → goal
    c.strokeStyle = 'rgba(249,115,22,.25)'; c.lineWidth = 1; c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(gx, gy); c.stroke(); c.setLineDash([]);
    // Goal circle
    c.strokeStyle = 'rgba(249,115,22,.9)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(gx, gy, 10, 0, Math.PI * 2); c.stroke();
    // Cross
    c.beginPath(); c.moveTo(gx - 6, gy); c.lineTo(gx + 6, gy); c.stroke();
    c.beginPath(); c.moveTo(gx, gy - 6); c.lineTo(gx, gy + 6); c.stroke();
    // Label
    c.fillStyle = 'rgba(249,115,22,.9)'; c.font = '8px JetBrains Mono,monospace';
    c.textAlign = 'center';
    c.fillText(S.navTarget.label ? S.navTarget.label.toUpperCase() : 'GOAL', gx, gy - 14);
  }

  // Frame info
  c.fillStyle = 'rgba(74,85,104,.6)'; c.font = '9px JetBrains Mono,monospace';
  c.textAlign = 'left';
  c.fillText(`frame: map | robot: (${S.x.toFixed(2)}, ${S.y.toFixed(2)}) | θ: ${S.a.toFixed(1)}°`, 8, H - 8);

  // Compass
  c.save(); c.translate(W - 30, 30);
  c.strokeStyle = 'rgba(56,189,248,.4)'; c.lineWidth = 1;
  c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.stroke();
  ['N', 'E', 'S', 'W'].forEach((l, i) => {
    const a = i * Math.PI / 2;
    c.fillStyle = i === 0 ? 'var(--red)' : 'rgba(56,189,248,.6)';
    c.font = '8px JetBrains Mono,monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(l, Math.sin(a) * 14, -Math.cos(a) * 14);
  });
  c.restore();
}

// ══ CACHE ARÈNE STATIQUE (fond + texture + murs) ══

function rebuildArenaStatic() {
  if (!arenaCanvas) return;
  if (!arenaStaticCanvas) {
    arenaStaticCanvas = document.createElement('canvas');
    arenaStaticCtx = arenaStaticCanvas.getContext('2d');
  }
  arenaStaticCanvas.width = arenaW;
  arenaStaticCanvas.height = arenaH;
  const c = arenaStaticCtx;
  const s = arenaScale;
  const ox = (arenaW - ARENA_W * s) / 2, oy = (arenaH - ARENA_H * s) / 2;

  // Fond sableux
  c.fillStyle = '#1a1208'; c.fillRect(0, 0, arenaW, arenaH);
  c.fillStyle = '#2d2010'; c.fillRect(ox, oy, ARENA_W * s, ARENA_H * s);

  // Texture grille — un seul stroke
  c.strokeStyle = 'rgba(80,60,20,.3)'; c.lineWidth = .5;
  c.beginPath();
  for (let x = 0; x < ARENA_W; x += 20) { c.moveTo(ox + x * s, oy); c.lineTo(ox + x * s, oy + ARENA_H * s); }
  for (let y = 0; y < ARENA_H; y += 20) { c.moveTo(ox, oy + y * s); c.lineTo(ox + ARENA_W * s, oy + y * s); }
  c.stroke();

  // Zones équipes
  c.fillStyle = 'rgba(59,130,246,.08)'; c.fillRect(ox, oy, 60 * s, ARENA_H * s);
  c.fillStyle = 'rgba(239,68,68,.08)';  c.fillRect(ox + (ARENA_W - 60) * s, oy, 60 * s, ARENA_H * s);
  c.font = `bold ${10 * s}px JetBrains Mono`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(59,130,246,.3)';  c.fillText('BLEU',  ox + 30 * s,             oy + ARENA_H * s / 2);
  c.fillStyle = 'rgba(239,68,68,.3)';   c.fillText('ROUGE', ox + (ARENA_W - 30) * s, oy + ARENA_H * s / 2);

  // Ligne centrale
  c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 1; c.setLineDash([6, 4]);
  c.beginPath(); c.moveTo(ox + ARENA_W * s / 2, oy); c.lineTo(ox + ARENA_W * s / 2, oy + ARENA_H * s); c.stroke();
  c.setLineDash([]);

  // Murs
  WALLS.forEach(w => {
    c.fillStyle = 'rgba(60,40,10,.8)'; c.strokeStyle = 'rgba(120,80,30,.8)'; c.lineWidth = 1;
    c.fillRect(ox + w.x * s, oy + w.y * s, w.w * s, w.h * s);
    c.strokeRect(ox + w.x * s, oy + w.y * s, w.w * s, w.h * s);
    if (w.label && s > 0.5) {
      c.fillStyle = 'rgba(200,160,80,.6)'; c.font = `${7 * s}px JetBrains Mono`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(w.label, ox + (w.x + w.w / 2) * s, oy + (w.y + w.h / 2) * s);
    }
  });

  // Bordure
  c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2;
  c.strokeRect(ox, oy, ARENA_W * s, ARENA_H * s);
}

// ══ ARENA DRAW ══

function drawArena() {
  const c = arenaCtx, W = arenaW, H = arenaH;
  const s = arenaScale;
  const ox = (W - ARENA_W * s) / 2, oy = (H - ARENA_H * s) / 2;

  c.clearRect(0, 0, W, H);

  // Calque statique depuis le cache (fond + texture + murs)
  if (arenaStaticCanvas) c.drawImage(arenaStaticCanvas, 0, 0);

  // Goals
  GOALS.forEach(g => {
    const gx = ox + g.x * s, gy = oy + g.y * s;
    if (g.done) {
      c.fillStyle = 'rgba(34,197,94,.15)'; c.strokeStyle = 'rgba(34,197,94,.4)'; c.lineWidth = 1; c.setLineDash([3, 2]);
      c.beginPath(); c.arc(gx, gy, g.r * s, 0, Math.PI * 2); c.fill(); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(34,197,94,.6)'; c.font = `${g.r * s}px sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✓', gx, gy);
    } else {
      c.fillStyle = g.color + '33'; c.strokeStyle = g.color; c.lineWidth = 1.5; c.setLineDash([3, 2]);
      c.beginPath(); c.arc(gx, gy, g.r * s, 0, Math.PI * 2); c.fill(); c.stroke(); c.setLineDash([]);
      c.font = `${g.r * s * .9}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(g.label.includes('Garde') ? '🍽' : '🌱', gx, gy);
      c.fillStyle = 'rgba(200,200,200,.4)'; c.font = `${6 * s}px JetBrains Mono`;
      c.fillText('+' + g.pts, gx, gy + g.r * s + 6 * s);
    }
  });

  // Robot on arena
  const rx = ox + S.x * s, ry = oy + S.y * s;
  c.save(); c.translate(rx, ry); c.rotate(S.a * Math.PI / 180);
  const rb = 8 * s;
  c.fillStyle = '#1e293b';
  [[-rb * .9, -rb * .4], [-rb * .9, rb * .15], [rb * .9, -rb * .4], [rb * .9, rb * .15]].forEach(([wx, wy]) => {
    c.beginPath(); c.roundRect(wx - 2, wy - 2, 4, 6, 1); c.fill();
  });
  c.fillStyle = S.estop ? 'rgba(239,68,68,.5)' : 'rgba(30,58,138,.8)';
  c.strokeStyle = S.estop ? 'var(--red)' : 'var(--blue)'; c.lineWidth = 1;
  c.beginPath(); c.roundRect(-rb, -rb, rb * 2, rb * 2, rb * .3); c.fill(); c.stroke();
  c.fillStyle = S.estop ? 'var(--red)' : '#93c5fd';
  c.beginPath(); c.moveTo(rb * 1.3, 0); c.lineTo(rb * .7, -rb * .4); c.lineTo(rb * .7, rb * .4); c.closePath(); c.fill();
  c.fillStyle = 'rgba(0,214,143,.9)';
  c.beginPath(); c.arc(rb * .2, 0, rb * .35, 0, Math.PI * 2); c.fill();
  c.restore();

  // Timer overlay
  if (S.matchRunning) {
    c.fillStyle = S.matchTime < 20 ? 'rgba(239,68,68,.9)' : 'rgba(234,179,8,.9)';
    c.font = `bold ${14 * s}px JetBrains Mono`; c.textAlign = 'right'; c.textBaseline = 'top';
    c.fillText(`${S.matchTime.toFixed(0)}s`, ox + ARENA_W * s - 4, oy + 4);
  }

  // Score
  if (S.score > 0) {
    c.fillStyle = 'rgba(0,214,143,.9)'; c.font = `bold ${11 * s}px JetBrains Mono`;
    c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(`Score: ${S.score}`, ox + 4, oy + 4);
  }

  // Nav goal marker sur l'arène
  if (S.navTarget) {
    const gx = ox + S.navTarget.x * s, gy = oy + S.navTarget.y * s;
    c.strokeStyle = 'rgba(249,115,22,.9)'; c.lineWidth = 1.5; c.setLineDash([3, 2]);
    c.beginPath(); c.arc(gx, gy, 8 * s, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    c.strokeStyle = 'rgba(249,115,22,.6)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(gx - 5 * s, gy); c.lineTo(gx + 5 * s, gy); c.stroke();
    c.beginPath(); c.moveTo(gx, gy - 5 * s); c.lineTo(gx, gy + 5 * s); c.stroke();
  }

  // Hint "clic pour naviguer" quand idle et nodes actifs
  if (nodesLaunched && !S.estop && !S.navTarget) {
    c.fillStyle = 'rgba(74,85,104,.5)'; c.font = `${7 * s}px JetBrains Mono`;
    c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.fillText('clic → nav_to', ox + ARENA_W * s / 2, oy + ARENA_H * s - 3);
  }
}
