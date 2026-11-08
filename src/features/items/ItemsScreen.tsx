import { useMemo, useState } from 'react';
import { useApp } from '../../app/context';
import { useItems, type Item } from '../../data/items';
import { fmtMXN } from '../../lib/money';
import { EmptyCard, Segmented, SectionTitle, Spinner } from '../../ui/kit';
import { ItemCard } from './ItemCard';
import { ItemSheet } from './ItemSheet';
import { QuickAdd } from './QuickAdd';
import { areasOf, groupItems, isDone, pendingPurchasesCents, type TypeFilter } from './select';
import { useItemToggle } from './useItemToggle';

export function ItemsScreen() {
  const { hid } = useApp();
  const items = useItems(hid);
  const { toggle, sheet } = useItemToggle();
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
    <main className="flex flex-col gap-4">
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
          { value: 'arreglo', label: 'Arreglos' },
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
                  on ? 'border-ink bg-ink text-white' : 'border-line bg-card text-ink'
                }`}
              >
                {a ?? 'Todas las áreas'}
              </button>
            );
          })}
        </div>
      )}

      {items.isLoading && <Spinner />}
      {items.isError && <EmptyCard>No se pudieron cargar los pendientes.</EmptyCard>}
      {items.isSuccess && groups.length === 0 && (
        <EmptyCard>{all.length ? 'Nada con este filtro.' : 'Escribe arriba tu primer pendiente.'}</EmptyCard>
      )}

      {groups.map((g) => (
        <section key={g.priority} className="flex flex-col gap-2">
          <SectionTitle dot={g.dot}>
            {g.label} <span className="text-[13px] font-bold text-muted">{g.pending}</span>
          </SectionTitle>
          {g.items.map((it) => (
            <ItemCard key={it.id} item={it} onToggle={() => toggle(it)} onOpen={() => setOpenId(it.id)} />
          ))}
        </section>
      ))}

      {hiddenDone > 0 && !showAllDone && (
        <button
          type="button"
          onClick={() => setShowAllDone(true)}
          className="h-11 text-[14px] font-bold text-primary-hover"
        >
          Ver hechos antiguos ({hiddenDone})
        </button>
      )}

      <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-ink px-4 py-3.5 text-white">
        <span className="text-[13px] font-semibold text-[#D9D6EA]">Compras pendientes</span>
        <span className="text-[18px] font-extrabold">{fmtMXN(pendingPurchasesCents(all))}</span>
      </div>

      <ItemSheet item={open} onClose={() => setOpenId(null)} />
      {sheet}
    </main>
  );
}
