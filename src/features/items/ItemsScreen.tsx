import { useMemo, useState } from 'react';
import { useApp } from '../../app/context';
import { useItems, type Item } from '../../data/items';
import { fmtMXN } from '../../lib/money';
import { EmptyCard, Segmented, Spinner } from '../../ui/kit';
import { PriorityBoard } from './PriorityBoard';
import { useSetPriority } from './usePriority';
import { useDeleteWithUndo } from './useDeleteWithUndo';
import { ItemSheet } from './ItemSheet';
import { QuickAdd } from './QuickAdd';
import { ChecklistButton } from './ChecklistButton';
import { areasOf, groupItems, isDone, pendingPurchasesCents, type TypeFilter } from './select';
import { useItemToggle } from './useItemToggle';

export function ItemsScreen() {
  const { hid } = useApp();
  const items = useItems(hid);
  const { toggle, sheet } = useItemToggle();
  const priority = useSetPriority();
  const removeItem = useDeleteWithUndo();
  const [type, setType] = useState<TypeFilter>('todo');
  const [area, setArea] = useState<string | null>(null);
  const [showAllDone, setShowAllDone] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const all = useMemo(() => items.data ?? [], [items.data]);
  const areas = useMemo(() => areasOf(all), [all]);
  const { groups, hiddenDone } = useMemo(
    () => groupItems(all, { type, area, showAllDone }),
    [all, type, area, showAllDone],
  );
  const pending = all.filter((i) => !isDone(i)).length;
  const open: Item | null = all.find((i) => i.id === openId) ?? null;

  return (
    <main className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start md:gap-x-10">
      <div className="contents md:sticky md:top-10 md:flex md:flex-col md:gap-4">
        <header className="flex flex-col gap-0.5">
          <h1 className="m-0 text-[30px] font-extrabold tracking-tight">Pendientes</h1>
          <span className="text-[13px] font-semibold text-muted">
            {pending} pendientes · {all.length - pending} hechos
          </span>
        </header>

        <QuickAdd />

        <Segmented
          label="Filtrar por tipo"
          size="sm"
          value={type}
          onChange={setType}
          options={[
            { value: 'todo', label: 'Todo' },
            { value: 'compra', label: 'Compras' },
            { value: 'tarea', label: 'Tareas' },
          ]}
        />

        {areas.length > 0 && (
          <div role="radiogroup" aria-label="Filtrar por área" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {[null, ...areas].map((a) => {
              const on = a === area;
              return (
                <button
                  key={a ?? '__all'}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setArea(a)}
                  className={`h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-bold ${
                    on ? 'border-primary bg-primary text-white' : 'border-line bg-card text-ink'
                  }`}
                >
                  {a ?? 'Todas las áreas'}
                </button>
              );
            })}
          </div>
        )}

        <div className="order-last flex items-center justify-between rounded-[var(--radius-card)] bg-hero px-4 py-3.5 text-white md:order-none">
          <span className="text-[13px] font-semibold text-on-hero">Compras pendientes</span>
          <span className="text-[18px] font-extrabold">{fmtMXN(pendingPurchasesCents(all))}</span>
        </div>
      </div>

      <div className="contents md:flex md:flex-col md:gap-4">
        {items.isLoading && <Spinner />}
        {items.isError && <EmptyCard>No se pudieron cargar los pendientes.</EmptyCard>}
        {items.isSuccess && groups.length === 0 && all.length > 0 && <EmptyCard>Nada con este filtro.</EmptyCard>}
        {items.isSuccess && all.length === 0 && (
          <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-card p-5">
            <p className="m-0 text-[15px] font-bold">Empieza escribiendo arriba, o carga una lista sugerida.</p>
            <p className="m-0 text-[13px] font-medium text-muted">
              ~27 pendientes típicos (seguridad, cuarto, auto, papeleo). Después editas o borras lo que no aplique.
            </p>
            <ChecklistButton />
          </div>
        )}

        {groups.length > 0 && (
          <PriorityBoard
            groups={groups}
            onToggle={toggle}
            onOpen={(it) => setOpenId(it.id)}
            onDelete={removeItem}
            onToggleUrgent={priority.toggleUrgent}
            onMove={(it, p, sortOrder) => priority.set(it, p, sortOrder)}
          />
        )}

        {hiddenDone > 0 && !showAllDone && (
          <button
            type="button"
            onClick={() => setShowAllDone(true)}
            className="h-11 text-[14px] font-bold text-primary-hover"
          >
            Ver hechos antiguos ({hiddenDone})
          </button>
        )}
      </div>

      <ItemSheet item={open} onClose={() => setOpenId(null)} />
      {sheet}
    </main>
  );
}
