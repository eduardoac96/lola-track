import type { Item, ItemPriority, ItemType } from '../../data/items';
import { fmtMXN } from '../../lib/money';
import { DAY_MS } from '../../lib/dates';
import type { IconName } from '../../ui/Icon';

export type TypeFilter = 'todo' | ItemType;

export const PRIORITIES: ReadonlyArray<{ value: ItemPriority; label: string; dot: string }> = [
  { value: 'urgente', label: 'Urgente', dot: '#E5484D' },
  { value: 'pronto', label: 'Pronto', dot: '#F5A524' },
  { value: 'algun_dia', label: 'Algún día', dot: '#9C99B0' },
];

export const TYPES: Record<ItemType, { label: string; tint: string; fg: string; icon: IconName }> = {
  compra: { label: 'Compra', tint: 'var(--color-compra-tint)', fg: 'var(--color-compra-fg)', icon: 'compra' },
  arreglo: { label: 'Arreglo', tint: 'var(--color-arreglo-tint)', fg: 'var(--color-arreglo-fg)', icon: 'arreglo' },
  tarea: { label: 'Tarea', tint: 'var(--color-tarea-tint)', fg: 'var(--color-tarea-fg)', icon: 'tarea' },
};

export const isDone = (i: Pick<Item, 'done_at'>): boolean => i.done_at != null;

export function itemMeta(i: Item): string {
  const parts: string[] = [TYPES[i.type].label];
  if (i.area) parts.push(i.area);
  const price = isDone(i) ? (i.price_actual_cents ?? i.price_estimated_cents) : i.price_estimated_cents;
  if (price != null) parts.push(fmtMXN(price));
  return parts.join(' · ');
}

export function areasOf(items: readonly Item[]): string[] {
  const set = new Map<string, string>();
  for (const i of items) {
    if (!i.area) continue;
    const k = i.area.toLocaleLowerCase('es-MX');
    if (!set.has(k)) set.set(k, i.area);
  }
  return [...set.values()].sort((a, b) => a.localeCompare(b, 'es-MX'));
}

export interface ItemGroup {
  priority: ItemPriority;
  label: string;
  dot: string;
  items: Item[];
  pending: number;
}

/**
 * Filtra por tipo/área, agrupa por prioridad (pendientes primero, hechos al final)
 * y oculta los hechos de hace más de `hideDoneAfterDays` salvo que showAllDone.
 */
export function groupItems(
  items: readonly Item[],
  opts: { type: TypeFilter; area: string | null; showAllDone: boolean; now?: Date; hideDoneAfterDays?: number },
): { groups: ItemGroup[]; hiddenDone: number } {
  const now = (opts.now ?? new Date()).getTime();
  const cutoff = now - (opts.hideDoneAfterDays ?? 14) * DAY_MS;
  const areaKey = opts.area?.toLocaleLowerCase('es-MX') ?? null;
  let hiddenDone = 0;

  const visible = items.filter((i) => {
    if (opts.type !== 'todo' && i.type !== opts.type) return false;
    if (areaKey && i.area?.toLocaleLowerCase('es-MX') !== areaKey) return false;
    if (!opts.showAllDone && i.done_at && Date.parse(i.done_at) < cutoff) {
      hiddenDone++;
      return false;
    }
    return true;
  });

  const order = (a: Item, b: Item) => {
    const ad = isDone(a);
    const bd = isDone(b);
    if (ad !== bd) return ad ? 1 : -1;
    if (ad && bd) return (b.done_at ?? '').localeCompare(a.done_at ?? '');
    return b.created_at.localeCompare(a.created_at);
  };

  const groups = PRIORITIES.map((p) => {
    const its = visible.filter((i) => i.priority === p.value).sort(order);
    return { priority: p.value, label: p.label, dot: p.dot, items: its, pending: its.filter((i) => !isDone(i)).length };
  }).filter((g) => g.items.length > 0);

  return { groups, hiddenDone };
}

/** Suma del precio estimado de compras no hechas (centavos). */
export function pendingPurchasesCents(items: readonly Item[]): number {
  return items.reduce((s, i) => (i.type === 'compra' && !isDone(i) ? s + (i.price_estimated_cents ?? 0) : s), 0);
}

export function progressOf(items: readonly Item[]): {
  done: number;
  total: number;
  pct: number;
  urgentPending: number;
} {
  const total = items.length;
  const done = items.filter(isDone).length;
  const urgentPending = items.filter((i) => i.priority === 'urgente' && !isDone(i)).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, urgentPending };
}

export function topUrgent(items: readonly Item[], n = 3): Item[] {
  return items
    .filter((i) => i.priority === 'urgente' && !isDone(i))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, n);
}
