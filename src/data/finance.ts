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
              sort_order: row.sort_order ?? Date.now(),
            })
        : supabase()
            .from('fin_items')
            .update({
              name: row.name,
              amount_cents: row.amount_cents,
              kind: row.kind,
              grp: row.grp,
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
