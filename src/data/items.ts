import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';
import { keys, newId, removeFromList, restore, snapshot, upsertInList } from './cache';

export type Item = Tables<'items'>;
export type ItemType = Item['type'];
export type ItemPriority = Item['priority'];

export function useItems(hid: string) {
  return useQuery({
    queryKey: keys.items(hid),
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase()
        .from('items')
        .select('*')
        .eq('household_id', hid)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateItem(hid: string, userId: string) {
  const qc = useQueryClient();
  const key = keys.items(hid);
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'items'>, 'household_id'> & { id: string }) => {
      const { data, error } = await supabase()
        .from('items')
        .insert({ ...input, household_id: hid })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      const snap = await snapshot<Item[]>(qc, key);
      const now = new Date().toISOString();
      upsertInList<Item>(qc, key, {
        area: null,
        budget_movement_id: null,
        done_at: null,
        done_by: null,
        due_date: null,
        due_reminded_at: null,
        link_url: null,
        notes: null,
        photo_path: null,
        price_actual_cents: null,
        price_estimated_cents: null,
        sort_order: -Date.now(),
        priority: 'pronto',
        type: 'tarea',
        created_at: now,
        updated_at: now,
        created_by: userId,
        household_id: hid,
        ...input,
      } as Item);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => upsertInList(qc, key, row),
  });
}

export function useUpdateItem(hid: string) {
  const qc = useQueryClient();
  const key = keys.items(hid);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<'items'> }) => {
      const { data, error } = await supabase().from('items').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, patch }) => {
      const snap = await snapshot<Item[]>(qc, key);
      upsertInList(qc, key, { ...patch, id } as Item);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => upsertInList(qc, key, row),
  });
}

/** Fotos de pendientes borrados: se eliminan del Storage cuando ya no se puede deshacer. */
const pendingPhotoRemovals = new Map<string, number>();
export const UNDO_MS = 6000;

export function useDeleteItem(hid: string) {
  const qc = useQueryClient();
  const key = keys.items(hid);
  return useMutation({
    mutationFn: async (item: Item) => {
      const { error } = await supabase().from('items').delete().eq('id', item.id);
      if (error) throw error;
      const path = item.photo_path;
      if (path) {
        pendingPhotoRemovals.set(
          item.id,
          window.setTimeout(() => {
            pendingPhotoRemovals.delete(item.id);
            void supabase().storage.from('photos').remove([path]);
          }, UNDO_MS + 1000),
        );
      }
    },
    onMutate: async (item) => {
      const snap = await snapshot<Item[]>(qc, key);
      removeFromList(qc, key, item.id);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.balances(hid) });
      qc.invalidateQueries({ queryKey: keys.movements(hid) });
    },
  });
}

/** Deshacer: reinserta la fila tal cual (mismo id, fechas, foto y vínculo a presupuesto). */
export function useRestoreItem(hid: string) {
  const qc = useQueryClient();
  const key = keys.items(hid);
  return useMutation({
    mutationFn: async (item: Item) => {
      const timer = pendingPhotoRemovals.get(item.id);
      if (timer) {
        window.clearTimeout(timer);
        pendingPhotoRemovals.delete(item.id);
      }
      const { data, error } = await supabase().from('items').insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (item) => {
      upsertInList(qc, key, item);
    },
    onSuccess: (row) => upsertInList(qc, key, row),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.balances(hid) }),
  });
}

/** Completa vía RPC (atómico con el movimiento de presupuesto si aplica). */
export function useCompleteItem(hid: string, userId: string) {
  const qc = useQueryClient();
  const key = keys.items(hid);
  return useMutation({
    mutationFn: async (v: { id: string; actualCents?: number | null; budgetId?: string | null }) => {
      const { data, error } = await supabase().rpc('complete_item', {
        p_item: v.id,
        ...(v.actualCents != null ? { p_actual_cents: v.actualCents } : {}),
        ...(v.budgetId ? { p_budget: v.budgetId } : {}),
      });
      if (error) throw error;
      return data;
    },
    onMutate: async (v) => {
      const snap = await snapshot<Item[]>(qc, key);
      upsertInList(qc, key, { id: v.id, done_at: new Date().toISOString(), done_by: userId } as Item);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => {
      if (row) upsertInList(qc, key, row);
      qc.invalidateQueries({ queryKey: keys.balances(hid) });
      qc.invalidateQueries({ queryKey: keys.movements(hid) });
    },
  });
}

export function useReopenItem(hid: string) {
  const qc = useQueryClient();
  const key = keys.items(hid);
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase().rpc('reopen_item', { p_item: id });
      if (error) throw error;
      return data;
    },
    onMutate: async (id) => {
      const snap = await snapshot<Item[]>(qc, key);
      upsertInList(qc, key, { id, done_at: null, done_by: null, budget_movement_id: null } as Item);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => {
      if (row) upsertInList(qc, key, row);
      qc.invalidateQueries({ queryKey: keys.balances(hid) });
      qc.invalidateQueries({ queryKey: keys.movements(hid) });
    },
  });
}

export { newId };

/** Inserción en lote (checklist sugerido). Un solo request; Realtime lo propaga a la pareja. */
export function useBulkCreateItems(hid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Array<Omit<TablesInsert<'items'>, 'household_id'>>) => {
      if (rows.length === 0) return [] as Item[];
      const { data, error } = await supabase()
        .from('items')
        .insert(rows.map((r) => ({ ...r, id: r.id ?? newId(), household_id: hid })))
        .select();
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: (rows) => rows.forEach((r) => upsertInList(qc, keys.items(hid), r)),
  });
}
