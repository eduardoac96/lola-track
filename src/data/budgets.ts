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

/** Aplica (sign=1) o revierte (sign=-1) un movimiento en el saldo y totales de su bolsa (optimistic). */
export function applyMovement(b: Balance, amountCents: number, sign: 1 | -1): Balance {
  return {
    ...b,
    available_cents: b.available_cents + sign * amountCents,
    added_cents: b.added_cents + (amountCents > 0 ? sign * amountCents : 0),
    spent_cents: b.spent_cents + (amountCents < 0 ? sign * -amountCents : 0),
  };
}

function bumpBalance(
  qc: ReturnType<typeof useQueryClient>,
  hid: string,
  budgetId: string,
  amountCents: number,
  sign: 1 | -1,
) {
  qc.setQueryData<Balance[]>(keys.balances(hid), (prev) =>
    prev?.map((b) => (b.budget_id === budgetId ? applyMovement(b, amountCents, sign) : b)),
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
      bumpBalance(qc, hid, m.budget_id, m.amount_cents, 1);
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
      bumpBalance(qc, hid, m.budget_id, m.amount_cents, -1);
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

export function useRenameBudget(hid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; name: string }) => {
      const { error } = await supabase().from('budgets').update({ name: v.name }).eq('id', v.id);
      if (error) throw error;
    },
    onMutate: async (v) => {
      const snap = await snapshot<Balance[]>(qc, keys.balances(hid));
      qc.setQueryData<Balance[]>(keys.balances(hid), (prev) =>
        prev?.map((b) => (b.budget_id === v.id ? { ...b, name: v.name } : b)),
      );
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.balances(hid) }),
  });
}

/** Borra la bolsa y (en cascada) sus movimientos. Los pendientes vinculados quedan sin vínculo. */
export function useDeleteBudget(hid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase().from('budgets').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const a = await snapshot<Balance[]>(qc, keys.balances(hid));
      const b = await snapshot<Movement[]>(qc, keys.movements(hid));
      qc.setQueryData<Balance[]>(keys.balances(hid), (prev) => prev?.filter((x) => x.budget_id !== id));
      qc.setQueryData<Movement[]>(keys.movements(hid), (prev) => prev?.filter((m) => m.budget_id !== id));
      return [a, b] as const;
    },
    onError: (_e, _v, snaps) => snaps?.forEach((s) => restore(qc, s)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.balances(hid) });
      qc.invalidateQueries({ queryKey: keys.movements(hid) });
      qc.invalidateQueries({ queryKey: keys.items(hid) });
    },
  });
}

export function useUpdateMovement(hid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; amount_cents: number; concept: string | null }) => {
      const { data, error } = await supabase()
        .from('budget_movements')
        .update({ amount_cents: v.amount_cents, concept: v.concept })
        .eq('id', v.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (v) => {
      const a = await snapshot<Movement[]>(qc, keys.movements(hid));
      const b = await snapshot<Balance[]>(qc, keys.balances(hid));
      const old = a.prev?.find((m) => m.id === v.id);
      upsertInList(qc, keys.movements(hid), v as Movement);
      if (old) {
        // revertir el monto anterior y aplicar el nuevo (saldo y totales correctos aunque cambie de signo)
        bumpBalance(qc, hid, old.budget_id, old.amount_cents, -1);
        bumpBalance(qc, hid, old.budget_id, v.amount_cents, 1);
      }
      return [a, b] as const;
    },
    onError: (_e, _v, snaps) => snaps?.forEach((s) => restore(qc, s)),
    onSuccess: (row) => upsertInList(qc, keys.movements(hid), row),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.balances(hid) }),
  });
}
