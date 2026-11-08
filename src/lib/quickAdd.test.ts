import { describe, it, expect } from 'vitest';
import { parseQuickAdd } from './quickAdd';

describe('parseQuickAdd', () => {
  it('texto plano → tarea, prioridad pronto', () => {
    expect(parseQuickAdd('organizar clóset')).toEqual({
      title: 'Organizar clóset',
      type: 'tarea',
      priority: 'pronto',
      area: null,
      priceCents: null,
      valid: true,
    });
  });

  it('precio infiere compra; acepta formatos MX', () => {
    expect(parseQuickAdd('Cuna $4500').priceCents).toBe(450000);
    expect(parseQuickAdd('Cuna $4,500').priceCents).toBe(450000);
    expect(parseQuickAdd('Cuna $4 500').priceCents).toBe(450000);
    expect(parseQuickAdd('Cuna $ 4500.5').priceCents).toBe(450050);
    expect(parseQuickAdd('Cuna $12,345.67').priceCents).toBe(1234567);
    expect(parseQuickAdd('Cuna $4500').type).toBe('compra');
  });

  it('ejemplo del mockup', () => {
    const r = parseQuickAdd('Cuna $4500 !urgente');
    expect(r).toMatchObject({ title: 'Cuna', type: 'compra', priority: 'urgente', priceCents: 450000 });
  });

  it('prioridades y alias, con y sin acento', () => {
    expect(parseQuickAdd('x !u').priority).toBe('urgente');
    expect(parseQuickAdd('x !P').priority).toBe('pronto');
    expect(parseQuickAdd('x !algún').priority).toBe('algun_dia');
    expect(parseQuickAdd('x !algundia').priority).toBe('algun_dia');
    expect(parseQuickAdd('x !a').priority).toBe('algun_dia');
  });

  it('#tipo gana sobre la inferencia por precio', () => {
    expect(parseQuickAdd('Plomero $800 #arreglo').type).toBe('arreglo');
    expect(parseQuickAdd('Tramitar acta #tareas').type).toBe('tarea');
  });

  it('área simple y entre comillas, conserva acentos', () => {
    expect(parseQuickAdd('Pintar @baño').area).toBe('baño');
    const r = parseQuickAdd('Lámpara $650 @"cuarto niños" !a');
    expect(r).toMatchObject({ title: 'Lámpara', area: 'cuarto niños', priority: 'algun_dia', priceCents: 65000 });
  });

  it('tokens en cualquier orden y en medio del título', () => {
    const r = parseQuickAdd('!urgente asegurar @sala muebles a la pared #arreglo');
    expect(r).toMatchObject({
      title: 'Asegurar muebles a la pared',
      area: 'sala',
      type: 'arreglo',
      priority: 'urgente',
    });
  });

  it('no confunde símbolos dentro de palabras', () => {
    expect(parseQuickAdd('correo a@b.com').area).toBeNull();
    expect(parseQuickAdd('pagar US$20').priceCents).toBeNull();
    expect(parseQuickAdd('hola!urgente').priority).toBe('pronto');
  });

  it('solo tokens → inválido', () => {
    expect(parseQuickAdd('$500 !u @sala').valid).toBe(false);
    expect(parseQuickAdd('   ').valid).toBe(false);
  });
});
