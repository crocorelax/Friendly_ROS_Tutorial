// ════════════════════════════════════════════
// LIDAR & BROUILLARD DE GUERRE
// ════════════════════════════════════════════

function initFog() {
  fogRevealed = new Uint8Array(gGridW * gGridH);
  drawFog();
}

// Lance un rayon depuis le bot dans la direction `angle` (degrés absolus canvas)
function castRay(angle) {
  const rad = angle * Math.PI / 180;
  const dx = Math.cos(rad), dy = Math.sin(rad);
  let dist = 0;
  while (dist < LIDAR_RANGE * CELL) {
    dist += 2;
    const nx = bot.x + dx*dist, ny = bot.y + dy*dist;
    const c = Math.floor(nx/CELL), r = Math.floor(ny/CELL);
    if (wallAt(c,r)) return {dist, hit:true,  x:nx, y:ny};
    if (c<0||r<0||c>=gGridW||r>=gGridH) return {dist, hit:false, x:nx, y:ny};
  }
  return {dist:LIDAR_RANGE*CELL, hit:false,
          x:bot.x+dx*LIDAR_RANGE*CELL, y:bot.y+dy*LIDAR_RANGE*CELL};
}

// Scan 360° — angle 0 = devant le robot (bot.a - 90 en coords canvas)
function getLidarScan() {
  const scan = [];
  for (let i=0; i<LIDAR_RAYS; i++) {
    const angle = (bot.a - 90) + i*(360/LIDAR_RAYS);
    scan.push({angle, ...castRay(angle)});
  }
  return scan;
}

// Distance jusqu'au prochain mur droit devant
function getFrontRayDist() {
  return castRay(bot.a - 90).dist;
}

function drawLidar() {
  const scan = getLidarScan();

  // Révèle les cellules scannées dans le brouillard
  scan.forEach(ray => {
    const steps = Math.floor(ray.dist / CELL);
    for (let s=0; s<=steps; s++) {
      const rad = ray.angle * Math.PI / 180;
      const nx = bot.x + Math.cos(rad)*s*CELL*.8;
      const ny = bot.y + Math.sin(rad)*s*CELL*.8;
      const c = Math.floor(nx/CELL), r = Math.floor(ny/CELL);
      if (c>=0&&r>=0&&c<gGridW&&r<gGridH) fogRevealed[r*gGridW+c] = 1;
    }
  });

  // Dessine les rayons sur le canvas principal
  gCtx.save();
  scan.forEach(ray => {
    const rad = ray.angle * Math.PI / 180;
    gCtx.strokeStyle = ray.hit ? 'rgba(0,214,143,.25)' : 'rgba(0,214,143,.1)';
    gCtx.lineWidth = .7;
    gCtx.beginPath();
    gCtx.moveTo(bot.x, bot.y);
    gCtx.lineTo(bot.x + Math.cos(rad)*ray.dist, bot.y + Math.sin(rad)*ray.dist);
    gCtx.stroke();
    if (ray.hit) {
      gCtx.fillStyle = 'rgba(0,214,143,.9)';
      gCtx.beginPath(); gCtx.arc(ray.x, ray.y, 2.5, 0, Math.PI*2); gCtx.fill();
    }
  });
  gCtx.restore();
}

function drawFog() {
  if (!fogCtx || !fogRevealed) return;
  fogCtx.clearRect(0,0,fogCanvas.width,fogCanvas.height);

  // Fond noir
  fogCtx.fillStyle = 'rgba(8,10,16,.96)';
  fogCtx.fillRect(0,0,fogCanvas.width,fogCanvas.height);

  // Découpe les cellules révélées
  fogCtx.globalCompositeOperation = 'destination-out';
  for (let r=0; r<gGridH; r++) {
    for (let c=0; c<gGridW; c++) {
      if (fogRevealed[r*gGridW+c]) {
        fogCtx.fillStyle = 'rgba(255,255,255,.85)';
        fogCtx.fillRect(c*CELL, r*CELL, CELL, CELL);
      }
    }
  }
  // Halo autour du robot
  const grad = fogCtx.createRadialGradient(bot.x,bot.y,CELL*.5,bot.x,bot.y,CELL*2.5);
  grad.addColorStop(0,'rgba(255,255,255,1)');
  grad.addColorStop(1,'rgba(255,255,255,0)');
  fogCtx.fillStyle = grad;
  fogCtx.beginPath(); fogCtx.arc(bot.x,bot.y,CELL*2.5,0,Math.PI*2); fogCtx.fill();
  fogCtx.globalCompositeOperation = 'source-over';
}

function drawLidarMap() {
  if (!lidarCtx) return;
  const M = 120, scale = M / (gGridW*CELL);
  lidarCtx.clearRect(0,0,M,M);
  lidarCtx.fillStyle = 'rgba(0,0,0,.85)'; lidarCtx.fillRect(0,0,M,M);

  // Murs sur la mini-carte
  mapData.walls.forEach(key => {
    const [c,r] = key.split(',').map(Number);
    lidarCtx.fillStyle = 'rgba(59,130,246,.6)';
    lidarCtx.fillRect(c*CELL*scale, r*CELL*scale, CELL*scale, CELL*scale);
  });

  // Rayons LiDAR
  const scan = getLidarScan();
  lidarCtx.strokeStyle = 'rgba(0,214,143,.5)'; lidarCtx.lineWidth = .5;
  scan.forEach(ray => {
    const rad = ray.angle * Math.PI / 180;
    const bx = bot.x*scale, by = bot.y*scale;
    lidarCtx.beginPath(); lidarCtx.moveTo(bx, by);
    lidarCtx.lineTo(bx + Math.cos(rad)*ray.dist*scale, by + Math.sin(rad)*ray.dist*scale);
    lidarCtx.stroke();
    if (ray.hit) {
      lidarCtx.fillStyle = 'rgba(0,214,143,.9)';
      lidarCtx.beginPath(); lidarCtx.arc(ray.x*scale, ray.y*scale, 1.5, 0, Math.PI*2); lidarCtx.fill();
    }
  });

  // Robot
  lidarCtx.fillStyle = '#3b82f6';
  lidarCtx.beginPath(); lidarCtx.arc(bot.x*scale, bot.y*scale, 4, 0, Math.PI*2); lidarCtx.fill();

  // Bordure
  lidarCtx.strokeStyle = 'rgba(0,214,143,.4)'; lidarCtx.lineWidth = 1;
  lidarCtx.strokeRect(0,0,M,M);
}
