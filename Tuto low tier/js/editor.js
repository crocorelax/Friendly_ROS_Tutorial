// ════════════════════════════════════════════
// ÉDITEUR DE CARTE
// ════════════════════════════════════════════

function initEditor() {
  edCanvas = document.getElementById('edArena');
  edCtx = edCanvas.getContext('2d');
  const wrap = document.getElementById('edArenaWrap');
  edSZ = Math.min(wrap.clientWidth - 20, wrap.clientHeight - 20);
  edGridW = Math.floor(edSZ / CELL);
  edGridH = Math.floor(edSZ / CELL);
  edCanvas.width  = edGridW * CELL;
  edCanvas.height = edGridH * CELL;
  edCanvas.style.width  = edCanvas.width  + 'px';
  edCanvas.style.height = edCanvas.height + 'px';

  edCanvas.onmousedown   = edMouseDown;
  edCanvas.onmousemove   = edMouseMove;
  edCanvas.onmouseup     = () => edDrawing = false;
  edCanvas.onmouseleave  = () => edDrawing = false;
  edCanvas.oncontextmenu = e => { e.preventDefault(); edApply(e, 'erase'); };

  drawEditor();
  updateEdStats();
}

function getEdCell(e) {
  const r = edCanvas.getBoundingClientRect();
  const scaleX = edCanvas.width  / r.width;
  const scaleY = edCanvas.height / r.height;
  return {
    col: Math.floor((e.clientX - r.left) * scaleX / CELL),
    row: Math.floor((e.clientY - r.top)  * scaleY / CELL),
  };
}

function edMouseDown(e) {
  e.preventDefault();
  edDrawing = true;
  edApply(e, e.button === 2 ? 'erase' : edTool);
}

function edMouseMove(e) {
  const {col, row} = getEdCell(e);
  document.getElementById('edCell').textContent = `${col}, ${row}`;
  if (!edDrawing) return;
  edApply(e, (e.buttons & 2) ? 'erase' : edTool);
}

function edApply(e, tool) {
  const {col, row} = getEdCell(e);
  if (col < 0 || row < 0 || col >= edGridW || row >= edGridH) return;
  const key = `${col},${row}`;

  if (tool === 'wall') {
    mapData.walls.add(key);
  } else if (tool === 'erase') {
    mapData.walls.delete(key);
    mapData.goals = mapData.goals.filter(g => !(g.col===col && g.row===row));
    if (mapData.spawn.col===col && mapData.spawn.row===row)
      mapData.spawn = {col:6, row:10};
  } else if (tool === 'spawn') {
    if (!mapData.walls.has(key)) mapData.spawn = {col, row};
  } else if (tool === 'goal') {
    if (!mapData.walls.has(key) && !mapData.goals.find(g=>g.col===col&&g.row===row))
      if (mapData.goals.length < 5) mapData.goals.push({col, row, done:false});
  }
  drawEditor();
  updateEdStats();
}

function setEdTool(t) {
  edTool = t;
  ['toolWall','toolErase','toolSpawn'].forEach(id => {
    document.getElementById(id)?.classList.remove('active');
  });
  if (t==='wall')  document.getElementById('toolWall').classList.add('active');
  if (t==='erase') document.getElementById('toolErase').classList.add('active');
  if (t==='spawn') document.getElementById('toolSpawn').classList.add('active');
  document.getElementById('edChip').textContent =
    t==='wall'  ? 'Clic-glisse = mur'         :
    t==='erase' ? 'Clic-glisse = effacer'      :
    t==='spawn' ? 'Clic = placer le spawn'     :
    t==='goal'  ? 'Clic = placer un objectif'  : '';
}

function clearMap()  { mapData.walls = new Set(); mapData.goals = []; drawEditor(); updateEdStats(); }
function clearGoals(){ mapData.goals = []; drawEditor(); updateEdStats(); }

