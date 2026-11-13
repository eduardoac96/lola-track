import { useCallback, useSyncExternalStore } from 'react';
import type { List } from '../../data/lists';
import type { ListFilter } from './select';

/**
 * Lista elegida en Pendientes. Compartida con el botón + (así lo que capturas cae en la lista abierta)
 * y recordada por dispositivo y hogar.
 */
const key = (hid: string) => `lola:list:${hid}`;
const listeners = new Set<() => void>();
const mem = new Map<string, ListFilter>();

function read(hid: string): ListFilter {
  const cached = mem.get(hid);
  if (cached) return cached;
  let v: ListFilter = 'all';
  try {
    v = (localStorage.getItem(key(hid)) as ListFilter | null) ?? 'all';
  } catch {
    /* sin storage */
  }
  mem.set(hid, v);
  return v;
}

export function useSelectedList(hid: string): [ListFilter, (f: ListFilter) => void] {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);
  const value = useSyncExternalStore(subscribe, () => read(hid));
  const set = useCallback(
    (f: ListFilter) => {
      mem.set(hid, f);
      try {
        localStorage.setItem(key(hid), f);
      } catch {
        /* sin storage: solo dura en memoria de esta vista */
      }
      listeners.forEach((l) => l());
    },
    [hid],
  );
  return [value, set];
}

/** Si la lista guardada ya no existe o está archivada, vuelve a "Todas". */
export function resolveListFilter(f: ListFilter, lists: readonly List[] | undefined): ListFilter {
  if (f === 'all' || f === 'general') return f;
  if (!lists) return f; // aún cargando
  return lists.some((l) => l.id === f && !l.archived_at) ? f : 'all';
}

/** Id de lista para capturar (null = General). */
export const captureListId = (f: ListFilter): string | null => (f === 'all' || f === 'general' ? null : f);
