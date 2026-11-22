import { useCallback, useSyncExternalStore } from 'react';
import type { List } from '../../data/lists';
import type { ListFilter } from './select';

/** Espacio de listas: Pendientes ('list') o Regalos ('gift'); cada uno recuerda su lista abierta. */
export type ListScope = 'list' | 'gift';

/**
 * Lista elegida en Pendientes (o en Regalos). Compartida con el botón + (así lo que capturas cae en la lista abierta)
 * y recordada por dispositivo y hogar.
 */
const key = (hid: string, scope: ListScope = 'list') => `lola:${scope}:${hid}`;
const listeners = new Set<() => void>();
const mem = new Map<string, ListFilter>();

function read(hid: string, scope: ListScope): ListFilter {
  const k = key(hid, scope);
  const cached = mem.get(k);
  if (cached) return cached;
  let v: ListFilter = 'all';
  try {
    v = (localStorage.getItem(k) as ListFilter | null) ?? 'all';
  } catch {
    /* sin storage */
  }
  mem.set(k, v);
  return v;
}

export function useSelectedList(hid: string, scope: ListScope = 'list'): [ListFilter, (f: ListFilter) => void] {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);
  const value = useSyncExternalStore(subscribe, () => read(hid, scope));
  const set = useCallback(
    (f: ListFilter) => {
      mem.set(key(hid, scope), f);
      try {
        localStorage.setItem(key(hid, scope), f);
      } catch {
        /* sin storage: solo dura en memoria de esta vista */
      }
      listeners.forEach((l) => l());
    },
    [hid, scope],
  );
  return [value, set];
}

/**
 * Si la lista guardada ya no existe, está archivada o es de otro espacio, vuelve al inicio:
 * "Todas" en Pendientes, la primera lista de regalos en Regalos.
 */
export function resolveListFilter(
  f: ListFilter,
  lists: readonly List[] | undefined,
  scope: ListScope = 'list',
): ListFilter {
  if (scope === 'list' && (f === 'all' || f === 'general')) return f;
  if (!lists) return f; // aún cargando
  const ok = lists.some((l) => l.id === f && !l.archived_at && l.is_gift === (scope === 'gift'));
  if (ok) return f;
  if (scope === 'list') return 'all';
  return lists.find((l) => l.is_gift && !l.archived_at)?.id ?? 'all';
}

/** Id de lista para capturar (null = General). */
export const captureListId = (f: ListFilter): string | null => (f === 'all' || f === 'general' ? null : f);
