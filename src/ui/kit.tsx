import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Member } from '../data/household';
import { Icon } from './Icon';

/* ───────── Avatar */
/** Colores guardados con la paleta anterior (morado) → su equivalente en la paleta terracota/salvia. */
const LEGACY_COLORS: Record<string, string> = {
  '#5B47E0': '#B5532F',
  '#F5A524': '#D69A2D',
  '#1E6B4A': '#5F7F64',
  '#D9472B': '#3F6E8C',
};
export function memberColor(color: string | null | undefined): string {
  if (!color) return '#A89D93';
  const c = color.toUpperCase();
  return LEGACY_COLORS[c] ?? c;
}

export function Avatar({ member, size = 36, ring }: { member?: Member | undefined; size?: number; ring?: boolean }) {
  const name = member?.display_name ?? '?';
  const color = memberColor(member?.color);
  const dark = color === '#D69A2D';
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-extrabold"
      style={{
        width: size,
        height: size,
        background: color,
        color: dark ? '#2B221D' : '#FFFFFF',
        fontSize: Math.round(size * 0.4),
        boxShadow: ring ? '0 0 0 3px var(--color-bg)' : undefined,
      }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/* ───────── Segmented control */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
  size?: 'md' | 'sm';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-[14px] bg-track p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex-auto rounded-[11px] font-bold whitespace-nowrap transition-colors ${
              options.length > 4 ? 'px-1 text-[12px]' : 'px-2'
            } ${size === 'sm' ? 'h-10' : 'h-11'} ${options.length > 4 ? '' : size === 'sm' ? 'text-[13px]' : 'text-[14px]'} ${
              on ? 'bg-card text-ink shadow-[0_2px_6px_rgba(43,34,29,0.10)]' : 'text-muted'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── Field */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-muted">{label}</span>
        {children}
      </label>
      {hint && <span className="text-[12px] font-medium text-muted">{hint}</span>}
    </div>
  );
}

export const inputCls =
  'h-12 w-full rounded-[14px] border border-field-line bg-field px-3.5 text-[16px] font-semibold text-ink outline-none focus:border-primary focus:bg-card';

/* ───────── Buttons */
export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = 'button',
  tone = 'primary',
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  tone?: 'primary' | 'gasto' | 'abono' | 'ink';
}) {
  const bg = { primary: 'bg-primary', gasto: 'bg-danger', abono: 'bg-done', ink: 'bg-hero' }[tone];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`h-14 w-full rounded-[18px] text-[17px] font-extrabold text-white transition-opacity disabled:bg-disabled ${bg}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-bold ${
        danger ? 'text-gasto' : 'text-primary-hover'
      }`}
    >
      {children}
    </button>
  );
}

/* ───────── Empty / loading */
export function EmptyCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-5 text-center text-[14px] font-semibold text-muted">
      {children}
    </div>
  );
}

export function Spinner({ label = 'Cargando' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-1 items-center justify-center p-10">
      <span className="size-8 animate-spin rounded-full border-4 border-[#F0DDD3] border-t-primary" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/* ───────── Toast con acción (deshacer) */
interface ToastMsg {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  /** Acciones extra (p. ej. "Ajustar precio" + "Deshacer"). */
  actions?: ReadonlyArray<{ label: string; run: () => void }>;
}
const ToastCtx = createContext<(t: Omit<ToastMsg, 'id'>, ms?: number) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((t: Omit<ToastMsg, 'id'>, ms = 5000) => {
    window.clearTimeout(timer.current);
    setMsg({ ...t, id: Date.now() });
    timer.current = window.setTimeout(() => setMsg(null), ms);
  }, []);
  useEffect(() => {
    const onError = (e: Event) => show({ text: String((e as CustomEvent).detail) }, 4000);
    window.addEventListener('lola:error', onError);
    return () => window.removeEventListener('lola:error', onError);
  }, [show]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[max(12px,env(safe-area-inset-top))] z-[60] flex justify-center px-4 md:pl-24"
      >
        {msg && (
          <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-hero py-2 pr-2 pl-4 text-[14px] font-semibold text-white shadow-xl">
            <span className="min-w-0">{msg.text}</span>
            {[...(msg.actions ?? []), ...(msg.action ? [msg.action] : [])].map((a) => (
              <button
                key={a.label}
                type="button"
                className="h-11 shrink-0 rounded-xl px-3 font-extrabold text-[#F3B394]"
                onClick={() => {
                  a.run();
                  setMsg(null);
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}

/* ───────── Floating action button */
export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed right-5 bottom-[calc(96px+env(safe-area-inset-bottom))] md:right-8 md:bottom-8 z-30 flex size-15 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_24px_rgba(181,83,47,0.35)] active:scale-95"
    >
      <Icon name="plus" size={26} stroke={2.6} />
    </button>
  );
}

/* ───────── Section header */
export function SectionTitle({ children, dot, right }: { children: ReactNode; dot?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="m-0 flex items-center gap-2 text-[18px] font-extrabold">
        {dot && <span className="size-2.5 rounded-full" style={{ background: dot }} aria-hidden="true" />}
        {children}
      </h2>
      {right}
    </div>
  );
}

export const haptic = () => {
  try {
    navigator.vibrate?.(10);
  } catch {
    /* iOS lo ignora */
  }
};

/* ───────── Interruptor con título y descripción */
export function SwitchRow({
  on,
  onChange,
  title,
  hint,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex min-h-14 items-center gap-3 rounded-[14px] bg-bg px-3.5 py-2.5 text-left"
    >
      <span className="flex flex-1 flex-col">
        <span className="text-[15px] font-bold">{title}</span>
        {hint && <span className="text-[12px] font-medium text-muted">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-done' : 'bg-check'}`}
      >
        <span
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
        />
      </span>
    </button>
  );
}
