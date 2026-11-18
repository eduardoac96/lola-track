import { describe, expect, it } from 'vitest';
import {
  currentPeriod,
  makePeriod,
  monthLabel,
  monthSpending,
  pct,
  periodLabel,
  shiftPeriod,
  summarize,
} from './period';

describe('currentPeriod', () => {
  it('del 15 al 29 es la quincena del 15', () => {
    expect(currentPeriod(new Date(2026, 10, 17)).key).toBe('2026-11-15');
    expect(currentPeriod(new Date(2026, 10, 15)).key).toBe('2026-11-15');
    expect(currentPeriod(new Date(2026, 10, 29)).key).toBe('2026-11-15');
  });
  it('desde el 30 es la quincena del 30', () => {
    expect(currentPeriod(new Date(2026, 10, 30)).key).toBe('2026-11-30');
    expect(currentPeriod(new Date(2026, 11, 31)).key).toBe('2026-12-30');
  });
  it('del 1 al 14 sigue la del 30 del mes anterior', () => {
    expect(currentPeriod(new Date(2027, 0, 5)).key).toBe('2026-12-30');
  });
  it('febrero paga el último día', () => {
    expect(makePeriod(2027, 1, '30').key).toBe('2027-02-28');
    expect(currentPeriod(new Date(2027, 1, 28)).key).toBe('2027-02-28');
    expect(currentPeriod(new Date(2027, 2, 3)).key).toBe('2027-02-28');
  });
});

describe('shiftPeriod', () => {
  it('avanza y regresa cruzando meses y años', () => {
    const p = makePeriod(2026, 11, '30');
    expect(shiftPeriod(p, 1).key).toBe('2027-01-15');
    expect(shiftPeriod(shiftPeriod(p, 1), -1).key).toBe('2026-12-30');
    expect(shiftPeriod(makePeriod(2027, 0, '15'), -1).key).toBe('2026-12-30');
  });
  it('etiqueta', () => {
    expect(periodLabel(makePeriod(2027, 1, '30'))).toBe('28 feb');
  });
});

describe('summarize / pct', () => {
  it('suma total y marcado', () => {
    const s = summarize(
      [
        { id: 'a', amount_cents: 500000 },
        { id: 'b', amount_cents: 80000 },
      ],
      new Set(['b']),
    );
    expect(s).toEqual({ total: 580000, done: 80000, count: 2, doneCount: 1 });
  });
  it('pct acota 0-100', () => {
    expect(pct(50, 200)).toBe(25);
    expect(pct(300, 200)).toBe(100);
    expect(pct(1, 0)).toBe(0);
  });
});

describe('monthSpending', () => {
  const lines = [
    { section: 'quincena', name: 'Mandado', amount_cents: 250000 },
    { section: 'quincena', name: 'Mandado', amount_cents: 250000 },
    { section: 'extra', name: 'Mandado', amount_cents: 999 },
  ];
  const mv = [
    { direction: 'gasto', amount_cents: 100000, category: 'Mandado', occurred_on: '2026-11-03' },
    { direction: 'gasto', amount_cents: 50000, category: null, occurred_on: '2026-11-20' },
    { direction: 'gasto', amount_cents: 70000, category: 'Mandado', occurred_on: '2026-12-01' },
    { direction: 'abono', amount_cents: 900000, category: null, occurred_on: '2026-11-05' },
  ];
  it('suma solo gastos del mes, por categoría, contra lo planeado de la quincena', () => {
    expect(monthSpending(mv, lines, 2026, 10)).toEqual({
      total: 150000,
      rows: [
        { category: 'Mandado', spent: 100000, planned: 500000 },
        { category: 'Otros', spent: 50000, planned: 0 },
      ],
    });
  });
  it('etiqueta de mes', () => {
    expect(monthLabel(2026, 12)).toBe('enero 2027');
  });
});
