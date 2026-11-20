import { describe, expect, it } from 'vitest';
import { monthLabel, planStatus, planTable, stepDone } from './plan';

const hey = { id: 'hey', name: 'Hey', kind: 'deuda', balance_cents: 2_200_000 };
const fondo = { id: 'fondo', name: 'Fondo', kind: 'meta', balance_cents: 395_000 };
const steps = [
  {
    id: 's1',
    title: 'Aguinaldo repartido',
    due_month: '2026-12-01',
    account_id: null,
    target_cents: null,
    done_at: null,
  },
  { id: 's2', title: 'Hey en $0', due_month: '2027-02-01', account_id: 'hey', target_cents: 0, done_at: null },
  {
    id: 's3',
    title: 'Fondo $90k',
    due_month: '2027-09-01',
    account_id: 'fondo',
    target_cents: 9_000_000,
    done_at: null,
  },
];
const points = [
  { account_id: 'hey', month: '2026-12-01', expected_cents: 2_200_000 },
  { account_id: 'fondo', month: '2026-12-01', expected_cents: 395_000 },
  { account_id: 'hey', month: '2027-01-01', expected_cents: 200_000 },
  { account_id: 'fondo', month: '2027-01-01', expected_cents: 2_780_000 },
];

describe('planStatus', () => {
  it('sin mes terminado con plan: sin comparación y en camino', () => {
    const s = planStatus(new Date(2026, 11, 5), steps, points, [hey, fondo]);
    expect(s.refMonth).toBeNull();
    expect(s.checks).toEqual([]);
    expect(s.onTrack).toBe(true);
    expect(s.current?.step.id).toBe('s1');
  });

  it('compara contra el cierre del último mes terminado', () => {
    const s = planStatus(new Date(2027, 0, 10), steps, points, [hey, fondo]);
    expect(s.refMonth).toBe('2026-12-01');
    expect(s.checks.map((c) => c.diff)).toEqual([0, 0]);
    // el hito manual de diciembre sigue sin palomear → vencido → atrasado
    expect(s.steps[0]!.overdue).toBe(true);
    expect(s.onTrack).toBe(false);
  });

  it('deuda arriba del plan por más de $500 es atraso; ahorro arriba es ventaja', () => {
    const s = planStatus(new Date(2027, 0, 10), [steps[1]!], points, [
      { ...hey, balance_cents: 2_300_000 },
      { ...fondo, balance_cents: 500_000 },
    ]);
    const byId = Object.fromEntries(s.checks.map((c) => [c.account.id, c]));
    expect(byId.hey!.diff).toBe(-100_000);
    expect(byId.hey!.behind).toBe(true);
    expect(byId.fondo!.diff).toBe(105_000);
    expect(s.onTrack).toBe(false);
  });

  it('el paso actual es el primero sin cumplir y trae lo que falta', () => {
    const s = planStatus(
      new Date(2027, 0, 10),
      [{ ...steps[0]!, done_at: '2026-12-21' }, ...steps.slice(1)],
      [],
      [hey, fondo],
    );
    expect(s.current?.index).toBe(1);
    expect(s.current?.remaining).toBe(2_200_000);
  });
});

describe('stepDone', () => {
  it('deuda en el objetivo o abajo cuenta como cumplido', () => {
    expect(stepDone(steps[1]!, [{ ...hey, balance_cents: 0 }])).toBe(true);
    expect(stepDone(steps[1]!, [hey])).toBe(false);
  });
  it('sin cuenta depende de la palomita', () => {
    expect(stepDone({ ...steps[0]!, done_at: 'x' }, [])).toBe(true);
  });
});

describe('planTable y monthLabel', () => {
  it('arma meses ordenados con una columna por cuenta', () => {
    const t = planTable(points, [fondo, hey]);
    expect(t.map((r) => r.month)).toEqual(['2026-12-01', '2027-01-01']);
    expect(t[1]!.values.map((v) => v.expected)).toEqual([2_780_000, 200_000]);
  });
  it('etiqueta corta', () => {
    expect(monthLabel('2027-09-01')).toBe('sep 27');
  });
});
