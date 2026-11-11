import { describe, expect, it } from 'vitest';
import type { Wish } from '../../data/wishes';
import { linkHost, openTotalCents, parseWishInput, wishesOf, wishMeta } from './select';

const w = (p: Partial<Wish>): Wish => ({
  id: Math.random().toString(36),
  household_id: 'h',
  owner_id: 'a',
  title: 'x',
  price_estimated_cents: null,
  link_url: null,
  notes: null,
  starred: false,
  got_at: null,
  sort_order: 0,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  ...p,
});

describe('parseWishInput', () => {
  it('extrae el precio en cualquier posición', () => {
    expect(parseWishInput('Audífonos $2,500')).toEqual({ title: 'Audífonos', priceCents: 250000 });
    expect(parseWishInput('$899.50 libro de cocina')).toEqual({ title: 'libro de cocina', priceCents: 89950 });
    expect(parseWishInput('Bolsa $ 1 200 negra')).toEqual({ title: 'Bolsa negra', priceCents: 120000 });
  });
  it('sin precio deja el título', () => {
    expect(parseWishInput('  Una planta  ')).toEqual({ title: 'Una planta', priceCents: null });
  });
  it('solo precio → título vacío', () => {
    expect(parseWishInput('$500').title).toBe('');
  });
});

describe('wishesOf', () => {
  it('filtra por dueño, favoritos primero y lo que ya tiene al final', () => {
    const list = [
      w({ id: '1', title: 'uno', sort_order: 1 }),
      w({ id: '2', title: 'dos', sort_order: 2, starred: true }),
      w({ id: '3', title: 'tres', sort_order: 0, got_at: '2026-11-05T00:00:00Z' }),
      w({ id: '4', owner_id: 'b' }),
    ];
    const r = wishesOf(list, 'a');
    expect(r.open.map((x) => x.id)).toEqual(['2', '1']);
    expect(r.got.map((x) => x.id)).toEqual(['3']);
  });
});

describe('totales y meta', () => {
  it('suma solo los que tienen precio', () => {
    expect(openTotalCents([w({ price_estimated_cents: 1000 }), w({}), w({ price_estimated_cents: 50 })])).toBe(1050);
  });
  it('meta con precio y dominio', () => {
    expect(wishMeta(w({ price_estimated_cents: 250000, link_url: 'https://www.amazon.com.mx/dp/X' }))).toBe(
      '$2,500 · amazon.com.mx',
    );
    expect(linkHost('no es url')).toBeNull();
  });
});
