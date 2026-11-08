/** Fechas en hora local del dispositivo (el hogar vive en America/Monterrey). */

const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'] as const;
const DOW_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;
const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export const DAY_MS = 86_400_000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** 'YYYY-MM-DD' local (para <input type="date"> y agrupar). */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 'HH:mm' local (para <input type="time">). */
export function timeKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Combina 'YYYY-MM-DD' + 'HH:mm' en hora local → Date. */
export function fromLocal(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
}

export const fmtTime = (d: Date): string => timeKey(d);
export const dowShort = (d: Date): string => DOW[d.getDay()] ?? '';

/** 'Sábado 7 de noviembre' */
export function fmtLongDate(d: Date): string {
  return `${DOW_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`;
}

/** 'Hoy, sábado 7' · 'Mañana, domingo 8' · 'Lunes 9' */
export function fmtDayTitle(d: Date, now: Date = new Date()): string {
  const dow = DOW_LONG[d.getDay()] ?? '';
  if (isSameDay(d, now)) return `Hoy, ${dow.toLowerCase()} ${d.getDate()}`;
  if (isSameDay(d, addDays(now, 1))) return `Mañana, ${dow.toLowerCase()} ${d.getDate()}`;
  return `${dow} ${d.getDate()}`;
}

/** Etiqueta corta para listas: 'HOY' · 'MAÑANA' · 'LUN 9' */
export function fmtDayChip(d: Date, now: Date = new Date()): string {
  if (isSameDay(d, now)) return 'HOY';
  if (isSameDay(d, addDays(now, 1))) return 'MAÑANA';
  return `${dowShort(d)} ${d.getDate()}`;
}

/** Fecha relativa para movimientos: 'Hoy' · 'Ayer' · '3 nov' · '3 nov 2025' */
export function fmtRelative(d: Date, now: Date = new Date()): string {
  if (isSameDay(d, now)) return 'Hoy';
  if (isSameDay(d, addDays(now, -1))) return 'Ayer';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** Duración legible: 30 → '30 min', 60 → '1 h', 90 → '1 h 30' */
export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}
