import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/** undefined = cargando · null = sin sesión */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const sb = supabase();
    let alive = true;
    sb.auth.getSession().then(({ data }) => alive && setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return session;
}

export const MIN_PASSWORD = 8;

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Crea la cuenta. Con "Confirm email" desactivado en Supabase, deja la sesión iniciada al instante. */
export async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase().auth.signUp({ email, password });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function changePassword(password: string): Promise<void> {
  const { error } = await supabase().auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  void import('../lib/badge').then((b) => b.setBadge(0));
  await supabase().auth.signOut();
}
