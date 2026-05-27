// ════════════════════════════════════════════════════════════
// PERSISTENCE — sauvegarde/chargement maps & scripts
// Dépend de : storage.js, auth.js
// API stable : remplacer les corps par des appels REST pour migrer vers DB
// ════════════════════════════════════════════════════════════

const Persistence = (() => {
  const _uid    = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const _user   = () => { const s = Auth.getSession(); return s ? s.username.toLowerCase() : null; };
  const _isAdmin = () => Auth.isAdmin();

  // ══ MAPS ══════════════════════════════════════════════════

  function saveMap(name, rawMapData) {
    const user = _user();
    if (!user) return null;
    const maps = Storage.getMaps(user);
    const idx  = maps.findIndex(m => m.name === name);
    const entry = {
      id:        idx >= 0 ? maps[idx].id : _uid(),
      name:      name.trim(),
      createdBy: user,
      createdAt: idx >= 0 ? maps[idx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        walls: [...rawMapData.walls],
        goals: rawMapData.goals.map(g => ({ col: g.col, row: g.row })),
        spawn: { col: rawMapData.spawn.col, row: rawMapData.spawn.row },
      },
    };
    if (idx >= 0) maps[idx] = entry; else maps.push(entry);
    Storage.setMaps(user, maps);
    return entry;
  }

  function getUserMaps() {
    const user = _user();
    return user ? Storage.getMaps(user) : [];
  }

  function getAllMaps() {
    return Object.keys(Storage.getUsers()).flatMap(u =>
      Storage.getMaps(u).map(m => ({ ...m, owner: u }))
    );
  }

  function deleteMap(id, owner) {
    const target = (owner || _user() || '').toLowerCase();
    if (!target) return;
    Storage.setMaps(target, Storage.getMaps(target).filter(m => m.id !== id));
  }

  // ══ SCRIPTS LOW TIER (blocs) ═══════════════════════════════

  function saveScript(name, level, blocks) {
    const user = _user();
    if (!user) return null;
    const scripts = Storage.getScripts(user);
    const idx = scripts.findIndex(s => s.name === name && s.tier === 'low');
    const entry = {
      id:        idx >= 0 ? scripts[idx].id : _uid(),
      name:      name.trim(),
      tier:      'low',
      level,
      createdBy: user,
      createdAt: idx >= 0 ? scripts[idx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocks,
    };
    if (idx >= 0) scripts[idx] = entry; else scripts.push(entry);
    Storage.setScripts(user, scripts);
    return entry;
  }

  function getUserScripts(tier) {
    const user = _user();
    if (!user) return [];
    const all = Storage.getScripts(user);
    return tier ? all.filter(s => s.tier === tier) : all;
  }

  function getAllScripts(tier) {
    return Object.keys(Storage.getUsers()).flatMap(u =>
      Storage.getScripts(u)
        .filter(s => !tier || s.tier === tier)
        .map(s => ({ ...s, owner: u }))
    );
  }

  function deleteScript(id, owner) {
    const target = (owner || _user() || '').toLowerCase();
    if (!target) return;
    Storage.setScripts(target, Storage.getScripts(target).filter(s => s.id !== id));
  }

  // ══ SCRIPTS HIGH TIER (code texte) ════════════════════════

  function saveHighScript(name, code) {
    const user = _user();
    if (!user) return null;
    const scripts = Storage.getScripts(user);
    const idx = scripts.findIndex(s => s.name === name && s.tier === 'high');
    const entry = {
      id:        idx >= 0 ? scripts[idx].id : _uid(),
      name:      name.trim(),
      tier:      'high',
      createdBy: user,
      createdAt: idx >= 0 ? scripts[idx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      code,
    };
    if (idx >= 0) scripts[idx] = entry; else scripts.push(entry);
    Storage.setScripts(user, scripts);
    return entry;
  }

  return {
    saveMap, getUserMaps, getAllMaps, deleteMap,
    saveScript, getUserScripts, getAllScripts, deleteScript,
    saveHighScript,
  };
})();
