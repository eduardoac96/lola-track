import { useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

const THRESHOLD = 96;

export interface SwipeRightAction {
  /** Texto corto que se ve al deslizar ("Urgente", "Quitar urgente"). */
  label: string;
  icon: IconName;
  /** Clase de fondo (p. ej. bg-[#E5484D]). */
  bg: string;
  run: () => void;
  /** Tecla equivalente para teclado (p. ej. "u"). */
  key?: string;
}

/**
 * Desliza a la izquierda para eliminar y, si se pasa `right`, a la derecha para otra acción.
 * Solo se activa con gesto horizontal claro (el scroll vertical no se toca) y cancela el click
 * que termina un arrastre. Teclado: Suprimir/Retroceso elimina; `right.key` ejecuta la acción derecha.
 */
export function SwipeRow({
  children,
  onDelete,
  right,
  label,
  className = '',
}: {
  children: ReactNode;
  onDelete: () => void;
  right?: SwipeRightAction;
  label: string;
  className?: string;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const horizontal = useRef(false);
  const moved = useRef(false);

  const reset = () => {
    start.current = null;
    horizontal.current = false;
    setDragging(false);
    setDx(0);
  };

  const hints = [
    'Desliza a la izquierda o presiona Suprimir para eliminar',
    right
      ? `a la derecha${right.key ? ` o presiona ${right.key.toUpperCase()}` : ''} para ${right.label.toLowerCase()}`
      : null,
  ]
    .filter(Boolean)
    .join('; ');

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {right && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-start gap-2 pl-5 text-[14px] font-bold text-white ${right.bg}`}
          style={{ opacity: dx > 8 ? 1 : 0 }}
        >
          <span className="transition-transform" style={{ transform: dx > THRESHOLD ? 'scale(1.25)' : 'none' }}>
            <Icon name={right.icon} size={20} />
          </span>
          {right.label}
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-end gap-2 bg-danger pr-5 text-[14px] font-bold text-white"
        style={{ opacity: dx < -8 ? 1 : 0 }}
      >
        <span className="transition-transform" style={{ transform: dx < -THRESHOLD ? 'scale(1.25)' : 'none' }}>
          <Icon name="trash" size={20} />
        </span>
        Eliminar
      </div>
      <div
        tabIndex={0}
        aria-label={`${label}. ${hints}.`}
        className="relative touch-pan-y"
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            onDelete();
          } else if (right?.key && e.key.toLowerCase() === right.key) {
            e.preventDefault();
            right.run();
          }
        }}
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform .2s ease' }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          start.current = { x: e.clientX, y: e.clientY };
          horizontal.current = false;
          moved.current = false;
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const ddx = e.clientX - start.current.x;
          const ddy = e.clientY - start.current.y;
          if (!horizontal.current) {
            if (Math.abs(ddy) > 10 && Math.abs(ddy) > Math.abs(ddx)) {
              start.current = null; // es scroll
              return;
            }
            if (Math.abs(ddx) > 10 && Math.abs(ddx) > Math.abs(ddy)) {
              horizontal.current = true;
              moved.current = true;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }
          }
          if (horizontal.current) {
            setDragging(true);
            setDx(right ? Math.max(-200, Math.min(200, ddx)) : Math.min(0, ddx));
          }
        }}
        onPointerUp={() => {
          const del = dx < -THRESHOLD;
          const act = right && dx > THRESHOLD;
          reset();
          if (del) onDelete();
          else if (act) right.run();
        }}
        onPointerCancel={reset}
        onClickCapture={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
