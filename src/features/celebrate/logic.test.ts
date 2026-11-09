import { describe, it, expect } from 'vitest';
import { milestoneToCelebrate, reachedMilestone, urgentCleared } from './logic';

describe('hitos', () => {
  it('no cuenta con pocos pendientes', () => {
    expect(reachedMilestone(100, 3)).toBe(0);
  });
  it('alcanza el hito más alto', () => {
    expect(reachedMilestone(24, 10)).toBe(0);
    expect(reachedMilestone(50, 10)).toBe(50);
    expect(reachedMilestone(99, 10)).toBe(75);
    expect(reachedMilestone(100, 10)).toBe(100);
  });
  it('solo celebra uno nuevo', () => {
    expect(milestoneToCelebrate(50, 10, 25)).toBe(50);
    expect(milestoneToCelebrate(50, 10, 50)).toBeNull();
    expect(milestoneToCelebrate(30, 10, 50)).toBeNull();
  });
});

describe('urgentes', () => {
  const s = (urgentPending: number, done: number) => ({ urgentPending, done });
  it('solo en la transición a cero al completar', () => {
    expect(urgentCleared(null, s(0, 3))).toBe(false);
    expect(urgentCleared(s(0, 3), s(0, 3))).toBe(false);
    expect(urgentCleared(s(2, 3), s(1, 4))).toBe(false);
    expect(urgentCleared(s(1, 3), s(0, 4))).toBe(true);
  });
  it('no al quitar la marca de urgente ni al borrar', () => {
    expect(urgentCleared(s(1, 3), s(0, 3))).toBe(false);
  });
});
