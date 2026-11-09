export const MILESTONES = [25, 50, 75, 100] as const;
export type Milestone = (typeof MILESTONES)[number];
/** Con menos pendientes un porcentaje no significa nada (1 de 2 = 50%). */
export const MIN_ITEMS_FOR_MILESTONES = 6;

export const MILESTONE_TEXT: Record<Milestone, { title: string; body: string }> = {
  25: { title: 'Un cuarto de la casa lista', body: 'Buen arranque. Sigan así.' },
  50: { title: 'Mitad del camino', body: 'La mitad de los pendientes ya está hecha.' },
  75: { title: 'Ya casi', body: 'Tres cuartas partes listas.' },
  100: { title: '¡Casa lista!', body: 'Todos los pendientes están hechos.' },
};

/** Hito más alto alcanzado con este avance (0 si ninguno). */
export function reachedMilestone(pct: number, total: number): Milestone | 0 {
  if (total < MIN_ITEMS_FOR_MILESTONES) return 0;
  let best: Milestone | 0 = 0;
  for (const m of MILESTONES) if (pct >= m) best = m;
  return best;
}

/** Hito que toca celebrar: uno nuevo por encima del ya visto. */
export function milestoneToCelebrate(pct: number, total: number, seen: number): Milestone | null {
  const r = reachedMilestone(pct, total);
  return r !== 0 && r > seen ? r : null;
}

export interface Snap {
  urgentPending: number;
  done: number;
}
/**
 * Celebrar "todo lo urgente" solo en la transición >0 → 0 por completar algo
 * (no al abrir la app con 0, ni al quitar la marca de urgente, ni al borrar).
 */
export function urgentCleared(prev: Snap | null, now: Snap): boolean {
  return prev != null && prev.urgentPending > 0 && now.urgentPending === 0 && now.done > prev.done;
}

const key = (hid: string) => `lola:milestone:${hid}`;
export function readSeen(hid: string): number | null {
  try {
    const v = localStorage.getItem(key(hid));
    return v == null ? null : Number(v) || 0;
  } catch {
    return null;
  }
}
export function writeSeen(hid: string, m: number): void {
  try {
    localStorage.setItem(key(hid), String(m));
  } catch {
    /* almacenamiento no disponible: se celebra de nuevo, sin daño */
  }
}
