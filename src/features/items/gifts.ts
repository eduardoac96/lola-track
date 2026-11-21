import type { Item } from '../../data/items';
import { isDone } from './select';

/* ───────── Barra de presupuesto de una lista */

export type BarTone = 'ok' | 'warn' | 'over';

export interface ListBudget {
  /** Total aportado a la bolsa. */
  total: number;
  /** Ya gastado de la bolsa (movimientos negativos). */
  spent: number;
  /** Estimado de compras de la lista aún sin hacer. */
  planned: number;
  /** Disponible de la bolsa menos lo planeado (puede ser negativo). */
  free: number;
  /** (gastado + planeado) / total, 0–∞. */
  ratio: number;
  tone: BarTone;
}

/** Ámbar desde 80 %, rojo al pasarse. Sin total (bolsa en 0) y con algo usado = rojo. */
export function listBudget(
  balance: { added_cents: number; spent_cents: number; available_cents: number },
  listItems: readonly Item[],
): ListBudget {
  const planned = listItems.reduce(
    (s, i) => (i.type === 'compra' && !isDone(i) ? s + (i.price_estimated_cents ?? 0) : s),
    0,
  );
  const total = balance.added_cents;
  const spent = balance.spent_cents;
  const used = spent + planned;
  const ratio = total > 0 ? used / total : used > 0 ? Infinity : 0;
  const free = balance.available_cents - planned;
  const tone: BarTone = free < 0 || ratio > 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok';
  return { total, spent, planned, free, ratio, tone };
}

/* ───────── Estados de regalo */

export type GiftStage = 'idea' | 'comprado' | 'envuelto' | 'entregado';

export const GIFT_STAGES: ReadonlyArray<{ value: GiftStage; label: string }> = [
  { value: 'idea', label: 'Idea' },
  { value: 'comprado', label: 'Comprado' },
  { value: 'envuelto', label: 'Envuelto' },
  { value: 'entregado', label: 'Entregado' },
];

export function stageOf(i: Pick<Item, 'done_at' | 'gift_stage'>): GiftStage {
  if (!isDone(i)) return 'idea';
  return i.gift_stage === 'envuelto' || i.gift_stage === 'entregado' ? i.gift_stage : 'comprado';
}

export const stageLabel = (s: GiftStage): string => GIFT_STAGES.find((g) => g.value === s)!.label;

/** Siguiente estado tras "Comprado" (un toque). Entregado regresa a Comprado. Idea no avanza aquí (usa completar). */
export function nextStage(s: GiftStage): 'envuelto' | 'entregado' | null {
  if (s === 'comprado') return 'envuelto';
  if (s === 'envuelto') return 'entregado';
  return null;
}

/* ───────── Por persona */

export interface PersonRow {
  /** Nombre como se muestra (el de la persona guardada o el primero que apareció en un pendiente). */
  name: string;
  /** id en list_people si existe. */
  personId: string | null;
  cap: number | null;
  /** Real si ya se compró, si no el estimado. */
  amount: number;
  count: number;
  over: boolean;
}

export const personKey = (name: string): string => name.trim().toLocaleLowerCase('es-MX');

/** Une personas guardadas (con tope) y destinatarios escritos en los pendientes; "Sin asignar" al final. */
export function peopleSummary(
  listItems: readonly Item[],
  people: ReadonlyArray<{ id: string; name: string; cap_cents: number | null }>,
): { rows: PersonRow[]; unassigned: { amount: number; count: number } } {
  const rows = new Map<string, PersonRow>();
  for (const p of people) {
    rows.set(personKey(p.name), { name: p.name, personId: p.id, cap: p.cap_cents, amount: 0, count: 0, over: false });
  }
  const unassigned = { amount: 0, count: 0 };
  for (const i of listItems) {
    const amount = (isDone(i) ? (i.price_actual_cents ?? i.price_estimated_cents) : i.price_estimated_cents) ?? 0;
    const name = i.recipient?.trim();
    if (!name) {
      unassigned.amount += amount;
      unassigned.count++;
      continue;
    }
    const k = personKey(name);
    const row = rows.get(k) ?? { name, personId: null, cap: null, amount: 0, count: 0, over: false };
    row.amount += amount;
    row.count++;
    rows.set(k, row);
  }
  const out = [...rows.values()].map((r) => ({ ...r, over: r.cap != null && r.amount > r.cap }));
  out.sort((a, b) => a.name.localeCompare(b.name, 'es-MX'));
  return { rows: out, unassigned };
}

/** Nombre para duplicar: sube el año si lo trae ("Navidad 2026" → "Navidad 2027"); si no, lo agrega. */
export function nextYearName(name: string, today = new Date()): string {
  const m = name.match(/\b(20\d\d)\b/);
  if (m) return name.replace(m[1]!, String(Number(m[1]) + 1));
  return `${name.trim()} ${today.getFullYear() + 1}`.slice(0, 40);
}
