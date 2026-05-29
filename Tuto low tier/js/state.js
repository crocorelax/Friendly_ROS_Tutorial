// ── Données de la carte (partagées éditeur ↔ jeu) ──
let mapData = {
  walls: new Set(),   // "col,row"
  goals: [],          // [{col,row,done}]
  spawn: {col:6, row:10}
};

// ── État global du jeu ──
let currentLevel = 0;
let running = false;
let stopFlag = false;
let bot = {x:0, y:0, a:0, pen:false, trail:[]};
let score = 0;

// ── Dérive (niveau 3) ──
let driftAngle = 0;
let driftAccum = 0;

// ── Références canvas (jeu) ──
let gCanvas, gCtx;
let gSZ, gGridW, gGridH;
let fogCanvas, fogCtx;
let lidarCanvas, lidarCtx;
let fogRevealed;

// ── Références canvas (éditeur) ──
let edCanvas, edCtx;
let edSZ, edGridW, edGridH;
let edTool = 'wall';
let edDrawing = false;

// ── État drag & drop ──
let dragType = null;
let dragVal  = null;
let dragMode = null;  // 'palette' | 'reorder'
let dragSrc  = null;
let currentDropTarget = null;

// ── Cache canvas statique (grille + murs + spawn) ──
let staticCanvas = null, staticCtx = null;

// ── Utilitaire ──
const sleep = ms => new Promise(r => setTimeout(r, ms));
