import { describe, it, expect } from 'vitest';
import { applyMovement, type Balance } from './budgets';

const base: Balance = {
  budget_id: 'b',
  household_id: 'h',
  name: 'Bebé',
  sort: 0,
  archived: false,
  added_cents: 6000000,
  spent_cents: 2155000,
  available_cents: 3845000,
};

describe('applyMovement', () => {
  it('gasto suma a gastado; revertirlo lo resta (no lo cuenta como aportación)', () => {
    const after = applyMovement(base, -185000, 1);
    expect(after).toMatchObject({ spent_cents: 2340000, available_cents: 3660000, added_cents: 6000000 });
    expect(applyMovement(after, -185000, -1)).toEqual(base);
  });

  it('abono suma a aportado y se revierte limpio', () => {
    const after = applyMovement(base, 500000, 1);
    expect(after).toMatchObject({ added_cents: 6500000, available_cents: 4345000, spent_cents: 2155000 });
    expect(applyMovement(after, 500000, -1)).toEqual(base);
  });

  it('editar un gasto de $1,850 a $2,000 baja el disponible $150', () => {
    const edited = applyMovement(applyMovement(base, -185000, -1), -200000, 1);
    expect(edited.available_cents).toBe(base.available_cents - 15000);
    expect(edited.spent_cents).toBe(base.spent_cents + 15000);
  });
});
