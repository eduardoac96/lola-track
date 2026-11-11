import type { QueryClient, QueryKey } from '@tanstack/react-query';

type WithId = { id: string };

export const keys = {
  household: (userId: string | undefined) => ['household', userId] as const,
  items: (hid: string) => ['items', hid] as const,
  events: (hid: string) => ['events', hid] as const,
  balances: (hid: string) => ['balances', hid] as const,
  movements: (hid: string) => ['movements', hid] as const,
  photo: (path: string) => ['photo', path] as const,
  wishes: (hid: string) => ['wishes', hid] as const,
  claims: (hid: string) => ['wish_claims', hid] as const,
};

/** Inserta o reemplaza por id (dedupe para ecos de Realtime y optimistic updates). */
export function upsertInList<T extends WithId>(qc: QueryClient, key: QueryKey, row: T, prepend = true): void {
  qc.setQueryData<T[]>(key, (prev) => {
    if (!prev) return prev;
    const i = prev.findIndex((r) => r.id === row.id);
    if (i === -1) return prepend ? [row, ...prev] : [...prev, row];
    const next = prev.slice();
    next[i] = { ...prev[i], ...row };
    return next;
  });
}

export function removeFromList<T extends WithId>(qc: QueryClient, key: QueryKey, id: string): void {
  qc.setQueryData<T[]>(key, (prev) => prev?.filter((r) => r.id !== id));
}

/** Snapshot para rollback en onError. */
export async function snapshot<T>(qc: QueryClient, key: QueryKey): Promise<{ key: QueryKey; prev: T | undefined }> {
  await qc.cancelQueries({ queryKey: key });
  return { key, prev: qc.getQueryData<T>(key) };
}

export function restore(qc: QueryClient, snap: { key: QueryKey; prev: unknown } | undefined): void {
  if (snap) qc.setQueryData(snap.key, snap.prev);
}

/** UUID v4 en cliente: el id viaja en el insert, así el eco de Realtime se deduplica solo. */
export const newId = (): string => crypto.randomUUID();
