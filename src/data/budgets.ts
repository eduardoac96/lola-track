import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';
import { keys, removeFromList, restore, snapshot, upsertInList } from './cache';

export type Movement = Tables<'budget_movements'>;

export interface Balance {
  budget_id: string;
  household_id: string;
  name: string;
  sort: number;
  archived: boolean;
  added_cents: number;
  spent_cents: number;
  available_cents: number;
}

export function useBalances(hid: string) {
  return useQuery({
    queryKey: keys.balances(hid),
    queryFn: async (): Promise<Balance[]> => {
      const { data, error } = await supabase()
        .from('budget_balances')
        .select('*')
        .eq('household_id', hid)
        .eq('archived', false)
        .order('sort');
      if (error) throw error;
      return (data ?? []).map((r) => ({
        budget_id: r.budget_id ?? '',
        household_id: r.household_id ?? hid,
        name: r.name ?? '',
        sort: r.sort ?? 0,
        archived: r.archived ?? false,
        added_cents: Number(r.added_cents ?? 0),
        spent_cents: Number(r.spent_cents ?? 0),
        available_cents: Number(r.available_cents ?? 0),
      }));
    },
  });
}

export function useMovements(hid: string) {
  return useQuery({
    queryKey: keys.movements(hid),
    queryFn: async (): Promise<Movement[]> => {
      const { data, error } = await supabase()
        .from('budget_movements')
        .select('*')
        .eq('household_id', hid)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Ajusta el saldo de una bolsa en cache (optimistic). */
function bumpBalance(qc: ReturnType<typeof useQueryClient>, hid: string, budgetId: string, delta: number) {
  qc.setQueryData<Balance[]>(keys.balances(hid), (prev) =>
    prev?.map((b) =>
      b.budget_id !== budgetId
        ? b
        : {
            ...b,
            available_cents: b.available_cents + delta,
            added_cents: b.added_cents + (delta > 0 ? delta : 0),
            spent_cents: b.spent_cents + (delta < 0 ? -delta : 0),
          },
    ),
  );
}

export function useAddMovement(hid: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    /** Re-insertar un movimiento borrado (deshacer) reutiliza su id y fecha. */
    mutationFn: async (m: {
      id: string;
      budget_id: string;
      amount_cents: number;
      concept: string | null;
      created_at?: string;
    }) => {
      const { data, error } = await supabase()
        .from('budget_movements')
        .insert({ ...m, household_id: hid })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (m) => {
      const a = await snapshot<Movement[]>(qc, keys.movements(hid));
      const b = await snapshot<Balance[]>(qc, keys.balances(hid));
      upsertInList<Movement>(qc, keys.movements(hid), {
        item_id: null,
        created_by: userId,
        created_at: new Date().toISOString(),
        household_id: hid,
        ...m,
      });
      bumpBalance(qc, hid, m.budget_id, m.amount_cents);
      return [a, b] as const;
    },
    onError: (_e, _v, snaps) => snaps?.forEach((s) => restore(qc, s)),
    onSuccess: (row) => upsertInList(qc, keys.movements(hid), row),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.balances(hid) }),
  });
}

export function useDeleteMovement(hid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Movement) => {
      const { error } = await supabase().from('budget_movements').delete().eq('id', m.id);
      if (error) throw error;
    },
    onMutate: async (m) => {
      const a = await snapshot<Movement[]>(qc, keys.movements(hid));
      const b = await snapshot<Balance[]>(qc, keys.balances(hid));
      removeFromList(qc, keys.movements(hid), m.id);
      bumpBalance(qc, hid, m.budget_id, -m.amount_cents);
      return [a, b] as const;
    },
    onError: (_e, _v, snaps) => snaps?.forEach((s) => restore(qc, s)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.balances(hid) });
      qc.invalidateQueries({ queryKey: keys.items(hid) });
    },
  });
}

export function useCreateBudget(hid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { name: string; initialCents: number }) => {
      const { data, error } = await supabase().rpc('create_budget', {
        p_household: hid,
        p_name: v.name,
        p_initial_cents: v.initialCents,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.balances(hid) });
      qc.invalidateQueries({ queryKey: keys.movements(hid) });
    },
  });
}

const LAST_BUDGET = 'lola:lastBudget';
export function getLastBudget(): string | null {
  try {
    return localStorage.getItem(LAST_BUDGET);
  } catch {
    return null;
  }
}
export function setLastBudget(id: string): void {
  try {
    localStorage.setItem(LAST_BUDGET, id);
  } catch {
    /* modo privado */
  }
}
