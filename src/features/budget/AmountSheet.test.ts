import { describe, it, expect } from 'vitest';
import { addChip, pressKey } from './AmountSheet';

describe('teclado de montos', () => {
  it('teclea, ignora ceros a la izquierda y borra', () => {
    let v = '';
    v = pressKey(v, '0');
    expect(v).toBe('');
    v = pressKey(v, '1');
    v = pressKey(v, '2');
    v = pressKey(v, '00');
    expect(v).toBe('1200');
    v = pressKey(v, 'del');
    expect(v).toBe('120');
  });

  it('máximo 7 dígitos', () => {
    let v = '9999999';
    v = pressKey(v, '9');
    expect(v).toBe('9999999');
    expect(addChip('9999999', 5000)).toBe('9999999');
  });

  it('los atajos se acumulan', () => {
    expect(addChip('', 500)).toBe('500');
    expect(addChip(addChip('250', 1000), 100)).toBe('1350');
  });
});
