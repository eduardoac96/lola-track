import { describe, it, expect } from 'vitest';
import type { Item } from '../../data/items';
import { areasOf, groupItems, itemMeta, pendingPurchasesCents, progressOf, sortOrderAt, topUrgent } from './select';

const NOW = new Date('2026-11-08T12:00:00Z');
let n = 0;
function item(p: Partial<Item>): Item {
  n++;
  return {
    id: `i${n}`,
    household_id: 'h',
    type: 'tarea',
    title: `Item ${n}`,
    priority: 'pronto',
    area: null,
    price_estimated_cents: null,
    sort_order: n * 1000,
    price_actual_cents: null,
    due_date: null,
    due_reminded_at: null,
    link_url: null,
    notes: null,
    photo_path: null,
    done_at: null,
    done_by: null,
    budget_movement_id: null,
    created_by: 'u',
    created_at: `2026-11-0${(n % 7) + 1}T10:00:00Z`,
    updated_at: '2026-11-01T10:00:00Z',
    ...p,
  };
}

describe('items/select', () => {
  const cuna = item({
    type: 'compra',
    title: 'Cuna',
    priority: 'urgente',
    price_estimated_cents: 450000,
    area: 'Cuarto niños',
  });
  const muebles = item({ type: 'arreglo', priority: 'urgente', area: 'Sala' });
  const lampara = item({ type: 'compra', priority: 'algun_dia', price_estimated_cents: 65000, area: 'cuarto niños' });
  const monitor = item({
    type: 'compra',
    priority: 'pronto',
    price_estimated_cents: 220000,
    price_actual_cents: 199900,
    done_at: '2026-11-07T10:00:00Z',
  });
  const viejo = item({ priority: 'pronto', done_at: '2026-10-01T10:00:00Z' });
  const all = [cuna, muebles, lampara, monitor, viejo];

  it('agrupa por prioridad en orden y omite grupos vacíos', () => {
    const { groups } = groupItems(all, { type: 'todo', area: null, showAllDone: true, now: NOW });
    expect(groups.map((g) => g.priority)).toEqual(['urgente', 'pronto', 'algun_dia']);
    expect(groups[0]?.pending).toBe(2);
  });

  it('pendientes primero (por orden manual), hechos al final', () => {
    const extra = item({ priority: 'pronto' });
    const { groups } = groupItems([monitor, extra], { type: 'todo', area: null, showAllDone: true, now: NOW });
    expect(groups[0]?.items.map((i) => i.id)).toEqual([extra.id, monitor.id]);
  });

  it('oculta hechos de hace >14 días salvo showAllDone', () => {
    const hidden = groupItems(all, { type: 'todo', area: null, showAllDone: false, now: NOW });
    expect(hidden.hiddenDone).toBe(1);
    expect(hidden.groups.flatMap((g) => g.items).some((i) => i.id === viejo.id)).toBe(false);
    const shown = groupItems(all, { type: 'todo', area: null, showAllDone: true, now: NOW });
    expect(shown.hiddenDone).toBe(0);
  });

  it('filtra por tipo (tareas incluye arreglos) y por área sin distinguir mayúsculas', () => {
    const compras = groupItems(all, { type: 'compra', area: null, showAllDone: true, now: NOW });
    expect(compras.groups.flatMap((g) => g.items)).toHaveLength(3);
    const tareas = groupItems(all, { type: 'tarea', area: null, showAllDone: true, now: NOW });
    expect(
      tareas.groups
        .flatMap((g) => g.items)
        .map((i) => i.type)
        .sort(),
    ).toEqual(['arreglo', 'tarea']);
    const cuarto = groupItems(all, { type: 'todo', area: 'CUARTO NIÑOS', showAllDone: true, now: NOW });
    expect(
      cuarto.groups
        .flatMap((g) => g.items)
        .map((i) => i.id)
        .sort(),
    ).toEqual([cuna.id, lampara.id].sort());
  });

  it('áreas únicas, ordenadas, sin duplicar por mayúsculas', () => {
    expect(areasOf(all)).toEqual(['Cuarto niños', 'Sala']);
  });

  it('total de compras pendientes ignora hechas', () => {
    expect(pendingPurchasesCents(all)).toBe(450000 + 65000);
  });

  it('progreso y urgentes', () => {
    expect(progressOf(all)).toEqual({ done: 2, total: 5, pct: 40, urgentPending: 2 });
    expect(progressOf([])).toEqual({ done: 0, total: 0, pct: 0, urgentPending: 0 });
    expect(topUrgent(all).map((i) => i.id)).toContain(cuna.id);
  });

  it('meta muestra precio real cuando está hecho', () => {
    expect(itemMeta(cuna)).toBe('Compra · Cuarto niños · $4,500');
    expect(itemMeta(monitor)).toBe('Compra · $1,999');
  });

  it('respeta el orden manual (sort_order ascendente)', () => {
    const a = item({ priority: 'urgente', sort_order: 30 });
    const b = item({ priority: 'urgente', sort_order: 10 });
    const c = item({ priority: 'urgente', sort_order: 20 });
    const { groups } = groupItems([a, b, c], { type: 'todo', area: null, showAllDone: true, now: NOW });
    expect(groups[0]?.items.map((i) => i.id)).toEqual([b.id, c.id, a.id]);
  });

  it('sortOrderAt: punto medio y extremos', () => {
    const list = [{ sort_order: 10 }, { sort_order: 20 }, { sort_order: 30 }];
    expect(sortOrderAt(list, 0)).toBe(-990);
    expect(sortOrderAt(list, 1)).toBe(15);
    expect(sortOrderAt(list, 3)).toBe(1030);
    expect(sortOrderAt([], 0)).toBe(0);
  });
});
