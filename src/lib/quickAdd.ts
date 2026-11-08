/**
 * Captura rápida: "Cuna $4,500 !urgente @cuarto" → { title, type, priority, area, priceCents }
 *
 * Tokens (cualquier orden, sin distinguir mayúsculas/acentos):
 *   $4500 · $4,500 · $4 500 · $4500.50   → precio estimado (centavos) e infiere tipo "compra"
 *   !urgente|!u · !pronto|!p · !algun|!algún|!algundia|!a → prioridad (default "pronto")
 *   #compra · #arreglo · #tarea           → tipo explícito (gana sobre la inferencia)
 *   @area · @"area con espacios"          → área
 */

export type ItemType = 'compra' | 'arreglo' | 'tarea';
export type ItemPriority = 'urgente' | 'pronto' | 'algun_dia';

export interface QuickAddResult {
  title: string;
  type: ItemType;
  priority: ItemPriority;
  area: string | null;
  priceCents: number | null;
  /** true si hay título utilizable */
  valid: boolean;
}

const stripAccents = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

const PRICE_RE = /(^|\s)\$\s?(\d{1,3}(?:[ ,]\d{3})+|\d+)(?:\.(\d{1,2}))?(?=\s|$)/;
const PRIO_RE = /(^|\s)!(urgente|u|pronto|p|algun(?:[_ ]?dia)?|a)(?=\s|$)/i;
const TYPE_RE = /(^|\s)#(compra|arreglo|tarea)s?(?=\s|$)/i;
const AREA_QUOTED_RE = /(^|\s)@"([^"]{1,40})"/;
const AREA_RE = /(^|\s)@([^\s@#!$"]{1,40})/;

const PRIO_MAP: Record<string, ItemPriority> = {
  urgente: 'urgente',
  u: 'urgente',
  pronto: 'pronto',
  p: 'pronto',
  a: 'algun_dia',
  algun: 'algun_dia',
  algundia: 'algun_dia',
  algun_dia: 'algun_dia',
  'algun dia': 'algun_dia',
};

export function parseQuickAdd(input: string): QuickAddResult {
  // Regexes run on an accent-free copy; matched spans are mapped back and cut
  // from the ORIGINAL text, so the title keeps its accents.
  let text = input.normalize('NFC');
  let priceCents: number | null = null;
  let priority: ItemPriority = 'pronto';
  let explicitType: ItemType | null = null;
  let area: string | null = null;

  const take = (re: RegExp): RegExpExecArray | null => {
    const m = re.exec(stripAccents(text));
    if (!m) return null;
    const start = mapIndex(text, m.index);
    const end = mapIndex(text, m.index + m[0].length);
    const original = text.slice(start, end);
    text = text.slice(0, start) + ' ' + text.slice(end);
    return Object.assign(m, { original });
  };

  const price = take(PRICE_RE);
  if (price) {
    const whole = Number((price[2] ?? '').replace(/[ ,]/g, ''));
    const frac = price[3] ? Number(price[3].padEnd(2, '0')) : 0;
    if (Number.isFinite(whole)) priceCents = whole * 100 + frac;
  }

  const prio = take(PRIO_RE);
  if (prio) priority = PRIO_MAP[(prio[2] ?? '').toLowerCase()] ?? 'pronto';

  const type = take(TYPE_RE);
  if (type) explicitType = (type[2] ?? 'tarea').toLowerCase() as ItemType;

  const areaQ = take(AREA_QUOTED_RE);
  if (areaQ) {
    area = (areaQ as RegExpExecArray & { original: string }).original.trim().slice(2, -1).trim();
  } else {
    const a = take(AREA_RE);
    if (a) area = (a as RegExpExecArray & { original: string }).original.trim().slice(1);
  }

  const title = text.replace(/\s+/g, ' ').trim();
  const finalTitle = title ? title.charAt(0).toLocaleUpperCase('es-MX') + title.slice(1) : '';

  return {
    title: finalTitle,
    type: explicitType ?? (priceCents !== null ? 'compra' : 'tarea'),
    priority,
    area: area || null,
    priceCents,
    valid: finalTitle.length > 0 && finalTitle.length <= 200,
  };
}

/** Maps an index in stripAccents(s) back to an index in s (NFC). */
function mapIndex(s: string, strippedIdx: number): number {
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (count === strippedIdx) return i;
    count += stripAccents(s.charAt(i)).length;
  }
  return s.length;
}
