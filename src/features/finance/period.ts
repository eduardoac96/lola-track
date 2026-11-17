/**
 * Quincenas: días de pago 15 y 30 (o el último día del mes si es más corto, p. ej. 28 feb).
 * La quincena "actual" es la del último día de pago que ya llegó.
 */

export type PayDay = '15' | '30';

export interface Period {
  grp: PayDay;
  /** 'YYYY-MM-DD' del día de pago: llave de las marcas en fin_checks. */
  key: string;
  year: number;
  /** 0-11 */
  month: number;
  day: number;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

const lastDay = (y: number, m: number): number => new Date(y, m + 1, 0).getDate();
const pad = (n: number): string => String(n).padStart(2, '0');

export function makePeriod(year: number, month: number, grp: PayDay): Period {
  const d = new Date(year, month, 1);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = grp === '15' ? 15 : Math.min(30, lastDay(y, m));
  return { grp, year: y, month: m, day, key: `${y}-${pad(m + 1)}-${pad(day)}` };
}

/** Quincena en curso para una fecha local. */
export function currentPeriod(now: Date): Period {
  const y = now.getFullYear();
  const m = now.getMonth();
  const end = makePeriod(y, m, '30');
  if (now.getDate() >= end.day) return end;
  if (now.getDate() >= 15) return makePeriod(y, m, '15');
  return makePeriod(y, m - 1, '30');
}

/** Quincena anterior (-1) o siguiente (+1). */
export function shiftPeriod(p: Period, dir: 1 | -1): Period {
  if (dir === 1) return p.grp === '15' ? makePeriod(p.year, p.month, '30') : makePeriod(p.year, p.month + 1, '15');
  return p.grp === '30' ? makePeriod(p.year, p.month, '15') : makePeriod(p.year, p.month - 1, '30');
}

/** '15 nov' · '30 nov' · '28 feb' */
export function periodLabel(p: Period): string {
  return `${p.day} ${MONTHS[p.month]}`;
}

/** Suma total y lo ya marcado de las líneas de una quincena. */
export function summarize(
  lines: ReadonlyArray<{ id: string; amount_cents: number }>,
  checked: ReadonlySet<string>,
): { total: number; done: number; count: number; doneCount: number } {
  let total = 0;
  let done = 0;
  let doneCount = 0;
  for (const l of lines) {
    total += l.amount_cents;
    if (checked.has(l.id)) {
      done += l.amount_cents;
      doneCount += 1;
    }
  }
  return { total, done, count: lines.length, doneCount };
}

/** Avance 0-100 de una meta o de una deuda contra su saldo inicial. */
export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}
