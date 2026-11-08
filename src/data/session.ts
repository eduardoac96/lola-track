import { useEffect, useState } from 'react';
import type { EmailOtpType, Session } from '@supabase/supabase-js';
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

export async function requestOtp(email: string): Promise<void> {
  const { error } = await supabase().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyOtp(email: string, token: string): Promise<void> {
  const { error } = await supabase().auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

/** Extrae token_hash y tipo de un link de correo de Supabase (…/auth/v1/verify?token=…&type=…). */
export function parseEmailLink(input: string): { tokenHash: string; type: EmailOtpType } | null {
  const m = input.trim().match(/https?:\/\/[^\s<>"']+/);
  if (!m) return null;
  try {
    const url = new URL(m[0]);
    const raw = url.searchParams.get('token') ?? url.searchParams.get('token_hash');
    if (!raw) return null;
    const t = url.searchParams.get('type');
    const type: EmailOtpType = t === 'signup' || t === 'magiclink' || t === 'invite' ? t : 'email';
    return { tokenHash: raw.replace(/^pkce_/, ''), type };
  } catch {
    return null;
  }
}

export async function verifyEmailLink(link: string): Promise<void> {
  const parsed = parseEmailLink(link);
  if (!parsed) throw new Error('invalid link');
  const { error } = await supabase().auth.verifyOtp({ token_hash: parsed.tokenHash, type: parsed.type });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase().auth.signOut();
}
