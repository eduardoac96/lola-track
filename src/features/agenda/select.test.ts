import { describe, it, expect } from 'vitest';
import type { CalEvent } from '../../data/events';
import { durationMinutes, eventsAfter, eventsOn, upcoming, weekFrom } from './select';

const ev = (id: string, start: Date, end?: Date): CalEvent => ({
  id,
  household_id: 'h',
  title: id,
  starts_at: start.toISOString(),
  ends_at: end?.toISOString() ?? null,
  place: null,
  notes: null,
  item_id: null,
  remind_minutes: 60,
  reminded_at: null,
  created_by: 'u',
  created_at: start.toISOString(),
  updated_at: start.toISOString(),
});

const sat = new Date(2026, 10, 7);
const list = [
  ev('plomero', new Date(2026, 10, 7, 18, 0), new Date(2026, 10, 7, 19, 0)),
  ev('cuna', new Date(2026, 10, 9, 10, 30)),
  ev('armar', new Date(2026, 10, 9, 19, 0)),
  ev('pediatra', new Date(2026, 10, 11, 16, 0)),
  ev('cambiador', new Date(2026, 10, 12, 9, 0)),
  ev('shower', new Date(2026, 10, 14, 11, 0)),
];

describe('agenda/select', () => {
  it('semana de 7 días desde la fecha', () => {
    const w = weekFrom(new Date(2026, 10, 7, 15, 0));
    expect(w).toHaveLength(7);
    expect(w[0]?.getHours()).toBe(0);
    expect(w[6]?.getDate()).toBe(13);
  });

  it('eventos del día y después', () => {
    expect(eventsOn(list, new Date(2026, 10, 9)).map((e) => e.id)).toEqual(['cuna', 'armar']);
    expect(eventsAfter(list, sat).map((e) => e.id)).toEqual(['cuna', 'armar', 'pediatra', 'cambiador']);
  });

  it('próximos ignora los que ya terminaron', () => {
    expect(upcoming(list, new Date(2026, 10, 7, 20, 0)).map((e) => e.id)).toEqual(['cuna', 'armar']);
    expect(upcoming(list, new Date(2026, 10, 7, 18, 30)).map((e) => e.id)).toEqual(['plomero', 'cuna']);
  });

  it('duración en minutos', () => {
    expect(durationMinutes(list[0]!)).toBe(60);
    expect(durationMinutes(list[1]!)).toBeNull();
  });
});
