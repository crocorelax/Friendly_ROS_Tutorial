// ══ ARENA EDITOR — admin only ══
// Permet à l'admin de modifier WALLS, GOALS et le spawn du robot en live.
// Les modifications sont appliquées directement à state.js et sauvegardables.

const _AE_SCALE  = 2.4;           // canvas pixels par unité arène
const _AE_STORE  = 'bipboup_arenas';

// ── État interne ──────────────────────────────────────────
let _aeWalls    = [];   // copies de WALLS en cours d'édition
let _aeGoals    = [];   // copies de GOALS en cours d'édition
let _aeSpawn    = { x: 30, y: 100 };
let _aeTool     = 'select';        // 'select' | 'wall' | 'goal' | 'delete'
let _aeSel      = null;            // { kind:'wall'|'goal'|'spawn', idx }
let _aeDrag     = false;
let _aeDragOx   = 0; let _aeDragOy = 0;
let _aeCanvas   = null; let _aeCtx = null;

// ── Storage local ─────────────────────────────────────────
function _aeGetArenas()   { try { return JSON.parse(localStorage.getItem(_AE_STORE)) || []; } catch { return []; } }
function _aeSetArenas(v)  { localStorage.setItem(_AE_STORE, JSON.stringify(v)); }

// ── Ouverture / Fermeture ─────────────────────────────────
function openArenaEditor() {
  if (!Auth.isAdmin()) return;
  // Copie profonde de l'état courant
  _aeWalls  = WALLS.map(w => ({ ...w }));
  _aeGoals  = GOALS.map(g => ({ ...g, done: false }));
  _aeSpawn  = { x: Math.round(S.x), y: Math.round(S.y) };
  _aeTool   = 'select';
  _aeSel    = null;
  document.getElementById('aeModal').style.display = 'flex';
  _aeInitCanvas();
  _aeRender();
  _aeRefreshProps();
  _aeRefreshSavedList();
}

function closeArenaEditor() {
  document.getElementById('aeModal').style.display = 'none';
}

// ── Canvas ────────────────────────────────────────────────
function _aeInitCanvas() {
  _aeCanvas = document.getElementById('aeCanvas');
  _aeCtx    = _aeCanvas.getContext('2d');
  _aeCanvas.width  = Math.round(ARENA_W * _AE_SCALE);
  _aeCanvas.height = Math.round(ARENA_H * _AE_SCALE);

  _aeCanvas.onmousedown = _aeMouseDown;
  _aeCanvas.onmousemove = _aeMouseMove;
  _aeCanvas.onmouseup   = _aeMouseUp;
  _aeCanvas.oncontextmenu = e => e.preventDefault();
}

function _aePt(e) {
  const r = _aeCanvas.getBoundingClientRect();
  return {
    x: Math.round((e.clientX - r.left)  / _AE_SCALE),
    y: Math.round((e.clientY - r.top)   / _AE_SCALE),
  };
}

