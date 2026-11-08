import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Member } from '../data/household';
import { Icon } from './Icon';

/* ───────── Avatar */
export function Avatar({ member, size = 36, ring }: { member?: Member | undefined; size?: number; ring?: boolean }) {
  const name = member?.display_name ?? '?';
  const color = member?.color ?? '#9C99B0';
  const dark = color.toUpperCase() === '#F5A524';
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-extrabold"
      style={{
        width: size,
        height: size,
        background: color,
        color: dark ? '#1C1A2B' : '#FFFFFF',
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
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-[14px] bg-[#E9E7F2] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`rounded-[11px] font-bold transition-colors ${size === 'sm' ? 'h-10 text-[13px]' : 'h-11 text-[14px]'} ${
              on ? 'bg-card text-ink shadow-[0_2px_6px_rgba(28,26,43,0.10)]' : 'text-[#5E5B73]'
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
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold text-muted">{label}</span>
      {children}
      {hint && <span className="text-[12px] font-medium text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'h-12 w-full rounded-[14px] border border-[#E2DFEC] bg-[#F8F7FC] px-3.5 text-[16px] font-semibold text-ink outline-none focus:border-primary focus:bg-card';

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
  const bg = { primary: 'bg-primary', gasto: 'bg-[#B4232A]', abono: 'bg-abono', ink: 'bg-ink' }[tone];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`h-14 w-full rounded-[18px] text-[17px] font-extrabold text-white transition-opacity disabled:bg-[#B3B0C4] ${bg}`}
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
      <span className="size-8 animate-spin rounded-full border-4 border-[#E4E0FF] border-t-primary" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/* ───────── Toast con acción (deshacer) */
interface ToastMsg {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
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
        className="pointer-events-none fixed inset-x-0 bottom-[104px] z-[60] flex justify-center px-4"
      >
        {msg && (
          <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink py-2 pr-2 pl-4 text-[14px] font-semibold text-white shadow-xl">
            <span>{msg.text}</span>
            {msg.action && (
              <button
                type="button"
                className="h-10 rounded-xl px-3 font-extrabold text-[#C9C2FF]"
                onClick={() => {
                  msg.action?.run();
                  setMsg(null);
                }}
              >
                {msg.action.label}
              </button>
            )}
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
      className="fixed right-5 bottom-[calc(96px+env(safe-area-inset-bottom))] z-30 flex size-15 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_24px_rgba(91,71,224,0.35)] active:scale-95"
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
