import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Cliente único. Lanza si faltan variables, para fallar claro en dev. */
export function supabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase no configurado: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env');
  }
  client ??= createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return client;
}
