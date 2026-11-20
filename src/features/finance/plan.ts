/**
 * Camino: dónde voy contra el plan.
 * - Hito cumplido: si tiene cuenta, lo decide el saldo (deuda ≤ objetivo, meta ≥ objetivo); si no, done_at.
 * - "¿Voy bien?": saldo real de cada cuenta contra lo esperado al cierre del último mes ya terminado.
 */

type Account = { id: string; name: string; kind: string; balance_cents: number };
type Step = {
  id: string;
  title: string;
  due_month: string | null;
  account_id: string | null;
  target_cents: number | null;
  done_at: string | null;
};
type Point = { account_id: string; month: string; expected_cents: number };

/** Margen para no marcar "atrasado" por centavos o redondeos: $500. */
export const TOLERANCE_CENTS = 50_000;

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;
const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-01' del mes de una fecha local. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

/** '2027-02-01' → 'feb 27' */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${String(y).slice(2)}`;
}

/** Lo que falta para cumplir un hito con cuenta (0 si ya). null si el hito no depende de un saldo. */
export function stepRemaining(step: Step, accounts: ReadonlyArray<Account>): number | null {
  if (!step.account_id || step.target_cents == null) return null;
  const a = accounts.find((x) => x.id === step.account_id);
  if (!a) return null;
  return a.kind === 'deuda'
    ? Math.max(0, a.balance_cents - step.target_cents)
    : Math.max(0, step.target_cents - a.balance_cents);
}

export function stepDone(step: Step, accounts: ReadonlyArray<Account>): boolean {
  const rem = stepRemaining(step, accounts);
  return rem == null ? !!step.done_at : rem === 0;
}

export interface AccountCheck {
  account: Account;
  expected: number;
  actual: number;
  /** Positivo = mejor que el plan (menos deuda o más ahorro). */
  diff: number;
  behind: boolean;
}

export interface PlanStatus<S extends Step = Step> {
  steps: Array<{ step: S; done: boolean; remaining: number | null; overdue: boolean }>;
  current: { step: S; index: number; remaining: number | null } | null;
  /** Mes contra el que se compara (cierre del último mes terminado con plan). */
  refMonth: string | null;
  checks: AccountCheck[];
  onTrack: boolean;
}

export function planStatus<S extends Step>(
  now: Date,
  steps: ReadonlyArray<S>,
  points: ReadonlyArray<Point>,
  accounts: ReadonlyArray<Account>,
): PlanStatus<S> {
  const thisMonth = monthKey(now);
  const rows = steps.map((step) => {
    const remaining = stepRemaining(step, accounts);
    const done = remaining == null ? !!step.done_at : remaining === 0;
    // vencido: su mes ya terminó y no está cumplido
    const overdue = !done && step.due_month != null && step.due_month < thisMonth;
    return { step, done, remaining, overdue };
  });
  const i = rows.findIndex((r) => !r.done);
  const current = i === -1 ? null : { step: rows[i]!.step, index: i, remaining: rows[i]!.remaining };

  const past = points.filter((p) => p.month < thisMonth).map((p) => p.month);
  const refMonth = past.length ? past.reduce((a, b) => (a > b ? a : b)) : null;
  const checks: AccountCheck[] = [];
  if (refMonth) {
    for (const p of points) {
      if (p.month !== refMonth) continue;
      const a = accounts.find((x) => x.id === p.account_id);
      if (!a) continue;
      const diff = a.kind === 'deuda' ? p.expected_cents - a.balance_cents : a.balance_cents - p.expected_cents;
      checks.push({
        account: a,
        expected: p.expected_cents,
        actual: a.balance_cents,
        diff,
        behind: diff < -TOLERANCE_CENTS,
      });
    }
  }
  const onTrack = checks.every((c) => !c.behind) && rows.every((r) => !r.overdue);
  return { steps: rows, current, refMonth, checks, onTrack };
}

/** Tabla mes a mes: saldo esperado de cada cuenta, en el orden de las cuentas. */
export function planTable<A extends Account>(
  points: ReadonlyArray<Point>,
  accounts: ReadonlyArray<A>,
): Array<{ month: string; values: Array<{ account: A; expected: number | null }> }> {
  const months = [...new Set(points.map((p) => p.month))].sort();
  const used = accounts.filter((a) => points.some((p) => p.account_id === a.id));
  return months.map((month) => ({
    month,
    values: used.map((account) => ({
      account,
      expected: points.find((p) => p.month === month && p.account_id === account.id)?.expected_cents ?? null,
    })),
  }));
}
