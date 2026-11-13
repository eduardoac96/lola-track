import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../../app/context';
import { newId, useCreateItem } from '../../data/items';
import { parseQuickAdd } from '../../lib/quickAdd';
import { fmtMXN } from '../../lib/money';
import { Icon } from '../../ui/Icon';
import { PRIORITIES, TYPES } from './select';

/** Campo único de captura con vista previa de lo que se detectó. */
export function QuickAdd({
  onCreated,
  autoFocus,
  listId = null,
  placeholder = 'Cuna $4500 !urgente @cuarto',
}: {
  onCreated?: () => void;
  autoFocus?: boolean;
  /** Lista donde cae lo capturado (null = General). */
  listId?: string | null;
  placeholder?: string;
}) {
  const { hid, userId } = useApp();
  const create = useCreateItem(hid, userId);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => parseQuickAdd(text), [text]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!parsed.valid) return;
    create.mutate({
      id: newId(),
      title: parsed.title,
      type: parsed.type,
      priority: parsed.priority,
      area: parsed.area,
      price_estimated_cents: parsed.priceCents,
      sort_order: -Date.now(),
      list_id: listId,
    });
    setText('');
    input.current?.focus();
    onCreated?.();
  };

  const prio = PRIORITIES.find((p) => p.value === parsed.priority);
  const showPreview = text.trim().length > 0;

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-[18px] border border-line bg-card py-1.5 pr-1.5 pl-3.5 focus-within:border-primary"
      >
        <label htmlFor="quick-add" className="sr-only">
          Agregar pendiente
        </label>
        <input
          id="quick-add"
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="done"
          autoFocus={autoFocus}
          data-autofocus={autoFocus ? '' : undefined}
          className="h-11 min-w-0 flex-1 border-none bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:text-placeholder"
        />
        <button
          type="submit"
          aria-label="Agregar"
          disabled={!parsed.valid}
          className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-primary text-white disabled:bg-disabled"
        >
          <Icon name="plus" size={22} stroke={2.6} />
        </button>
      </form>
      {showPreview ? (
        <div className="flex flex-wrap gap-1.5 px-1" aria-live="polite">
          <Chip bg={TYPES[parsed.type].tint} fg={TYPES[parsed.type].fg}>
            {TYPES[parsed.type].label}
          </Chip>
          {prio && (
            <Chip bg="var(--color-card)" fg="var(--color-ink)">
              <span className="size-2 rounded-full" style={{ background: prio.dot }} />
              {prio.label}
            </Chip>
          )}
          {parsed.priceCents != null && (
            <Chip bg="var(--color-compra-tint)" fg="var(--color-compra-fg)">
              {fmtMXN(parsed.priceCents)}
            </Chip>
          )}
          {parsed.area && (
            <Chip bg="var(--color-card)" fg="var(--color-ink)">
              @{parsed.area}
            </Chip>
          )}
        </div>
      ) : (
        <p className="m-0 px-1 text-[12px] font-medium text-muted">
          <b>$precio</b> la vuelve compra · <b>!urgente</b> <b>!pronto</b> <b>!algun</b> · <b>@área</b>
        </p>
      )}
    </div>
  );
}

function Chip({ children, bg, fg }: { children: React.ReactNode; bg: string; fg: string }) {
  return (
    <span
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line px-2.5 text-[12px] font-bold"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}
