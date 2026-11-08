import { useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

const THRESHOLD = 96;

/**
 * Desliza a la izquierda para eliminar. Solo se activa con gesto horizontal claro
 * (el scroll vertical no se toca) y cancela el click que termina un arrastre.
 * Teclado: Suprimir / Retroceso sobre la fila.
 */
export function SwipeRow({
  children,
  onDelete,
  label,
  className = '',
}: {
  children: ReactNode;
  onDelete: () => void;
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

  return (
    <div className={`relative overflow-hidden ${className}`}>
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
        aria-label={`${label}. Desliza a la izquierda o presiona Suprimir para eliminar.`}
        className="relative touch-pan-y"
        onKeyDown={(e) => {
          if ((e.key === 'Delete' || e.key === 'Backspace') && e.target === e.currentTarget) {
            e.preventDefault();
            onDelete();
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
            setDx(Math.min(0, ddx));
          }
        }}
        onPointerUp={() => {
          const go = dx < -THRESHOLD;
          reset();
          if (go) onDelete();
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
