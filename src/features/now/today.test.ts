import { describe, it, expect } from 'vitest';
import type { Item } from '../../data/items';
import type { CalEvent } from '../../data/events';
import { buildToday } from './today';

const now = new Date(2026, 10, 8, 12, 0);
let n = 0;
const item = (p: Partial<Item>): Item => ({
  id: `i${++n}`,
  household_id: 'h',
  type: 'tarea',
  title: `I${n}`,
  priority: 'pronto',
  area: null,
  list_id: null,
  price_estimated_cents: null,
  price_actual_cents: null,
  due_date: null,
  due_reminded_at: null,
  link_url: null,
  notes: null,
  photo_path: null,
  done_at: null,
  done_by: null,
  budget_movement_id: null,
  sort_order: n,
  created_by: 'u',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  ...p,
});
const ev = (id: string, h: number, durMin?: number, dayOffset = 0): CalEvent => {
  const s = new Date(2026, 10, 8 + dayOffset, h, 0);
  return {
    id,
    household_id: 'h',
    title: id,
    starts_at: s.toISOString(),
    ends_at: durMin ? new Date(s.getTime() + durMin * 60_000).toISOString() : null,
    place: null,
    notes: null,
    item_id: null,
    remind_minutes: null,
    reminded_at: null,
    created_by: 'u',
    created_at: s.toISOString(),
    updated_at: s.toISOString(),
  };
};

describe('buildToday', () => {
  it('eventos de hoy primero (sin los ya terminados ni los de mañana), luego urgentes y vencidos', () => {
    const u1 = item({ priority: 'urgente', sort_order: 2 });
    const u2 = item({ priority: 'urgente', sort_order: 1 });
    const venceHoy = item({ due_date: '2026-11-08' });
    const vencido = item({ due_date: '2026-11-05' });
    const futuro = item({ due_date: '2026-11-20' });
    const hecho = item({ priority: 'urgente', done_at: '2026-11-08T10:00:00Z' });
    const { entries, hiddenItems } = buildToday(
      [u1, u2, venceHoy, vencido, futuro, hecho],
      [ev('manana', 10, 60, 1), ev('tarde', 18, 60), ev('paso', 9, 60)],
      now,
    );
    expect(entries.map((e) => e.event?.id ?? e.item?.id)).toEqual(['tarde', u2.id, u1.id, vencido.id, venceHoy.id]);
    expect(entries.find((e) => e.item?.id === vencido.id)?.due).toBe('vencido');
    expect(entries.find((e) => e.item?.id === venceHoy.id)?.due).toBe('hoy');
    expect(hiddenItems).toBe(0);
  });

  it('respeta el máximo y cuenta los que no caben', () => {
    const urg = Array.from({ length: 7 }, () => item({ priority: 'urgente' }));
    const { entries, hiddenItems } = buildToday(urg, [ev('a', 15), ev('b', 16), ev('c', 17)], now);
    expect(entries).toHaveLength(5);
    expect(entries.filter((e) => e.kind === 'event')).toHaveLength(2);
    expect(hiddenItems).toBe(4);
  });

  it('día libre', () => {
    expect(buildToday([item({})], [], now).entries).toHaveLength(0);
  });
});
