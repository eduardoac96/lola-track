import { useCallback, useSyncExternalStore } from 'react';
import type { OwnerFilter } from './select';

/**
 * "De quién" en Pendientes, recordado por dispositivo y hogar. Compartido con el botón +
 * para que lo capturado caiga con el dueño de la vista abierta.
 */
const key = (hid: string) => `lola:owner:${hid}`;
const listeners = new Set<() => void>();
const mem = new Map<string, OwnerFilter>();

function read(hid: string): OwnerFilter {
  const k = key(hid);
  const cached = mem.get(k);
  if (cached) return cached;
  let v: OwnerFilter = 'mix';
  try {
    v = (localStorage.getItem(k) as OwnerFilter | null) ?? 'mix';
  } catch {
    /* sin storage */
  }
  mem.set(k, v);
  return v;
}

export function useOwnerFilter(hid: string): [OwnerFilter, (f: OwnerFilter) => void] {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);
  const value = useSyncExternalStore(subscribe, () => read(hid));
  const set = useCallback(
    (f: OwnerFilter) => {
      mem.set(key(hid), f);
      try {
        localStorage.setItem(key(hid), f);
      } catch {
        /* solo en memoria */
      }
      listeners.forEach((l) => l());
    },
    [hid],
  );
  return [value, set];
}

/** Si el miembro guardado ya no está en el hogar, vuelve a "Casa y míos". */
export const resolveOwnerFilter = (f: OwnerFilter, memberIds: readonly string[]): OwnerFilter =>
  f === 'mix' || f === 'casa' || f === 'all' || memberIds.includes(f) ? f : 'mix';

/** Dueño para lo que se captura: la persona de la vista, o Casa en las vistas mixtas. */
export const captureOwnerId = (f: OwnerFilter): string | null =>
  f === 'mix' || f === 'casa' || f === 'all' ? null : f;