// ── Rendu ─────────────────────────────────────────────────
function _aeRender() {
  if (!_aeCtx) return;
  const c = _aeCtx;
  const W = _aeCanvas.width, H = _aeCanvas.height;
  const s = _AE_SCALE;

  // Fond
  c.fillStyle = '#080a10'; c.fillRect(0, 0, W, H);

  // Grille 10×10 — un seul stroke
  c.strokeStyle = 'rgba(255,255,255,.04)'; c.lineWidth = 1;
  c.beginPath();
  for (let x = 0; x <= ARENA_W; x += 10) { c.moveTo(x*s, 0); c.lineTo(x*s, H); }
  for (let y = 0; y <= ARENA_H; y += 10) { c.moveTo(0, y*s); c.lineTo(W, y*s); }
  c.stroke();

  // Bordure arène
  c.strokeStyle = 'rgba(56,189,248,.4)'; c.lineWidth = 2;
  c.strokeRect(1, 1, W-2, H-2);

  // Murs
  _aeWalls.forEach((w, i) => {
    const sel = _aeSel?.kind === 'wall' && _aeSel.idx === i;
    c.fillStyle   = sel ? 'rgba(59,130,246,.55)' : 'rgba(30,58,138,.45)';
    c.strokeStyle = sel ? '#60a5fa' : 'rgba(59,130,246,.7)';
    c.lineWidth   = sel ? 2.5 : 1.5;
    c.beginPath(); c.roundRect(w.x*s, w.y*s, w.w*s, w.h*s, 3); c.fill(); c.stroke();
    c.fillStyle   = sel ? '#93c5fd' : 'rgba(148,197,252,.7)';
    c.font        = `bold ${Math.max(8, Math.min(11, w.h*s*.55))}px JetBrains Mono`;
    c.textAlign   = 'center'; c.textBaseline = 'middle';
    c.fillText(w.label || '', (w.x + w.w/2)*s, (w.y + w.h/2)*s);
  });

  // Objectifs
  _aeGoals.forEach((g, i) => {
    const sel = _aeSel?.kind === 'goal' && _aeSel.idx === i;
    c.beginPath(); c.arc(g.x*s, g.y*s, g.r*s, 0, Math.PI*2);
    c.fillStyle   = sel ? g.color + 'cc' : g.color + '33';
    c.strokeStyle = sel ? g.color : g.color + 'aa';
    c.lineWidth   = sel ? 3 : 2;
    c.fill(); c.stroke();
    c.fillStyle   = '#fff';
    c.font        = `bold ${Math.round(g.r*s*.8)}px sans-serif`;
    c.textAlign   = 'center'; c.textBaseline = 'middle';
    c.fillText(g.pts, g.x*s, g.y*s);
    c.fillStyle   = 'rgba(255,255,255,.6)';
    c.font        = `${Math.round(g.r*s*.55)}px JetBrains Mono`;
    c.fillText(g.label, g.x*s, (g.y + g.r + 5)*s);
  });

  // Spawn
  const sp  = _aeSpawn;
  const selS = _aeSel?.kind === 'spawn';
  c.save(); c.translate(sp.x*s, sp.y*s);
  c.fillStyle   = selS ? '#00d68f' : 'rgba(0,214,143,.65)';
  c.strokeStyle = selS ? '#00ffb3' : '#00d68f';
  c.lineWidth   = selS ? 2.5 : 1.5;
  c.beginPath(); c.moveTo(0,-9*s/2); c.lineTo(-5*s/2,5*s/2); c.lineTo(5*s/2,5*s/2); c.closePath();
  c.fill(); c.stroke();
  c.restore();

  // Curseur d'outil
  _aeCanvas.style.cursor =
    _aeTool === 'delete' ? 'crosshair' :
    _aeTool === 'select' ? (_aeDrag ? 'grabbing' : 'grab') : 'cell';
}

// ── Interaction souris ────────────────────────────────────
function _aeHitTest(px, py) {
  // Spawn
  if (Math.hypot(px - _aeSpawn.x, py - _aeSpawn.y) < 8) return { kind:'spawn', idx:-1 };
  // Goals (priorité : plus petits)
  for (let i = _aeGoals.length-1; i >= 0; i--) {
    const g = _aeGoals[i];
    if (Math.hypot(px - g.x, py - g.y) <= g.r + 3) return { kind:'goal', idx: i };
  }
  // Walls
  for (let i = _aeWalls.length-1; i >= 0; i--) {
    const w = _aeWalls[i];
    if (px >= w.x && px <= w.x+w.w && py >= w.y && py <= w.y+w.h) return { kind:'wall', idx: i };
  }
  return null;
}

function _aeMouseDown(e) {
  const { x, y } = _aePt(e);

  if (_aeTool === 'select') {
    const hit = _aeHitTest(x, y);
    _aeSel = hit;
    if (hit) {
      _aeDrag = true;
      if (hit.kind === 'wall') { const w = _aeWalls[hit.idx]; _aeDragOx = x - w.x; _aeDragOy = y - w.y; }
      if (hit.kind === 'goal') { const g = _aeGoals[hit.idx]; _aeDragOx = x - g.x; _aeDragOy = y - g.y; }
      if (hit.kind === 'spawn') { _aeDragOx = x - _aeSpawn.x; _aeDragOy = y - _aeSpawn.y; }
    }
    _aeRefreshProps();
    _aeRender();
    return;
  }

  if (_aeTool === 'delete') {
    const hit = _aeHitTest(x, y);
    if (!hit || hit.kind === 'spawn') return;
    if (hit.kind === 'wall') _aeWalls.splice(hit.idx, 1);
    if (hit.kind === 'goal') _aeGoals.splice(hit.idx, 1);
    _aeSel = null; _aeRefreshProps(); _aeRender();
    return;
  }

  if (_aeTool === 'wall') {
    _aeWalls.push({ x: Math.max(0, x-20), y: Math.max(0, y-8), w: 40, h: 15, label: `Bac ${_aeWalls.length+1}` });
    _aeSel = { kind:'wall', idx: _aeWalls.length-1 };
    _aeTool = 'select'; _aeSetToolBtn('select');
    _aeRefreshProps(); _aeRender(); return;
  }

  if (_aeTool === 'goal') {
    const pts = parseInt(document.getElementById('aeNewGoalPts').value) || 10;
    _aeGoals.push({ x, y, r: 12, pts, label: `Obj ${_aeGoals.length+1}`, color: '#22c55e', done: false });
    _aeSel = { kind:'goal', idx: _aeGoals.length-1 };
    _aeTool = 'select'; _aeSetToolBtn('select');
    _aeRefreshProps(); _aeRender(); return;
  }
}

