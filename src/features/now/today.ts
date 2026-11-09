import type { Item } from '../../data/items';
import type { CalEvent } from '../../data/events';
import { dayKey, isSameDay } from '../../lib/dates';
import { isDone } from '../items/select';

export interface TodayEntry {
  kind: 'item' | 'event';
  item?: Item;
  event?: CalEvent;
  /** 'vencido' | 'hoy' para pendientes con fecha; undefined para urgentes sin fecha. */
  due?: 'vencido' | 'hoy';
}

/**
 * "Hoy": eventos de hoy que no han terminado (máx 2, por hora) y luego pendientes:
 * urgentes (en su orden) + los que vencen hoy o ya vencieron. Total máx `max`.
 */
export function buildToday(
  items: readonly Item[],
  events: readonly CalEvent[],
  now: Date = new Date(),
  max = 5,
): { entries: TodayEntry[]; hiddenItems: number } {
  const today = dayKey(now);
  const t = now.getTime();

  const evs = events
    .filter((e) => isSameDay(new Date(e.starts_at), now) && Date.parse(e.ends_at ?? e.starts_at) >= t - 30 * 60_000)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 2)
    .map<TodayEntry>((event) => ({ kind: 'event', event }));

  const pending = items.filter((i) => !isDone(i));
  const urgent = pending.filter((i) => i.priority === 'urgente').sort((a, b) => a.sort_order - b.sort_order);
  const due = pending
    .filter((i) => i.priority !== 'urgente' && i.due_date != null && i.due_date <= today)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || a.sort_order - b.sort_order);
  const dueOf = (i: Item): TodayEntry['due'] =>
    i.due_date == null || i.due_date > today ? undefined : i.due_date < today ? 'vencido' : 'hoy';

  const itemEntries = [...urgent, ...due].map<TodayEntry>((item) => ({ kind: 'item', item, due: dueOf(item) }));
  const room = Math.max(0, max - evs.length);
  return { entries: [...evs, ...itemEntries.slice(0, room)], hiddenItems: Math.max(0, itemEntries.length - room) };
}
