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
  if (msg.includes('Token has expired') || msg.includes('invalid')) return 'Código incorrecto o expirado.';
  if (msg.includes('rate limit') || msg.includes('seconds')) return 'Espera unos segundos antes de pedir otro código.';
  if (msg.includes('Failed to fetch')) return 'Sin conexión. Intenta de nuevo.';
  return 'Algo salió mal. Intenta de nuevo.';
}
