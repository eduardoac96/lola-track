import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';
import { keys, newId, removeFromList, restore, snapshot, upsertInList } from './cache';

export type Wish = Tables<'wishes'>;
export type WishClaim = Tables<'wish_claims'>;
export type ClaimStatus = WishClaim['status'];

export function useWishes(hid: string) {
  return useQuery({
    queryKey: keys.wishes(hid),
    queryFn: async (): Promise<Wish[]> => {
      const { data, error } = await supabase()
        .from('wishes')
        .select('*')
        .eq('household_id', hid)
        .order('sort_order')
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Solo trae apartados de deseos ajenos: RLS nunca devuelve los de mis propios deseos. */
export function useWishClaims(hid: string) {
  return useQuery({
    queryKey: keys.claims(hid),
    queryFn: async (): Promise<WishClaim[]> => {
      const { data, error } = await supabase().from('wish_claims').select('*').eq('household_id', hid);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateWish(hid: string, userId: string) {
  const qc = useQueryClient();
  const key = keys.wishes(hid);
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'wishes'>, 'household_id' | 'owner_id'> & { id: string }) => {
      const { data, error } = await supabase()
        .from('wishes')
        .insert({ ...input, household_id: hid, owner_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      const snap = await snapshot<Wish[]>(qc, key);
      const now = new Date().toISOString();
      upsertInList<Wish>(qc, key, {
        household_id: hid,
        owner_id: userId,
        price_estimated_cents: null,
        link_url: null,
        notes: null,
        starred: false,
        got_at: null,
        sort_order: -Date.now(),
        created_at: now,
        updated_at: now,
        ...input,
      } as Wish);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => upsertInList(qc, key, row),
  });
}

export function useUpdateWish(hid: string) {
  const qc = useQueryClient();
  const key = keys.wishes(hid);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<'wishes'> }) => {
      const { data, error } = await supabase().from('wishes').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, patch }) => {
      const snap = await snapshot<Wish[]>(qc, key);
      upsertInList(qc, key, { ...patch, id } as Wish);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSuccess: (row) => upsertInList(qc, key, row),
  });
}

export function useDeleteWish(hid: string) {
  const qc = useQueryClient();
  const key = keys.wishes(hid);
  return useMutation({
    mutationFn: async (wish: Wish) => {
      const { error } = await supabase().from('wishes').delete().eq('id', wish.id);
      if (error) throw error;
    },
    onMutate: async (wish) => {
      const snap = await snapshot<Wish[]>(qc, key);
      removeFromList(qc, key, wish.id);
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
  });
}

/** Deshacer: reinserta el deseo tal cual (mismo id). Un apartado que tuviera no regresa (es de la otra persona). */
export function useRestoreWish(hid: string) {
  const qc = useQueryClient();
  const key = keys.wishes(hid);
  return useMutation({
    mutationFn: async (wish: Wish) => {
      const { data, error } = await supabase().from('wishes').insert(wish).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (wish) => upsertInList(qc, key, wish),
    onSuccess: (row) => upsertInList(qc, key, row),
  });
}

/** Aparta / marca comprado / libera (status null) el deseo de otra persona. */
export function useSetClaim(hid: string, userId: string) {
  const qc = useQueryClient();
  const key = keys.claims(hid);
  return useMutation({
    mutationFn: async ({ wishId, status }: { wishId: string; status: ClaimStatus | null }) => {
      const sb = supabase();
      if (status === null) {
        const { error } = await sb.from('wish_claims').delete().eq('wish_id', wishId);
        if (error) throw error;
        return;
      }
      const { error } = await sb
        .from('wish_claims')
        .upsert({ wish_id: wishId, household_id: hid, status, claimed_by: userId }, { onConflict: 'wish_id' });
      if (error) throw error;
    },
    onMutate: async ({ wishId, status }) => {
      const snap = await snapshot<WishClaim[]>(qc, key);
      const now = new Date().toISOString();
      qc.setQueryData<WishClaim[]>(key, (prev = []) => {
        const rest = prev.filter((c) => c.wish_id !== wishId);
        return status === null
          ? rest
          : [
              ...rest,
              {
                wish_id: wishId,
                household_id: hid,
                status,
                claimed_by: userId,
                created_at: now,
                updated_at: now,
              },
            ];
      });
      return snap;
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export { newId };
