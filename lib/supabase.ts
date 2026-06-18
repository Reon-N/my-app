import { createClient } from '@supabase/supabase-js';

// Server-side only — uses non-public env vars injected at runtime by Vercel
export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  return createClient(url, key);
}
