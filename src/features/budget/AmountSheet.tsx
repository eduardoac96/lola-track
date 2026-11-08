import { useState } from 'react';
import { fmtMXN } from '../../lib/money';
import { Sheet } from '../../ui/Sheet';
import { PrimaryButton, inputCls } from '../../ui/kit';

export type AmountMode = 'restar' | 'sumar';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'] as const;
const CHIPS = [100, 500, 1000, 5000] as const;
const MAX_DIGITS = 7;

/** Pesos enteros como string de dígitos → número. Pura, exportada para tests. */
export function pressKey(current: string, key: (typeof KEYS)[number]): string {
  if (key === 'del') return current.slice(0, -1);
  const next = (current + key).replace(/^0+/, '');
  return next.length > MAX_DIGITS ? current : next;
}
export function addChip(current: string, chip: number): string {
  const next = String((Number(current) || 0) + chip);
  return next.length > MAX_DIGITS ? current : next;
}

interface AmountProps {
  mode: AmountMode | null;
  budgetName: string;
  onClose: () => void;
  onConfirm: (v: { cents: number; concept: string | null }) => void;
}

export function AmountSheet(props: AmountProps) {
  return props.mode ? <AmountForm {...props} mode={props.mode} /> : null;
}

function AmountForm({ mode, budgetName, onClose, onConfirm }: AmountProps & { mode: AmountMode }) {
  const [digits, setDigits] = useState('');
  const [concept, setConcept] = useState('');
  const pesos = Number(digits) || 0;
  const cents = pesos * 100;
  const rest = mode === 'restar';
  const color = !pesos ? '#B3B0C4' : rest ? '#A61E25' : '#1E6B4A';

  return (
    <Sheet
      open
      onClose={onClose}
      title={rest ? `Gasté de ${budgetName}` : `Agregué a ${budgetName}`}
      footer={
        <PrimaryButton
          tone={rest ? 'gasto' : 'abono'}
          disabled={!pesos}
          onClick={() => onConfirm({ cents, concept: concept.trim() || null })}
        >
          {pesos ? `${rest ? 'Restar' : 'Sumar'} ${fmtMXN(cents)}` : 'Escribe un monto'}
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-3">
        <output
          aria-live="polite"
          className="block text-center text-[48px] leading-[1.1] font-extrabold tracking-tight"
          style={{ color }}
        >
          {pesos ? (rest ? '−' : '+') : ''}
          {fmtMXN(cents)}
        </output>
        <label htmlFor="mov-concept" className="sr-only">
          Concepto
        </label>
        <input
          id="mov-concept"
          className={inputCls}
          maxLength={80}
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="¿En qué? (opcional)"
          enterKeyHint="done"
        />
        <div className="grid grid-cols-4 gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDigits((d) => addChip(d, c))}
              className="h-11 rounded-xl border border-[#E2DFEC] bg-card text-[14px] font-extrabold text-primary-hover"
            >
              +{c.toLocaleString('es-MX')}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              aria-label={k === 'del' ? 'Borrar' : k}
              onClick={() => setDigits((d) => pressKey(d, k))}
              className="h-[52px] rounded-[14px] bg-[#F1EFF7] text-[22px] font-bold text-ink active:bg-[#E4E0FF]"
            >
              {k === 'del' ? '⌫' : k}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
