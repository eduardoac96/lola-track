import { describe, expect, it } from 'vitest';
import type { List } from '../../data/lists';
import { captureListId, resolveListFilter } from './selectedList';

const list = (id: string, archived = false): List => ({
  id,
  household_id: 'h',
  name: id,
  sort_order: 0,
  archived_at: archived ? '2026-11-01T00:00:00Z' : null,
  budget_id: null,
  is_gift: false,
  event_date: null,
  event_reminded_at: null,
  created_by: null,
  created_at: '',
  updated_at: '',
});

describe('lista seleccionada', () => {
  it('vuelve a Todas si la lista no existe o está archivada', () => {
    expect(resolveListFilter('a', [list('a')])).toBe('a');
    expect(resolveListFilter('a', [list('a', true)])).toBe('all');
    expect(resolveListFilter('x', [list('a')])).toBe('all');
    expect(resolveListFilter('general', [])).toBe('general');
    expect(resolveListFilter('a', undefined)).toBe('a');
  });

  it('captura en General salvo que haya una lista abierta', () => {
    expect(captureListId('all')).toBeNull();
    expect(captureListId('general')).toBeNull();
    expect(captureListId('a')).toBe('a');
  });
});

describe('espacios Pendientes / Regalos', () => {
  const gift = (id: string, archived = false): List => ({ ...list(id, archived), is_gift: true });
  const lists = [list('posada'), gift('navidad'), gift('cumple-mama', true)];

  it('Pendientes no abre una lista de regalos', () => {
    expect(resolveListFilter('navidad', lists, 'list')).toBe('all');
    expect(resolveListFilter('posada', lists, 'list')).toBe('posada');
  });

  it('Regalos abre la primera lista de regalos activa si la guardada no aplica', () => {
    expect(resolveListFilter('all', lists, 'gift')).toBe('navidad');
    expect(resolveListFilter('posada', lists, 'gift')).toBe('navidad');
    expect(resolveListFilter('cumple-mama', lists, 'gift')).toBe('navidad');
    expect(resolveListFilter('navidad', lists, 'gift')).toBe('navidad');
  });

  it('sin listas de regalo, Regalos queda en vacío', () => {
    expect(resolveListFilter('all', [list('posada')], 'gift')).toBe('all');
  });
});