function _aeMouseMove(e) {
  if (!_aeDrag || !_aeSel) return;
  const { x, y } = _aePt(e);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  if (_aeSel.kind === 'wall') {
    const w = _aeWalls[_aeSel.idx];
    w.x = clamp(x - _aeDragOx, 0, ARENA_W - w.w);
    w.y = clamp(y - _aeDragOy, 0, ARENA_H - w.h);
  }
  if (_aeSel.kind === 'goal') {
    const g = _aeGoals[_aeSel.idx];
    g.x = clamp(x - _aeDragOx, g.r, ARENA_W - g.r);
    g.y = clamp(y - _aeDragOy, g.r, ARENA_H - g.r);
  }
  if (_aeSel.kind === 'spawn') {
    _aeSpawn.x = clamp(x - _aeDragOx, 5, ARENA_W - 5);
    _aeSpawn.y = clamp(y - _aeDragOy, 5, ARENA_H - 5);
  }
  _aeRender();
}

function _aeMouseUp() { _aeDrag = false; _aeRefreshProps(); }

// ── Panneau propriétés ────────────────────────────────────
function _aeRefreshProps() {
  const el = document.getElementById('aeProps');
  if (!_aeSel) { el.innerHTML = '<div style="color:var(--muted);font-size:11px">Clique un élément pour le modifier</div>'; return; }

  if (_aeSel.kind === 'spawn') {
    el.innerHTML = `<div class="ae-prop-title">🤖 Spawn robot</div>
      <div class="ae-field"><label>X</label><input type="number" id="aeSpX" value="${_aeSpawn.x}" min="0" max="${ARENA_W}" onchange="_aeSpawn.x=+this.value;_aeRender()"></div>
      <div class="ae-field"><label>Y</label><input type="number" id="aeSpY" value="${_aeSpawn.y}" min="0" max="${ARENA_H}" onchange="_aeSpawn.y=+this.value;_aeRender()"></div>`;
    return;
  }

  if (_aeSel.kind === 'wall') {
    const w = _aeWalls[_aeSel.idx];
    el.innerHTML = `<div class="ae-prop-title">🟦 Mur — ${w.label}</div>
      <div class="ae-field"><label>Label</label><input type="text" value="${w.label}" oninput="_aeWalls[${_aeSel.idx}].label=this.value;_aeRender()"></div>
      <div class="ae-field"><label>X</label><input type="number" value="${w.x}" onchange="_aeWalls[${_aeSel.idx}].x=+this.value;_aeRender()"></div>
      <div class="ae-field"><label>Y</label><input type="number" value="${w.y}" onchange="_aeWalls[${_aeSel.idx}].y=+this.value;_aeRender()"></div>
      <div class="ae-field"><label>L</label><input type="number" value="${w.w}" min="5" onchange="_aeWalls[${_aeSel.idx}].w=+this.value;_aeRender()"></div>
      <div class="ae-field"><label>H</label><input type="number" value="${w.h}" min="5" onchange="_aeWalls[${_aeSel.idx}].h=+this.value;_aeRender()"></div>`;
    return;
  }

  if (_aeSel.kind === 'goal') {
    const g = _aeGoals[_aeSel.idx];
    el.innerHTML = `<div class="ae-prop-title">🎯 Objectif — ${g.label}</div>
      <div class="ae-field"><label>Label</label><input type="text" value="${g.label}" oninput="_aeGoals[${_aeSel.idx}].label=this.value;_aeRender()"></div>
      <div class="ae-field"><label>Pts</label><input type="number" value="${g.pts}" min="1" onchange="_aeGoals[${_aeSel.idx}].pts=+this.value;_aeRender()"></div>
      <div class="ae-field"><label>R</label><input type="number" value="${g.r}" min="5" max="40" onchange="_aeGoals[${_aeSel.idx}].r=+this.value;_aeRender()"></div>
      <div class="ae-field"><label>Couleur</label><input type="color" value="${g.color}" onchange="_aeGoals[${_aeSel.idx}].color=this.value;_aeRender()"></div>`;
  }
}

// ── Outils ────────────────────────────────────────────────
function _aeSetTool(t) {
  _aeTool = t; _aeSel = null;
  _aeSetToolBtn(t); _aeRefreshProps(); _aeRender();
}

function _aeSetToolBtn(t) {
  ['aeBtnSelect','aeBtnWall','aeBtnGoal','aeBtnDelete'].forEach(id => {
    document.getElementById(id)?.classList.remove('ae-active');
  });
  const map = { select:'aeBtnSelect', wall:'aeBtnWall', goal:'aeBtnGoal', delete:'aeBtnDelete' };
  document.getElementById(map[t])?.classList.add('ae-active');
}

