// ════════════════════════════════════════════════════════════
// PERSISTENCE — sauvegarde/chargement maps & scripts (Supabase)
// Dépend de : supabase-client.js, auth.js
// Toutes les fonctions sont async (retournent des Promises).
// ════════════════════════════════════════════════════════════

const Persistence = (() => {
  const _uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const _uname = () => Auth.getCurrentUser()?.username || null;

  async function _sess() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  // ══ MAPS ══════════════════════════════════════════════════

  async function saveMap(name, rawMapData) {
    const sess = await _sess();
    if (!sess) return null;

    const payload = {
      walls: [...rawMapData.walls],
      goals: rawMapData.goals.map(g => ({ col: g.col, row: g.row })),
      spawn: { col: rawMapData.spawn.col, row: rawMapData.spawn.row },
    };

    // Vérifie si une map du même nom existe déjà pour cet utilisateur
    const { data: existing } = await supabase
      .from('maps')
      .select('id, created_at')
      .eq('user_id', sess.user.id)
      .eq('name', name.trim())
      .maybeSingle();

    const entry = {
      id:         existing?.id || _uid(),
      name:       name.trim(),
      user_id:    sess.user.id,
      username:   _uname(),
      data:       payload,
      updated_at: new Date().toISOString(),
      ...(existing ? {} : { created_at: new Date().toISOString() }),
    };

    const { error } = existing
      ? await supabase.from('maps').update(entry).eq('id', existing.id)
      : await supabase.from('maps').insert(entry);

    return error ? null : entry;
  }

  async function getUserMaps() {
    const sess = await _sess();
    if (!sess) return [];
    const { data } = await supabase
      .from('maps')
      .select('*')
      .eq('user_id', sess.user.id)
      .order('updated_at', { ascending: false });
    return data || [];
  }

  async function getAllMaps() {
    const { data } = await supabase
      .from('maps')
      .select('*')
      .order('updated_at', { ascending: false });
    return data || [];
  }

  async function deleteMap(id) {
    await supabase.from('maps').delete().eq('id', id);
  }

  // ══ SCRIPTS LOW TIER (blocs) ═══════════════════════════════

  async function saveScript(name, level, blocks) {
    const sess = await _sess();
    if (!sess) return null;

    const { data: existing } = await supabase
      .from('scripts')
      .select('id, created_at')
      .eq('user_id', sess.user.id)
      .eq('name', name.trim())
      .eq('tier', 'low')
      .maybeSingle();

    const entry = {
      id:         existing?.id || _uid(),
      name:       name.trim(),
      tier:       'low',
      level,
      user_id:    sess.user.id,
      username:   _uname(),
      blocks,
      updated_at: new Date().toISOString(),
      ...(existing ? {} : { created_at: new Date().toISOString() }),
    };

    const { error } = existing
      ? await supabase.from('scripts').update(entry).eq('id', existing.id)
      : await supabase.from('scripts').insert(entry);

    return error ? null : entry;
  }

  async function getUserScripts(tier) {
    const sess = await _sess();
    if (!sess) return [];
    let q = supabase.from('scripts').select('*').eq('user_id', sess.user.id);
    if (tier) q = q.eq('tier', tier);
    const { data } = await q.order('updated_at', { ascending: false });
    return data || [];
  }

  async function getAllScripts(tier) {
    let q = supabase.from('scripts').select('*');
    if (tier) q = q.eq('tier', tier);
    const { data } = await q.order('updated_at', { ascending: false });
    return data || [];
  }

  async function deleteScript(id) {
    await supabase.from('scripts').delete().eq('id', id);
  }

  // ══ SCRIPTS HIGH TIER (code texte) ════════════════════════

  async function saveHighScript(name, code) {
    const sess = await _sess();
    if (!sess) return null;

    const { data: existing } = await supabase
      .from('scripts')
      .select('id, created_at')
      .eq('user_id', sess.user.id)
      .eq('name', name.trim())
      .eq('tier', 'high')
      .maybeSingle();

    const entry = {
      id:         existing?.id || _uid(),
      name:       name.trim(),
      tier:       'high',
      user_id:    sess.user.id,
      username:   _uname(),
      code,
      updated_at: new Date().toISOString(),
      ...(existing ? {} : { created_at: new Date().toISOString() }),
    };

    const { error } = existing
      ? await supabase.from('scripts').update(entry).eq('id', existing.id)
      : await supabase.from('scripts').insert(entry);

    return error ? null : entry;
  }

  return {
    saveMap, getUserMaps, getAllMaps, deleteMap,
    saveScript, getUserScripts, getAllScripts, deleteScript,
    saveHighScript,
  };
})();
