// ════════════════════════════════════════════════════════════
// CLIENT SUPABASE — Initialisation globale
//
// ⚠️  AVANT DE COMMENCER : remplace les deux valeurs ci-dessous
//     Supabase dashboard → Settings → API
// ════════════════════════════════════════════════════════════

const SUPABASE_URL      = 'https://azzzgmuxkxhixnrhzxnp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_G2vGBu2IjcjNk8RmnI1_NQ_sCNuuBeu';

// Le CDN UMD expose window.supabase = { createClient, ... }
// On remplace par l'instance client — tous les scripts utilisent window.supabase
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:   true,
    autoRefreshToken: true,
    storageKey:       'bipboup_sb',   // clé interne SDK (ne pas toucher)
  },
});