// ── Appliquer à l'arène live ──────────────────────────────
function aeApply() {
  // Mute les arrays const de state.js
  WALLS.splice(0, WALLS.length, ..._aeWalls.map(w => ({ ...w })));
  GOALS.splice(0, GOALS.length, ..._aeGoals.map(g => ({ ...g, done: false })));
  S.x = _aeSpawn.x; S.y = _aeSpawn.y;
  S.vx = 0; S.vy = 0;
  // Remet le match à zéro si en cours
  if (S.matchRunning) {
    S.matchRunning = false; S.matchTime = 100; S.score = 0;
    termLog('[arena] Arène modifiée — match réinitialisé', 'warn');
  }
  MISSION_TASKS.forEach(t => t.done = false);
  termLog(`[arena] Arène appliquée : ${WALLS.length} murs, ${GOALS.length} objectifs`, 'info');
  rebuildArenaStatic();
  closeArenaEditor();
}

// ── Sauvegarde / Chargement ───────────────────────────────
function aeSave() {
  const name = prompt('Nom de cette configuration d\'arène :');
  if (!name || !name.trim()) return;
  const arenas = _aeGetArenas();
  const idx    = arenas.findIndex(a => a.name === name.trim());
  const entry  = {
    id:        idx >= 0 ? arenas[idx].id : Date.now().toString(36),
    name:      name.trim(),
    createdAt: idx >= 0 ? arenas[idx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    walls:     _aeWalls.map(w => ({ ...w })),
    goals:     _aeGoals.map(g => ({ ...g })),
    spawn:     { ..._aeSpawn },
  };
  if (idx >= 0) arenas[idx] = entry; else arenas.push(entry);
  _aeSetArenas(arenas);
  termLog(`[arena] Configuration "${name.trim()}" sauvegardée`, 'info');
  _aeRefreshSavedList();
}

function _aeLoad(id) {
  const arena = _aeGetArenas().find(a => a.id === id);
  if (!arena) return;
  _aeWalls  = arena.walls.map(w => ({ ...w }));
  _aeGoals  = arena.goals.map(g => ({ ...g, done: false }));
  _aeSpawn  = { ...arena.spawn };
  _aeSel    = null; _aeRefreshProps(); _aeRender();
  termLog(`[arena] Configuration "${arena.name}" chargée dans l'éditeur`, 'info');
}

function _aeDelete(id) {
  if (!confirm('Supprimer cette configuration ?')) return;
  _aeSetArenas(_aeGetArenas().filter(a => a.id !== id));
  _aeRefreshSavedList();
}

function _aeRefreshSavedList() {
  const el     = document.getElementById('aeSavedList');
  const arenas = _aeGetArenas();
  if (!arenas.length) { el.innerHTML = '<div style="font-size:10px;color:var(--muted)">Aucune config sauvegardée.</div>'; return; }
  el.innerHTML = arenas.map(a => `
    <div class="ae-saved-item">
      <span class="ae-saved-name">${a.name}</span>
      <button class="ae-saved-btn" onclick="_aeLoad('${a.id}')">Charger</button>
      <button class="ae-saved-btn ae-saved-del" onclick="_aeDelete('${a.id}')">✕</button>
    </div>`).join('');
}

// ── Reset aux valeurs d'origine ───────────────────────────
function aeReset() {
  if (!confirm('Remettre les valeurs par défaut ?')) return;
  _aeWalls = [
    { x:60,  y:20,  w:40, h:15, label:'Bac A' },
    { x:130, y:20,  w:40, h:15, label:'Bac B' },
    { x:200, y:20,  w:40, h:15, label:'Bac C' },
    { x:60,  y:165, w:40, h:15, label:'Bac D' },
    { x:130, y:165, w:40, h:15, label:'Bac E' },
    { x:200, y:165, w:40, h:15, label:'Bac F' },
    { x:140, y:80,  w:20, h:40, label:'Mur central' },
  ];
  _aeGoals = [
    { x:80,  y:60,  r:12, pts:10, label:'Plante 1',     color:'#22c55e', done:false },
    { x:220, y:60,  r:12, pts:10, label:'Plante 2',     color:'#22c55e', done:false },
    { x:80,  y:140, r:12, pts:10, label:'Plante 3',     color:'#22c55e', done:false },
    { x:220, y:140, r:12, pts:10, label:'Plante 4',     color:'#22c55e', done:false },
    { x:270, y:100, r:14, pts:25, label:'Garde-manger', color:'#f97316', done:false },
  ];
  _aeSpawn = { x:30, y:100 };
  _aeSel = null; _aeRefreshProps(); _aeRender();
}
