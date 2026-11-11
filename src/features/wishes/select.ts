import type { Wish, WishClaim } from '../../data/wishes';
import { fmtMXN, parsePesos } from '../../lib/money';

/** "Audífonos $2,500" → { title: 'Audífonos', priceCents: 250000 }. El precio es opcional. */
export function parseWishInput(raw: string): { title: string; priceCents: number | null } {
  let priceCents: number | null = null;
  const title = raw
    .replace(/\$\s?(\d[\d,]*(?:\s\d{3})*(?:\.\d{1,2})?)/, (_m, num: string) => {
      priceCents = parsePesos(num.replace(/\s/g, ''));
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { title, priceCents };
}

/** Lista de una persona: favoritos primero, luego orden manual; lo que "ya tiene" al final. */
export function wishesOf(all: readonly Wish[], ownerId: string): { open: Wish[]; got: Wish[] } {
  const mine = all.filter((w) => w.owner_id === ownerId);
  const byOrder = (a: Wish, b: Wish) =>
    Number(b.starred) - Number(a.starred) || a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);
  return {
    open: mine.filter((w) => !w.got_at).sort(byOrder),
    got: mine.filter((w) => w.got_at).sort((a, b) => (b.got_at ?? '').localeCompare(a.got_at ?? '')),
  };
}

/** Suma de precios de los deseos abiertos (los que no tienen precio no cuentan). */
export const openTotalCents = (open: readonly Wish[]): number =>
  open.reduce((acc, w) => acc + (w.price_estimated_cents ?? 0), 0);

export function linkHost(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function wishMeta(w: Wish): string {
  return [w.price_estimated_cents != null ? fmtMXN(w.price_estimated_cents) : null, linkHost(w.link_url)]
    .filter(Boolean)
    .join(' · ');
}

export const claimOf = (claims: readonly WishClaim[], wishId: string): WishClaim | undefined =>
  claims.find((c) => c.wish_id === wishId);

export const CLAIM_LABEL = { apartado: 'Apartado', comprado: 'Comprado' } as const;
