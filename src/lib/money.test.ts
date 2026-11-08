import { describe, it, expect } from 'vitest';
import { toCents, fromCents, fmtMXN, sumCents } from './money';

describe('money', () => {
  it('toCents sin errores de float', () => {
    expect(toCents(0)).toBe(0);
    expect(toCents(4500)).toBe(450000);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(-2200)).toBe(-220000);
    expect(() => toCents(Number.NaN)).toThrow();
  });

  it('fromCents', () => {
    expect(fromCents(450050)).toBe(4500.5);
    expect(() => fromCents(1.5)).toThrow();
  });

  it('fmtMXN: cero, miles, decimales solo si existen', () => {
    expect(fmtMXN(0)).toBe('$0');
    expect(fmtMXN(3845000)).toBe('$38,450');
    expect(fmtMXN(450050)).toBe('$4,500.50');
    expect(fmtMXN(100000000)).toBe('$1,000,000');
  });

  it('fmtMXN: signos', () => {
    expect(fmtMXN(-220000)).toBe('−$2,200');
    expect(fmtMXN(500000, 'always')).toBe('+$5,000');
    expect(fmtMXN(-220000, 'never')).toBe('$2,200');
    expect(fmtMXN(0, 'always')).toBe('$0');
  });

  it('sumCents', () => {
    expect(sumCents([6000000, -2155000])).toBe(3845000);
    expect(sumCents([])).toBe(0);
  });
});
