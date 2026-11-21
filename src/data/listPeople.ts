import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';
import { keys, newId, removeFromList, restore, snapshot, upsertInList } from './cache';

/** Persona de una lista de regalos con tope opcional (centavos). */
export type ListPerson = Tables<'list_people'>;

export function useListPeople(hid: string) {
  return useQuery({
    queryKey: keys.listPeople(hid),
    queryFn: async (): Promise<ListPerson[]> => {
      const { data, error } = await supabase()
        .from('list_people')
        .select('*')
        .eq('household_id', hid)
        .order('name')
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Crea (sin id) o actualiza (con id) una persona. */
export function useSavePerson(hid: string) {
  const qc = useQueryClient();
  const key = keys.listPeople(hid);
  return useMutation({
    mutationFn: async (v: { id?: string; list_id: string; name: string; cap_cents: number | null }) => {
      const row = { ...v, id: v.id ?? newId(), household_id: hid };
      const { data, error } = await supabase().from('list_people').upsert(row).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (v) => {
      const snap = await snapshot<ListPerson[]>(qc, key);
      if (v.id) upsertInList(qc, key, { ...v, id: v.id } as ListPerson);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => upsertInList(qc, key, row, false),
  });
}

export function useDeletePerson(hid: string) {
  const qc = useQueryClient();
  const key = keys.listPeople(hid);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase().from('list_people').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const snap = await snapshot<ListPerson[]>(qc, key);
      removeFromList(qc, key, id);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
  });
}
