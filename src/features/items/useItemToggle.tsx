import { useState } from 'react';
import { useApp } from '../../app/context';
import { useCompleteItem, useReopenItem, type Item } from '../../data/items';
import { getLastBudget, setLastBudget, useBalances } from '../../data/budgets';
import { centsToInput, fmtMXN, parsePesos } from '../../lib/money';
import { Sheet } from '../../ui/Sheet';
import { Field, GhostButton, PrimaryButton, haptic, inputCls } from '../../ui/kit';
import { isDone } from './select';

/**
 * Completar/reabrir. Para compras abre un sheet que ofrece restar el precio real de una bolsa.
 * Devuelve el handler y el sheet que hay que renderizar.
 */
export function useItemToggle() {
  const { hid, userId } = useApp();
  const complete = useCompleteItem(hid, userId);
  const reopen = useReopenItem(hid);
  const [buying, setBuying] = useState<Item | null>(null);

  const toggle = (item: Item) => {
    haptic();
    if (isDone(item)) reopen.mutate(item.id);
    else if (item.type === 'compra') setBuying(item);
    else complete.mutate({ id: item.id });
  };

  const sheet = (
    <CompleteSheet
      item={buying}
      onClose={() => setBuying(null)}
      onConfirm={(v) => {
        complete.mutate({ id: buying!.id, ...v });
        setBuying(null);
      }}
    />
  );

  return { toggle, sheet };
}

interface CompleteProps {
  item: Item | null;
  onClose: () => void;
  onConfirm: (v: { actualCents: number | null; budgetId: string | null }) => void;
}

function CompleteSheet(props: CompleteProps) {
  return props.item ? <CompleteForm key={props.item.id} {...props} item={props.item} /> : null;
}

function CompleteForm({ item, onClose, onConfirm }: CompleteProps & { item: Item }) {
  const { hid } = useApp();
  const balances = useBalances(hid);
  const [price, setPrice] = useState(() => centsToInput(item.price_estimated_cents));
  const [picked, setPicked] = useState<string | null>(null);

  const list = balances.data ?? [];
  const last = getLastBudget();
  const budgetId = picked ?? list.find((b) => b.budget_id === last)?.budget_id ?? list[0]?.budget_id ?? null;
  const cents = parsePesos(price);
  const budget = list.find((b) => b.budget_id === budgetId);

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Compraste: ${item.title}`}
      footer={
        <div className="flex flex-col gap-1">
          <PrimaryButton
            tone="gasto"
            disabled={!cents || !budget}
            onClick={() => {
              if (budget) setLastBudget(budget.budget_id);
              onConfirm({ actualCents: cents, budgetId: budget?.budget_id ?? null });
            }}
          >
            {cents && budget ? `Restar ${fmtMXN(cents)} de ${budget.name}` : 'Escribe el precio'}
          </PrimaryButton>
          <GhostButton onClick={() => onConfirm({ actualCents: cents, budgetId: null })}>Solo marcar hecho</GhostButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="¿Cuánto costó?">
          <input
            className={`${inputCls} h-14 text-[24px]`}
            inputMode="decimal"
            value={price}
            placeholder="$0"
            onChange={(e) => setPrice(e.target.value)}
            data-autofocus
          />
        </Field>
        {(balances.data?.length ?? 0) > 0 && (
          <div role="radiogroup" aria-label="Bolsa" className="flex flex-wrap gap-2">
            {balances.data?.map((b) => {
              const on = b.budget_id === budgetId;
              return (
                <button
                  key={b.budget_id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPicked(b.budget_id)}
                  className={`h-11 rounded-full border-2 px-4 text-[14px] font-bold ${
                    on ? 'border-primary bg-primary text-white' : 'border-line bg-card text-ink'
                  }`}
                >
                  {b.name} · {fmtMXN(b.available_cents)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}