function exportMap() {
  const data = {
    walls: [...mapData.walls],
    goals: mapData.goals.map(({col,row}) => ({col,row})),
    spawn: mapData.spawn,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bipboup_map.json';
  a.click();
}

function importMap() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        mapData.walls = new Set(d.walls || []);
        mapData.goals = (d.goals||[]).map(g => ({...g, done:false}));
        mapData.spawn = d.spawn || {col:6, row:10};
        drawEditor(); updateEdStats();
      } catch { alert('Fichier invalide'); }
    };
    reader.readAsText(f);
  };
  input.click();
}

function updateEdStats() {
  document.getElementById('edWallCount').textContent = mapData.walls.size;
  document.getElementById('edGoalCount').textContent = mapData.goals.length;
  document.getElementById('edStats').innerHTML =
    `Murs: ${mapData.walls.size}<br>Objectifs: ${mapData.goals.length}<br>Spawn: col=${mapData.spawn.col}, row=${mapData.spawn.row}`;
}

function drawEditor() {
  if (!edCtx) return;
  const W = edCanvas.width, H = edCanvas.height;
  edCtx.clearRect(0,0,W,H);
  edCtx.fillStyle = '#080a10'; edCtx.fillRect(0,0,W,H);

  // Grille — un seul stroke pour tout
  edCtx.strokeStyle = 'rgba(255,255,255,.05)'; edCtx.lineWidth = 1;
  edCtx.beginPath();
  for (let c=0;c<=edGridW;c++){edCtx.moveTo(c*CELL,0);edCtx.lineTo(c*CELL,H);}
  for (let r=0;r<=edGridH;r++){edCtx.moveTo(0,r*CELL);edCtx.lineTo(W,r*CELL);}
  edCtx.stroke();

  // Murs — hachures regroupées en un seul stroke par mur
  mapData.walls.forEach(key => {
    const [c,r] = key.split(',').map(Number);
    edCtx.fillStyle = 'rgba(30,58,138,.5)';
    edCtx.fillRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);
    edCtx.strokeStyle = 'rgba(59,130,246,.7)'; edCtx.lineWidth = 1.5;
    edCtx.strokeRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);
    edCtx.save();
    edCtx.beginPath(); edCtx.rect(c*CELL+1,r*CELL+1,CELL-2,CELL-2); edCtx.clip();
    edCtx.strokeStyle = 'rgba(59,130,246,.15)'; edCtx.lineWidth = 1;
    edCtx.beginPath();
    for (let i=-CELL;i<CELL*2;i+=8) { edCtx.moveTo(c*CELL+i,r*CELL); edCtx.lineTo(c*CELL+i+CELL,r*CELL+CELL); }
    edCtx.stroke();
    edCtx.restore();
  });

  // Spawn
  const sx=(mapData.spawn.col+.5)*CELL, sy=(mapData.spawn.row+.5)*CELL;
  edCtx.fillStyle='rgba(0,214,143,.3)'; edCtx.strokeStyle='rgba(0,214,143,.8)'; edCtx.lineWidth=2;
  edCtx.beginPath(); edCtx.arc(sx,sy,CELL*.35,0,Math.PI*2); edCtx.fill(); edCtx.stroke();
  edCtx.fillStyle='rgba(0,214,143,.9)'; edCtx.font='bold 10px JetBrains Mono,monospace';
  edCtx.textAlign='center'; edCtx.textBaseline='middle'; edCtx.fillText('S',sx,sy);

  // Objectifs
  mapData.goals.forEach(g => {
    const gx=(g.col+.5)*CELL, gy=(g.row+.5)*CELL;
    edCtx.fillStyle='rgba(255,107,53,.2)'; edCtx.strokeStyle='rgba(255,107,53,.8)'; edCtx.lineWidth=2;
    edCtx.setLineDash([4,3]);
    edCtx.beginPath(); edCtx.arc(gx,gy,CELL*.38,0,Math.PI*2); edCtx.fill(); edCtx.stroke();
    edCtx.setLineDash([]);
    edCtx.font=`${CELL*.4}px sans-serif`; edCtx.textAlign='center'; edCtx.textBaseline='middle';
    edCtx.fillText('⭐',gx,gy);
  });
}
