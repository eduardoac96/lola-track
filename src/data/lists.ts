import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Tables, TablesUpdate } from '../lib/database.types';
import { keys, newId, removeFromList, restore, snapshot, upsertInList } from './cache';

/** Lista de pendientes ("Posada", "Mandado"). Los pendientes sin lista están en "General". */
export type List = Tables<'lists'>;

export function useLists(hid: string) {
  return useQuery({
    queryKey: keys.lists(hid),
    queryFn: async (): Promise<List[]> => {
      const { data, error } = await supabase()
        .from('lists')
        .select('*')
        .eq('household_id', hid)
        .order('sort_order')
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateList(hid: string, userId: string) {
  const qc = useQueryClient();
  const key = keys.lists(hid);
  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { data, error } = await supabase()
        .from('lists')
        .insert({ ...input, household_id: hid })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      const snap = await snapshot<List[]>(qc, key);
      const now = new Date().toISOString();
      upsertInList<List>(
        qc,
        key,
        {
          ...input,
          household_id: hid,
          archived_at: null,
          created_by: userId,
          created_at: now,
          updated_at: now,
          sort_order: Date.now(),
        },
        false,
      );
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => upsertInList(qc, key, row, false),
  });
}

/** Renombrar, archivar (archived_at = ahora) o restaurar (archived_at = null). */
export function useUpdateList(hid: string) {
  const qc = useQueryClient();
  const key = keys.lists(hid);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<'lists'> }) => {
      const { data, error } = await supabase().from('lists').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, patch }) => {
      const snap = await snapshot<List[]>(qc, key);
      upsertInList(qc, key, { ...patch, id } as List);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => upsertInList(qc, key, row),
  });
}

/** Borra la lista; la DB pasa sus pendientes a General (FK on delete set null). */
export function useDeleteList(hid: string) {
  const qc = useQueryClient();
  const key = keys.lists(hid);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase().from('lists').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const snap = await snapshot<List[]>(qc, key);
      removeFromList(qc, key, id);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.items(hid) }),
  });
}

export { newId };
