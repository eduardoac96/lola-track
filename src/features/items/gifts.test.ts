import { describe, expect, it } from 'vitest';
import type { Item } from '../../data/items';
import { listBudget, nextStage, nextYearName, peopleSummary, stageOf } from './gifts';

const it_ = (p: Partial<Item>): Item =>
  ({
    id: Math.random().toString(36),
    type: 'compra',
    done_at: null,
    gift_stage: null,
    recipient: null,
    price_estimated_cents: null,
    price_actual_cents: null,
    ...p,
  }) as Item;

describe('listBudget', () => {
  const bal = { added_cents: 1_000_00, spent_cents: 300_00, available_cents: 700_00 };

  it('suma planeado solo de compras sin hacer', () => {
    const r = listBudget(bal, [
      it_({ price_estimated_cents: 200_00 }),
      it_({ price_estimated_cents: 999_00, done_at: 'x' }),
      it_({ type: 'tarea', price_estimated_cents: 50_00 }),
    ]);
    expect(r.planned).toBe(200_00);
    expect(r.free).toBe(500_00);
    expect(r.tone).toBe('ok');
  });

  it('ámbar desde 80 %', () => {
    expect(listBudget(bal, [it_({ price_estimated_cents: 500_00 })]).tone).toBe('warn');
  });

  it('rojo si lo planeado no cabe', () => {
    const r = listBudget(bal, [it_({ price_estimated_cents: 800_00 })]);
    expect(r.free).toBe(-100_00);
    expect(r.tone).toBe('over');
  });

  it('bolsa vacía sin uso = ok', () => {
    expect(listBudget({ added_cents: 0, spent_cents: 0, available_cents: 0 }, []).tone).toBe('ok');
  });
});

describe('estados de regalo', () => {
  it('idea → comprado → envuelto → entregado', () => {
    expect(stageOf(it_({}))).toBe('idea');
    const bought = it_({ done_at: 'x' });
    expect(stageOf(bought)).toBe('comprado');
    expect(nextStage('comprado')).toBe('envuelto');
    expect(nextStage('envuelto')).toBe('entregado');
    expect(nextStage('entregado')).toBeNull();
    expect(stageOf(it_({ done_at: null, gift_stage: 'envuelto' }))).toBe('idea');
  });
});

describe('peopleSummary', () => {
  it('agrupa sin importar mayúsculas, usa real si ya se compró y marca tope excedido', () => {
    const { rows, unassigned } = peopleSummary(
      [
        it_({ recipient: 'mamá', price_estimated_cents: 500_00 }),
        it_({ recipient: 'Mamá ', price_estimated_cents: 100_00, price_actual_cents: 400_00, done_at: 'x' }),
        it_({ recipient: 'Beto', price_estimated_cents: 300_00 }),
        it_({ price_estimated_cents: 50_00 }),
      ],
      [
        { id: 'p1', name: 'Mamá', cap_cents: 800_00 },
        { id: 'p2', name: 'Abuela', cap_cents: null },
      ],
    );
    expect(rows.map((r) => r.name)).toEqual(['Abuela', 'Beto', 'Mamá']);
    const mama = rows.find((r) => r.name === 'Mamá')!;
    expect(mama).toMatchObject({ personId: 'p1', amount: 900_00, count: 2, over: true });
    expect(rows.find((r) => r.name === 'Abuela')!.count).toBe(0);
    expect(unassigned).toEqual({ amount: 50_00, count: 1 });
  });
});

describe('nextYearName', () => {
  it('sube el año o lo agrega', () => {
    expect(nextYearName('Navidad 2026')).toBe('Navidad 2027');
    expect(nextYearName('Regalos', new Date(2026, 11, 1))).toBe('Regalos 2027');
  });
});
