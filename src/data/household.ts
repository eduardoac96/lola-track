import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';
import { keys } from './cache';

export type Household = Tables<'households'>;
export type Member = Tables<'household_members'>;
export interface HouseholdData {
  household: Household;
  members: Member[];
}

export const MEMBER_COLORS = ['#5B47E0', '#F5A524', '#1E6B4A', '#D9472B'] as const;

export function useHousehold(userId: string | undefined) {
  return useQuery({
    queryKey: keys.household(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<HouseholdData | null> => {
      const sb = supabase();
      const { data: mine, error } = await sb
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId as string)
        .order('created_at')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!mine) return null;
      const [h, m] = await Promise.all([
        sb.from('households').select('*').eq('id', mine.household_id).single(),
        sb.from('household_members').select('*').eq('household_id', mine.household_id).order('created_at'),
      ]);
      if (h.error) throw h.error;
      if (m.error) throw m.error;
      return { household: h.data, members: m.data ?? [] };
    },
  });
}

export function useCreateHousehold(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { name: string; displayName: string }) => {
      const { data, error } = await supabase().rpc('create_household', {
        p_name: v.name,
        p_display_name: v.displayName,
        p_color: MEMBER_COLORS[0],
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.household(userId) }),
  });
}

export function useJoinHousehold(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { code: string; displayName: string }) => {
      const { data, error } = await supabase().rpc('join_household', {
        p_code: v.code,
        p_display_name: v.displayName,
        p_color: MEMBER_COLORS[1],
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.household(userId) }),
  });
}

/** Deja el hogar actual (si quedabas solo, se borra con sus datos) y entra al del código. */
export function useSwitchHousehold(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { code: string; displayName: string }) => {
      const { data, error } = await supabase().rpc('switch_household', {
        p_code: v.code,
        p_display_name: v.displayName,
        p_color: MEMBER_COLORS[1],
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'household' });
      return qc.invalidateQueries({ queryKey: keys.household(userId) });
    },
  });
}

export function useCreateInvite() {
  return useMutation({
    mutationFn: async (hid: string) => {
      const { data, error } = await supabase().rpc('create_invite', { p_household: hid });
      if (error) throw error;
      return data;
    },
  });
}

/** Errores de RPC → mensajes en español. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('invalid or expired code')) return 'El código no es válido o ya expiró.';
  if (msg.includes('household is full')) return 'Este hogar ya está completo.';
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('already registered') || msg.includes('already been registered'))
    return 'Ese correo ya tiene cuenta. Usa "Entrar".';
  if (msg.includes('Email not confirmed'))
    return 'La cuenta espera confirmación por correo. Hay que desactivar "Confirm email" en Supabase.';
  if (
    msg.includes('Signups not allowed') ||
    msg.includes('signups are disabled') ||
    msg.includes('Database error saving new user')
  )
    return 'El registro de cuentas nuevas está cerrado. Pide acceso a quien administra Lola.';
  if (msg.includes('Password should') || msg.includes('weak_password'))
    return 'La contraseña debe tener al menos 8 caracteres.';
  if (msg.includes('rate limit') || msg.includes('seconds')) return 'Demasiados intentos. Espera un momento.';
  if (msg.includes('Failed to fetch')) return 'Sin conexión. Intenta de nuevo.';
  return 'Algo salió mal. Intenta de nuevo.';
}
