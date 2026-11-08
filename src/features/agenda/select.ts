import type { CalEvent } from '../../data/events';
import { addDays, isSameDay, startOfDay } from '../../lib/dates';

export const REMIND_OPTIONS: ReadonlyArray<{ value: number | null; label: string }> = [
  { value: null, label: 'Sin aviso' },
  { value: 15, label: '15 min antes' },
  { value: 60, label: '1 h antes' },
  { value: 1440, label: '1 día antes' },
];

export const DURATION_OPTIONS: ReadonlyArray<{ value: number | null; label: string }> = [
  { value: null, label: 'Sin duración' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
  { value: 120, label: '2 h' },
  { value: 240, label: '4 h' },
];

/** 7 días a partir de `from` (inicio del día). */
export function weekFrom(from: Date): Date[] {
  const s = startOfDay(from);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

export function eventsOn(events: readonly CalEvent[], day: Date): CalEvent[] {
  return events.filter((e) => isSameDay(new Date(e.starts_at), day));
}

/** Próximos N eventos que empiezan después del día seleccionado. */
export function eventsAfter(events: readonly CalEvent[], day: Date, n = 4): CalEvent[] {
  const end = addDays(startOfDay(day), 1).getTime();
  return events.filter((e) => Date.parse(e.starts_at) >= end).slice(0, n);
}

/** Próximos N eventos que aún no terminan (para "Ahora"). */
export function upcoming(events: readonly CalEvent[], now: Date, n = 2): CalEvent[] {
  const t = now.getTime();
  return events.filter((e) => Date.parse(e.ends_at ?? e.starts_at) >= t - 30 * 60_000).slice(0, n);
}

export function durationMinutes(e: Pick<CalEvent, 'starts_at' | 'ends_at'>): number | null {
  if (!e.ends_at) return null;
  return Math.round((Date.parse(e.ends_at) - Date.parse(e.starts_at)) / 60_000);
}
