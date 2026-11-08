import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(url && anonKey);

let client: SupabaseClient<Database> | null = null;

/** Cliente único. Lanza si faltan variables, para fallar claro en dev. */
export function supabase(): SupabaseClient<Database> {
  if (!url || !anonKey) {
    throw new Error('Supabase no configurado: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (.env)');
  }
  client ??= createClient<Database>(url, anonKey, {
    // implicit: el link del correo trae token_hash utilizable desde cualquier navegador (PWA de iOS incluida).
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return client;
}
