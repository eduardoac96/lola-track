import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Bottom sheet: backdrop, Esc, arrastrar hacia abajo para cerrar, scroll interno,
 * foco inicial en el primer control y retorno del foco al cerrar.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select');
      first?.focus({ preventScroll: true });
    }, 60);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
      setDragY(0);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-ink/45 animate-[fade_.15s_ease-out]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[var(--radius-sheet)] bg-card shadow-2xl animate-[sheet_.2s_ease-out]"
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragY ? 'none' : undefined }}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center px-5 pt-2"
          onPointerDown={(e) => {
            start.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => start.current != null && setDragY(Math.max(0, e.clientY - start.current))}
          onPointerUp={() => {
            if (dragY > 110) onClose();
            setDragY(0);
            start.current = null;
          }}
          onPointerCancel={() => {
            setDragY(0);
            start.current = null;
          }}
        >
          <span className="mb-2 h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
          <div className="flex w-full items-center justify-between gap-3">
            <h2 id={titleId} className="m-0 text-[17px] font-extrabold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex size-11 items-center justify-center rounded-full bg-[#F1EFF7] text-ink"
            >
              <Icon name="close" size={18} stroke={2.6} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-4">{children}</div>
        {footer && <div className="shrink-0 px-5 pt-1 pb-[max(20px,env(safe-area-inset-bottom))]">{footer}</div>}
        {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
      </div>
    </div>
  );
}
