import { describe, it, expect } from 'vitest';
import { ARRIVAL_CHECKLIST, missingFromChecklist } from './checklist';

describe('checklist de llegada', () => {
  it('sin pendientes, sugiere todo', () => {
    expect(missingFromChecklist([])).toHaveLength(ARRIVAL_CHECKLIST.length);
  });

  it('omite los que ya existen sin importar acentos/mayúsculas/espacios', () => {
    const missing = missingFromChecklist(['CUNA', 'lampara de  noche', 'Silla para auto ']);
    const titles = missing.map((m) => m.title);
    expect(titles).not.toContain('Cuna');
    expect(titles).not.toContain('Lámpara de noche');
    expect(titles).not.toContain('Silla para auto');
    expect(missing).toHaveLength(ARRIVAL_CHECKLIST.length - 3);
  });

  it('títulos únicos y válidos para la base (1–200)', () => {
    const titles = ARRIVAL_CHECKLIST.map((e) => e.title);
    expect(new Set(titles).size).toBe(titles.length);
    titles.forEach((t) => expect(t.length).toBeGreaterThan(0));
  });
});
