import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';
import { keys, newId, removeFromList, restore, snapshot, upsertInList } from './cache';

/** Mis finanzas: todo filtrado por dueño. RLS ya lo garantiza; el filtro evita depender de ello en la cache. */
export type FinItem = Tables<'fin_items'>;
export type FinCheck = Tables<'fin_checks'>;
export type FinAccount = Tables<'fin_accounts'>;
export type FinKind = 'gasto' | 'deuda' | 'ahorro';

export function useFinItems(hid: string, uid: string) {
  return useQuery({
    queryKey: keys.finItems(hid, uid),
    queryFn: async (): Promise<FinItem[]> => {
      const { data, error } = await supabase()
        .from('fin_items')
        .select('*')
        .eq('household_id', hid)
        .eq('owner_id', uid)
        .order('sort_order')
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFinChecks(hid: string, uid: string) {
  return useQuery({
    queryKey: keys.finChecks(hid, uid),
    queryFn: async (): Promise<FinCheck[]> => {
      const { data, error } = await supabase()
        .from('fin_checks')
        .select('*')
        .eq('household_id', hid)
        .eq('owner_id', uid)
        .order('period', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFinAccounts(hid: string, uid: string) {
  return useQuery({
    queryKey: keys.finAccounts(hid, uid),
    queryFn: async (): Promise<FinAccount[]> => {
      const { data, error } = await supabase()
        .from('fin_accounts')
        .select('*')
        .eq('household_id', hid)
        .eq('owner_id', uid)
        .order('sort_order')
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Marca o desmarca una línea de quincena en un periodo. */
export function useToggleCheck(hid: string, uid: string) {
  const qc = useQueryClient();
  const key = keys.finChecks(hid, uid);
  return useMutation({
    mutationFn: async (v: { itemId: string; period: string; existing: FinCheck | undefined; id: string }) => {
      if (v.existing) {
        const { error } = await supabase().from('fin_checks').delete().eq('id', v.existing.id);
        if (error) throw error;
        return null;
      }
      const { data, error } = await supabase()
        .from('fin_checks')
        .insert({ id: v.id, household_id: hid, owner_id: uid, item_id: v.itemId, period: v.period })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (v) => {
      const snap = await snapshot<FinCheck[]>(qc, key);
      if (v.existing) removeFromList(qc, key, v.existing.id);
      else
        upsertInList<FinCheck>(qc, key, {
          id: v.id,
          household_id: hid,
          owner_id: uid,
          item_id: v.itemId,
          period: v.period,
          created_at: new Date().toISOString(),
        });
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => {
      if (row) upsertInList(qc, key, row);
    },
  });
}

export function useSaveFinItem(hid: string, uid: string) {
  const qc = useQueryClient();
  const key = keys.finItems(hid, uid);
  return useMutation({
    mutationFn: async (v: Partial<FinItem> & { id: string; isNew: boolean }) => {
      const { isNew, ...row } = v;
      const q = isNew
        ? supabase()
            .from('fin_items')
            .insert({
              id: row.id,
              household_id: hid,
              owner_id: uid,
              section: row.section ?? 'quincena',
              grp: row.grp ?? '15',
              name: row.name ?? '',
              amount_cents: row.amount_cents ?? 0,
              kind: row.kind ?? 'gasto',
              account_id: row.account_id ?? null,
              sort_order: row.sort_order ?? Date.now(),
            })
        : supabase()
            .from('fin_items')
            .update({
              name: row.name,
              amount_cents: row.amount_cents,
              kind: row.kind,
              grp: row.grp,
              account_id: row.account_id,
              done_at: row.done_at,
            })
            .eq('id', row.id);
      const { data, error } = await q.select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (v) => {
      const snap = await snapshot<FinItem[]>(qc, key);
      const { isNew, ...row } = v;
      const now = new Date().toISOString();
      if (isNew) {
        qc.setQueryData<FinItem[]>(key, (prev) =>
          prev
            ? [
                ...prev,
                {
                  household_id: hid,
                  owner_id: uid,
                  section: 'quincena',
                  grp: '15',
                  name: '',
                  amount_cents: 0,
                  kind: 'gasto',
                  sort_order: Date.now(),
                  account_id: null,
                  done_at: null,
                  created_at: now,
                  updated_at: now,
                  ...row,
                } as FinItem,
              ]
            : prev,
        );
      } else upsertInList(qc, key, row as FinItem);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => upsertInList(qc, key, row, false),
  });
}

export function useDeleteFinItem(hid: string, uid: string) {
  const qc = useQueryClient();
  const key = keys.finItems(hid, uid);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase().from('fin_items').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const snap = await snapshot<FinItem[]>(qc, key);
      removeFromList(qc, key, id);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.finChecks(hid, uid) }),
  });
}

export function useSaveAccount(hid: string, uid: string) {
  const qc = useQueryClient();
  const key = keys.finAccounts(hid, uid);
  return useMutation({
    mutationFn: async (v: Partial<FinAccount> & { id: string; isNew: boolean }) => {
      const { isNew, ...row } = v;
      const q = isNew
        ? supabase()
            .from('fin_accounts')
            .insert({
              id: row.id,
              household_id: hid,
              owner_id: uid,
              name: row.name ?? '',
              kind: row.kind ?? 'deuda',
              balance_cents: row.balance_cents ?? 0,
              target_cents: row.target_cents ?? null,
              sort_order: Date.now(),
            })
        : supabase()
            .from('fin_accounts')
            .update({ name: row.name, balance_cents: row.balance_cents, target_cents: row.target_cents })
            .eq('id', row.id);
      const { data, error } = await q.select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (v) => {
      const snap = await snapshot<FinAccount[]>(qc, key);
      const { isNew, ...row } = v;
      if (!isNew) upsertInList(qc, key, row as FinAccount);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => upsertInList(qc, key, row, false),
  });
}

export function useDeleteAccount(hid: string, uid: string) {
  const qc = useQueryClient();
  const key = keys.finAccounts(hid, uid);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase().from('fin_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const snap = await snapshot<FinAccount[]>(qc, key);
      removeFromList(qc, key, id);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
  });
}

export { newId };

// ───────────────────────── Movimientos: gastos sueltos y abonos/cargos a cuentas
export type FinMovement = Tables<'fin_movements'>;

export function useFinMovements(hid: string, uid: string) {
  return useQuery({
    queryKey: keys.finMovements(hid, uid),
    queryFn: async (): Promise<FinMovement[]> => {
      const { data, error } = await supabase()
        .from('fin_movements')
        .select('*')
        .eq('household_id', hid)
        .eq('owner_id', uid)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Gasto suelto (insert directo; RLS solo permite direction = 'gasto'). */
export function useAddGasto(hid: string, uid: string) {
  const qc = useQueryClient();
  const key = keys.finMovements(hid, uid);
  return useMutation({
    mutationFn: async (v: {
      id: string;
      amount_cents: number;
      concept: string | null;
      category: string | null;
      occurred_on: string;
    }) => {
      const { data, error } = await supabase()
        .from('fin_movements')
        .insert({ ...v, household_id: hid, owner_id: uid, direction: 'gasto', account_id: null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (v) => {
      const snap = await snapshot<FinMovement[]>(qc, key);
      qc.setQueryData<FinMovement[]>(key, (prev) =>
        prev
          ? [
              {
                ...v,
                household_id: hid,
                owner_id: uid,
                direction: 'gasto',
                account_id: null,
                item_id: null,
                period: null,
                created_at: new Date().toISOString(),
              },
              ...prev,
            ]
          : prev,
      );
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => upsertInList(qc, key, row, false),
  });
}

/** Borra un movimiento: gasto directo; abono/cargo por RPC para revertir el saldo. */
export function useDeleteMovement(hid: string, uid: string) {
  const qc = useQueryClient();
  const key = keys.finMovements(hid, uid);
  return useMutation({
    mutationFn: async (m: FinMovement) => {
      if (m.account_id) {
        const { data, error } = await supabase().rpc('fin_account_unmove', { p_movement: m.id });
        if (error) throw error;
        return data;
      }
      const { error } = await supabase().from('fin_movements').delete().eq('id', m.id);
      if (error) throw error;
      return null;
    },
    onMutate: async (m) => {
      const snap = await snapshot<FinMovement[]>(qc, key);
      removeFromList(qc, key, m.id);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (account) => {
      if (account) upsertInList(qc, keys.finAccounts(hid, uid), account, false);
    },
  });
}

/** Abono (deuda baja / meta sube) o cargo (al revés). Atómico vía RPC. */
export function useAccountMove(hid: string, uid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      account: FinAccount;
      direction: 'abono' | 'cargo';
      amount_cents: number;
      concept: string;
      occurred_on: string;
    }) => {
      const { data, error } = await supabase().rpc('fin_account_move', {
        p_id: v.id,
        p_account: v.account.id,
        p_direction: v.direction,
        p_amount_cents: v.amount_cents,
        p_concept: v.concept,
        p_occurred_on: v.occurred_on,
      });
      if (error) throw error;
      return data;
    },
    onMutate: async (v) => {
      const accKey = keys.finAccounts(hid, uid);
      const movKey = keys.finMovements(hid, uid);
      const snapA = await snapshot<FinAccount[]>(qc, accKey);
      const snapM = await snapshot<FinMovement[]>(qc, movKey);
      const delta = accountDelta(v.account.kind, v.direction, v.amount_cents);
      upsertInList<FinAccount>(qc, accKey, { ...v.account, balance_cents: v.account.balance_cents + delta });
      qc.setQueryData<FinMovement[]>(movKey, (prev) =>
        prev
          ? [
              {
                id: v.id,
                household_id: hid,
                owner_id: uid,
                account_id: v.account.id,
                direction: v.direction,
                amount_cents: v.amount_cents,
                concept: v.concept.trim() || null,
                category: null,
                item_id: null,
                period: null,
                occurred_on: v.occurred_on,
                created_at: new Date().toISOString(),
              },
              ...prev,
            ]
          : prev,
      );
      return [snapA, snapM] as const;
    },
    onError: (_e, _v, snaps) => {
      if (snaps) for (const s of snaps) restore(qc, s);
    },
    onSuccess: (account) => upsertInList(qc, keys.finAccounts(hid, uid), account, false),
  });
}

/** Efecto de un movimiento en el saldo: deuda baja con abono, meta sube con abono. */
export function accountDelta(kind: string, direction: 'abono' | 'cargo', amount: number): number {
  return (kind === 'deuda') === (direction === 'abono') ? -amount : amount;
}

// ───────────────────────── Marcar líneas (con abono automático si están ligadas a una cuenta)

/**
 * Marca o desmarca una línea vía RPC: quincena → fin_checks del periodo; extra → done_at.
 * Si la línea tiene cuenta, el RPC abona (o revierte) en la misma transacción.
 */
export function useToggleItem(hid: string, uid: string) {
  const qc = useQueryClient();
  const checksKey = keys.finChecks(hid, uid);
  const itemsKey = keys.finItems(hid, uid);
  return useMutation({
    mutationFn: async (v: { item: FinItem; period: string | null; existing: FinCheck | undefined; id: string }) => {
      const { error } = await supabase().rpc('fin_item_toggle', {
        p_item: v.item.id,
        p_period: v.item.section === 'quincena' ? v.period : null,
        p_check_id: v.id,
      });
      if (error) throw error;
    },
    onMutate: async (v) => {
      const snapC = await snapshot<FinCheck[]>(qc, checksKey);
      const snapI = await snapshot<FinItem[]>(qc, itemsKey);
      if (v.item.section === 'quincena' && v.period) {
        if (v.existing) removeFromList(qc, checksKey, v.existing.id);
        else
          upsertInList<FinCheck>(qc, checksKey, {
            id: v.id,
            household_id: hid,
            owner_id: uid,
            item_id: v.item.id,
            period: v.period,
            created_at: new Date().toISOString(),
          });
      } else {
        upsertInList<FinItem>(qc, itemsKey, { ...v.item, done_at: v.item.done_at ? null : new Date().toISOString() });
      }
      return [snapC, snapI] as const;
    },
    onError: (_e, _v, snaps) => {
      if (snaps) for (const s of snaps) restore(qc, s);
    },
    onSettled: (_d, _e, v) => {
      if (v.item.section === 'quincena') void qc.invalidateQueries({ queryKey: checksKey });
      else void qc.invalidateQueries({ queryKey: itemsKey });
      if (v.item.account_id) {
        void qc.invalidateQueries({ queryKey: keys.finAccounts(hid, uid) });
        void qc.invalidateQueries({ queryKey: keys.finMovements(hid, uid) });
      }
    },
  });
}

// ───────────────────────── Camino: hitos y saldo esperado por mes
export type FinPlanStep = Tables<'fin_plan_steps'>;
export type FinPlanPoint = Tables<'fin_plan_points'>;

export function useFinPlanSteps(hid: string, uid: string) {
  return useQuery({
    queryKey: keys.finPlanSteps(hid, uid),
    queryFn: async (): Promise<FinPlanStep[]> => {
      const { data, error } = await supabase()
        .from('fin_plan_steps')
        .select('*')
        .eq('household_id', hid)
        .eq('owner_id', uid)
        .order('sort_order')
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFinPlanPoints(hid: string, uid: string) {
  return useQuery({
    queryKey: keys.finPlanPoints(hid, uid),
    queryFn: async (): Promise<FinPlanPoint[]> => {
      const { data, error } = await supabase()
        .from('fin_plan_points')
        .select('*')
        .eq('household_id', hid)
        .eq('owner_id', uid)
        .order('month')
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Palomea a mano un hito sin cuenta (los que tienen cuenta se cumplen solos con el saldo). */
export function useToggleStep(hid: string, uid: string) {
  const qc = useQueryClient();
  const key = keys.finPlanSteps(hid, uid);
  return useMutation({
    mutationFn: async (s: FinPlanStep) => {
      const { data, error } = await supabase()
        .from('fin_plan_steps')
        .update({ done_at: s.done_at ? null : new Date().toISOString() })
        .eq('id', s.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (s) => {
      const snap = await snapshot<FinPlanStep[]>(qc, key);
      upsertInList<FinPlanStep>(qc, key, { ...s, done_at: s.done_at ? null : new Date().toISOString() });
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => upsertInList(qc, key, row, false),
  });
}
