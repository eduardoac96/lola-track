import { describe, it, expect } from 'vitest';
import {
  addDays,
  dayKey,
  fmtDayChip,
  fmtDayTitle,
  fmtDuration,
  fmtLongDate,
  fmtRelative,
  fromLocal,
  timeKey,
} from './dates';

const now = new Date(2026, 10, 7, 20, 0); // sáb 7 nov 2026, 20:00 local

describe('dates', () => {
  it('dayKey / timeKey / fromLocal round-trip', () => {
    const d = fromLocal('2026-11-09', '10:30');
    expect(dayKey(d)).toBe('2026-11-09');
    expect(timeKey(d)).toBe('10:30');
  });

  it('títulos de día', () => {
    expect(fmtDayTitle(now, now)).toBe('Hoy, sábado 7');
    expect(fmtDayTitle(addDays(now, 1), now)).toBe('Mañana, domingo 8');
    expect(fmtDayTitle(addDays(now, 2), now)).toBe('Lunes 9');
    expect(fmtLongDate(now)).toBe('Sábado 7 de noviembre');
  });

  it('chips y relativos', () => {
    expect(fmtDayChip(now, now)).toBe('HOY');
    expect(fmtDayChip(addDays(now, 1), now)).toBe('MAÑANA');
    expect(fmtDayChip(addDays(now, 2), now)).toBe('LUN 9');
    expect(fmtRelative(now, now)).toBe('Hoy');
    expect(fmtRelative(addDays(now, -1), now)).toBe('Ayer');
    expect(fmtRelative(new Date(2026, 10, 3), now)).toBe('3 nov');
    expect(fmtRelative(new Date(2025, 11, 24), now)).toBe('24 dic 2025');
  });

  it('addDays cruza fin de mes', () => {
    expect(dayKey(addDays(new Date(2026, 10, 30), 1))).toBe('2026-12-01');
  });

  it('duraciones', () => {
    expect(fmtDuration(30)).toBe('30 min');
    expect(fmtDuration(60)).toBe('1 h');
    expect(fmtDuration(90)).toBe('1 h 30');
  });
});
