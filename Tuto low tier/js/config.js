// ── Constantes globales ──
const CELL = 40;
const LIDAR_RAYS = 72;
const LIDAR_RANGE = 8;

// ── Mapping type → classe CSS palette ──
const clsMap = {
  move:'pm', move_to_wall:'pm',
  turn:'pt', face_dir:'pt', scan_360:'pt',
  wait:'pw',
  repeat:'pl',
  pen:'pp',
  fix_cap:'pf', fix_drift:'pf',
  if_obstacle:'pi', stop_obstacle:'ps', turn_to_open:'psen',
};

// ── Icônes ──
const icoMap = {
  move:'⬆', move_to_wall:'⬆⬜',
  turn:'↻', face_dir:'🧭', scan_360:'🔄',
  wait:'⏱', repeat:'🔁',
  pen:'✏️',
  fix_cap:'🧭', fix_drift:'⚖️',
  if_obstacle:'🚧', stop_obstacle:'🛑', turn_to_open:'🔍',
};

// ── Labels ──
const lblMap = {
  move:'Avancer', move_to_wall:'→ Mur (auto)',
  turn:'Tourner', face_dir:'Orienter', scan_360:'Scan 360°',
  wait:'Attendre', repeat:'Répéter',
  pen:'Stylo',
  fix_cap:'Corriger cap', fix_drift:'Réduire dérive',
  if_obstacle:'Si obstacle', stop_obstacle:'Stop si obstacle', turn_to_open:'→ Voie libre',
};

// ── Suffixes ──
const sufMap = {
  move:' case(s)', move_to_wall:'',
  turn:'°', face_dir:'°', scan_360:'',
  wait:' ms', repeat:'×',
  pen:'',
  fix_cap:'°', fix_drift:'',
  if_obstacle:'°', stop_obstacle:'', turn_to_open:'°',
};

// ── Valeurs par défaut ──
const defVal = {
  move:2, move_to_wall:0,
  turn:90, face_dir:0, scan_360:0,
  wait:400, repeat:3,
  pen:1,
  fix_cap:0, fix_drift:0,
  if_obstacle:90, stop_obstacle:0, turn_to_open:90,
};

// ── Styles inline pour le ghost de drag ──
const styleMap = {
  move:         'background:#1e3a8a;border-color:#3b82f6;color:#93c5fd',
  move_to_wall: 'background:#1e3a8a;border-color:#3b82f6;color:#93c5fd',
  turn:         'background:#581c87;border-color:#a855f7;color:#d8b4fe',
  face_dir:     'background:#581c87;border-color:#a855f7;color:#d8b4fe',
  scan_360:     'background:#581c87;border-color:#a855f7;color:#d8b4fe',
  wait:         'background:#7c2d12;border-color:#f97316;color:#fed7aa',
  repeat:       'background:#164e63;border-color:#06b6d4;color:#a5f3fc',
  pen:          'background:#14532d;border-color:#22c55e;color:#bbf7d0',
  fix_cap:      'background:#3b1f6e;border-color:#c084fc;color:#e9d5ff',
  fix_drift:    'background:#3b1f6e;border-color:#c084fc;color:#e9d5ff',
  if_obstacle:  'background:#4a2008;border-color:#fb923c;color:#fed7aa',
  stop_obstacle:'background:#450a0a;border-color:#ef4444;color:#fca5a5',
  turn_to_open: 'background:#0c1a2e;border-color:#0ea5e9;color:#7dd3fc',
};
