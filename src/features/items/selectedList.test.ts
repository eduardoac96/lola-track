import { describe, expect, it } from 'vitest';
import type { List } from '../../data/lists';
import { captureListId, resolveListFilter } from './selectedList';

const list = (id: string, archived = false): List => ({
  id,
  household_id: 'h',
  name: id,
  sort_order: 0,
  archived_at: archived ? '2026-11-01T00:00:00Z' : null,
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
