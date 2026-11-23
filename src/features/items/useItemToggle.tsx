import { useState } from 'react';
import { useApp } from '../../app/context';
import { useCompleteItem, useReopenItem, type Item } from '../../data/items';
import { getLastBudget, setLastBudget, useBalances } from '../../data/budgets';
import { useLists } from '../../data/lists';
import { centsToInput, fmtMXN, parsePesos } from '../../lib/money';
import { Sheet } from '../../ui/Sheet';
import { Field, GhostButton, PrimaryButton, haptic, inputCls, useToast } from '../../ui/kit';
import { isDone } from './select';

/**
 * Completar/reabrir.
 * - Compra en una lista con bolsa y con precio estimado: se marca comprada y se resta de la bolsa
 *   al instante; aviso con "Ajustar precio" y "Deshacer" (reabrir borra el movimiento).
 * - Otras compras: sheet que ofrece restar el precio real de una bolsa.
 * Devuelve el handler y el sheet que hay que renderizar.
 */
export function useItemToggle() {
  const { hid, userId } = useApp();
  const complete = useCompleteItem(hid, userId);
  const reopen = useReopenItem(hid);
  const lists = useLists(hid);
  const balances = useBalances(hid);
  const toast = useToast();
  const [buying, setBuying] = useState<{ item: Item; adjust: boolean } | null>(null);

  const listBudgetOf = (item: Item) => lists.data?.find((l) => l.id === item.list_id)?.budget_id ?? null;

  const toggle = (item: Item) => {
    haptic();
    if (isDone(item)) {
      reopen.mutate(item.id);
      return;
    }
    if (item.type !== 'compra') {
      complete.mutate({ id: item.id });
      return;
    }
    const budgetId = listBudgetOf(item);
    const bag = balances.data?.find((b) => b.budget_id === budgetId);
    const price = item.price_estimated_cents;
    if (bag && price && price > 0) {
      complete.mutate({ id: item.id, actualCents: price, budgetId: bag.budget_id });
      toast(
        {
          text: `Comprado\u00a0−\u2060${fmtMXN(price)}`,
          actions: [
            { label: 'Ajustar precio', run: () => setBuying({ item, adjust: true }) },
            { label: 'Deshacer', run: () => reopen.mutate(item.id) },
          ],
        },
        6000,
      );
      return;
    }
    setBuying({ item, adjust: false });
  };

  const sheet = (
    <CompleteSheet
      item={buying?.item ?? null}
      lockedToList={buying ? listBudgetOf(buying.item) != null : false}
      onClose={() => setBuying(null)}
      onConfirm={async (v) => {
        const b = buying!;
        setBuying(null);
        // Ajustar: reabre (borra el movimiento anterior) y vuelve a completar con el precio real.
        if (b.adjust) await reopen.mutateAsync(b.item.id).catch(() => undefined);
        complete.mutate({ id: b.item.id, ...v });
      }}
    />
  );

  return { toggle, sheet };
}

interface CompleteProps {
  item: Item | null;
  /** La lista ya tiene bolsa: no se ofrece "Solo marcar hecho". */
  lockedToList: boolean;
  onClose: () => void;
  onConfirm: (v: { actualCents: number | null; budgetId: string | null }) => void;
}

function CompleteSheet(props: CompleteProps) {
  return props.item ? <CompleteForm key={props.item.id} {...props} item={props.item} /> : null;
}

function CompleteForm({ item, lockedToList, onClose, onConfirm }: CompleteProps & { item: Item }) {
  const { hid } = useApp();
  const balances = useBalances(hid);
  const lists = useLists(hid);
  // La bolsa ligada a la lista del pendiente gana sobre la última usada.
  const listBudget = lists.data?.find((l) => l.id === item.list_id)?.budget_id ?? null;
  const [price, setPrice] = useState(() => centsToInput(item.price_estimated_cents));
  const [picked, setPicked] = useState<string | null>(null);

  const list = balances.data ?? [];
  const last = getLastBudget();
  const budgetId =
    picked ??
    list.find((b) => b.budget_id === listBudget)?.budget_id ??
    list.find((b) => b.budget_id === last)?.budget_id ??
    list[0]?.budget_id ??
    null;
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
              if (budget && budget.budget_id !== listBudget) setLastBudget(budget.budget_id);
              onConfirm({ actualCents: cents, budgetId: budget?.budget_id ?? null });
            }}
          >
            {cents && budget ? `Restar ${fmtMXN(cents)} de ${budget.name}` : 'Escribe el precio'}
          </PrimaryButton>
          {lockedToList ? (
            <GhostButton onClick={onClose}>Cancelar</GhostButton>
          ) : (
            <GhostButton onClick={() => onConfirm({ actualCents: cents, budgetId: null })}>
              Solo marcar hecho
            </GhostButton>
          )}
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
