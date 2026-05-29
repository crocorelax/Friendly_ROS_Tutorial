// ════════════════════════════════════════════════════════════
// CLIENT SUPABASE — Initialisation globale
//
// ⚠️  AVANT DE COMMENCER : remplace les deux valeurs ci-dessous
//     Supabase dashboard → Settings → API
// ════════════════════════════════════════════════════════════

const SUPABASE_URL      = 'https://azzzgmuxkxhixnrhzxnp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6enpnbXV4a3hoaXhucmh6eG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMzg3MzcsImV4cCI6MjA5NTYxNDczN30.TT19K7g4dUVha3iiuKQIBiggsmKHoOew7oySCIdGKpg';

// Le CDN UMD expose window.supabase = { createClient, ... }
// On remplace par l'instance client — tous les scripts utilisent window.supabase
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:   true,
    autoRefreshToken: true,
    storageKey:       'bipboup_sb',   // clé interne SDK (ne pas toucher)
  },
});
