/**
 * Dinero: centavos enteros (number en TS ↔ bigint en Postgres). Nunca floats para montos.
 * UI en pesos enteros; formato es-MX: $38,450 · −$2,200 · +$5,000
 */

const MINUS = '−'; // signo menos tipográfico (no guion)

const fmtWhole = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const fmtCents = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function assertCents(cents: number): void {
  if (!Number.isSafeInteger(cents)) throw new RangeError(`Monto inválido (centavos): ${cents}`);
}

/** Pesos → centavos. Acepta hasta 2 decimales; redondea medio centavo hacia arriba. */
export function toCents(pesos: number): number {
  if (!Number.isFinite(pesos)) throw new RangeError(`Monto inválido: ${pesos}`);
  return Math.round(pesos * 100 + (pesos >= 0 ? 1e-9 : -1e-9));
}

export function fromCents(cents: number): number {
  assertCents(cents);
  return cents / 100;
}

export type SignMode = 'auto' | 'always' | 'never';

/**
 * Formatea centavos como MXN. Solo muestra decimales si el monto no es entero.
 * sign: 'auto' (− solo en negativos), 'always' (+/−), 'never' (valor absoluto).
 */
export function fmtMXN(cents: number, sign: SignMode = 'auto'): string {
  assertCents(cents);
  const abs = Math.abs(cents);
  const body = (abs % 100 === 0 ? fmtWhole : fmtCents).format(abs / 100);
  if (sign === 'never' || cents === 0) return body;
  if (cents < 0) return MINUS + body;
  return sign === 'always' ? '+' + body : body;
}

/** Suma segura de centavos. */
export function sumCents(values: readonly number[]): number {
  return values.reduce((acc, v) => {
    assertCents(v);
    return acc + v;
  }, 0);
}

/** Texto de input ('$4,500', '4500.5', '') → centavos o null si vacío/ inválido. */
export function parsePesos(input: string): number | null {
  const clean = input.replace(/[$\s,]/g, '');
  if (!clean) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  return toCents(Number(clean));
}

/** Centavos → texto editable sin símbolo ('4500', '4500.50'). */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return '';
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}
