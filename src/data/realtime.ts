import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { keys, removeFromList, upsertInList } from './cache';

type Row = { id: string };

/**
 * Una suscripción por hogar. INSERT/UPDATE llegan filtradas por household_id;
 * DELETE no admite filtro en Realtime, así que se escucha aparte y se borra por id (idempotente).
 */
export function useRealtime(hid: string | undefined, userId: string | undefined): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!hid) return;
    const sb = supabase();
    const tables: Array<[string, QueryKey, QueryKey[]]> = [
      ['items', keys.items(hid), [keys.balances(hid)]],
      // Al borrar una lista, la DB mueve sus pendientes a General: refrescar items.
      ['lists', keys.lists(hid), [keys.items(hid)]],
      ['events', keys.events(hid), []],
      ['budget_movements', keys.movements(hid), [keys.balances(hid)]],
      ['budgets', keys.balances(hid), []],
      // Los apartados (wish_claims) no van por Realtime para no filtrar la sorpresa al dueño;
      // se refrescan cuando cambia un deseo, al volver a la app y al reconectar.
      ['wishes', keys.wishes(hid), [keys.claims(hid)]],
    ];

    const channel = sb.channel(`household:${hid}`);
    for (const [table, key, alsoInvalidate] of tables) {
      const onChange = (p: RealtimePostgresChangesPayload<Row>) => {
        if (table === 'budgets') {
          qc.invalidateQueries({ queryKey: key });
          return;
        }
        if (p.eventType === 'DELETE') {
          const id = (p.old as Partial<Row>).id;
          if (id) removeFromList(qc, key, id);
        } else {
          upsertInList(qc, key, p.new);
        }
        alsoInvalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      };
      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table, filter: `household_id=eq.${hid}` },
          onChange,
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table, filter: `household_id=eq.${hid}` },
          onChange,
        )
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, onChange);
    }
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${hid}` },
      () => qc.invalidateQueries({ queryKey: keys.household(userId) }),
    );
    channel.subscribe((status) => {
      // Al reconectar, refrescar todo por si hubo cambios mientras estábamos fuera.
      if (status === 'SUBSCRIBED') {
        tables.forEach(([, key]) => qc.invalidateQueries({ queryKey: key }));
        qc.invalidateQueries({ queryKey: keys.claims(hid) });
      }
    });

    return () => {
      sb.removeChannel(channel);
    };
  }, [hid, userId, qc]);
}
