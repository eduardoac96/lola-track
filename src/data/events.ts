import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';
import { keys, removeFromList, restore, snapshot, upsertInList } from './cache';
import { addDays, startOfDay } from '../lib/dates';

export type CalEvent = Tables<'events'>;

const byStart = (a: CalEvent, b: CalEvent) => a.starts_at.localeCompare(b.starts_at);

/** Eventos desde hace 7 días hacia adelante (la agenda mira al futuro). */
export function useEvents(hid: string) {
  return useQuery({
    queryKey: keys.events(hid),
    queryFn: async (): Promise<CalEvent[]> => {
      const from = addDays(startOfDay(new Date()), -7).toISOString();
      const { data, error } = await supabase()
        .from('events')
        .select('*')
        .eq('household_id', hid)
        .gte('starts_at', from)
        .order('starts_at')
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    select: (rows) => rows.slice().sort(byStart),
  });
}

export function useSaveEvent(hid: string, userId: string) {
  const qc = useQueryClient();
  const key = keys.events(hid);
  return useMutation({
    mutationFn: async (v: {
      id: string;
      isNew: boolean;
      values: Omit<TablesInsert<'events'>, 'household_id' | 'id'>;
    }) => {
      const sb = supabase();
      const q = v.isNew
        ? sb.from('events').insert({ ...v.values, id: v.id, household_id: hid })
        : sb
            .from('events')
            .update(v.values as TablesUpdate<'events'>)
            .eq('id', v.id);
      const { data, error } = await q.select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (v) => {
      const snap = await snapshot<CalEvent[]>(qc, key);
      const now = new Date().toISOString();
      upsertInList(qc, key, {
        ends_at: null,
        item_id: null,
        notes: null,
        place: null,
        remind_minutes: 60,
        reminded_at: null,
        created_at: now,
        updated_at: now,
        created_by: userId,
        household_id: hid,
        ...v.values,
        id: v.id,
      } as CalEvent);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => upsertInList(qc, key, row),
  });
}

export function useDeleteEvent(hid: string) {
  const qc = useQueryClient();
  const key = keys.events(hid);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase().from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const snap = await snapshot<CalEvent[]>(qc, key);
      removeFromList(qc, key, id);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
  });
}
