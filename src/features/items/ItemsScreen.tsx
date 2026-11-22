import { useMemo, useState } from 'react';
import { useApp } from '../../app/context';
import { useItems, useUpdateItem, type Item } from '../../data/items';
import { useLists, type List } from '../../data/lists';
import { Icon } from '../../ui/Icon';
import { fmtMXN } from '../../lib/money';
import { EmptyCard, PrimaryButton, Segmented, Spinner } from '../../ui/kit';
import { PriorityBoard } from './PriorityBoard';
import { useSetPriority } from './usePriority';
import { useDeleteWithUndo } from './useDeleteWithUndo';
import { ItemSheet } from './ItemSheet';
import { QuickAdd } from './QuickAdd';
import { ChecklistButton } from './ChecklistButton';
import { areasOf, groupItems, inList, isDone, pendingPurchasesCents, type ListFilter, type TypeFilter } from './select';
import { ListSheet } from './ListSheet';
import { captureListId, resolveListFilter, useSelectedList, type ListScope } from './selectedList';
import { useItemToggle } from './useItemToggle';
import { GiftPeople, ListBudgetBar } from './ListExtras';
import { nextStage, stageOf } from './gifts';

const TYPE_LABEL: Record<TypeFilter, string> = { todo: 'Todo', compra: 'Compras', tarea: 'Tareas' };

/**
 * Pendientes (scope 'list') o las listas de regalo dentro de Regalos (scope 'gift').
 * Cada espacio ve solo sus listas y recuerda su lista abierta.
 */
export function ItemsScreen({ scope = 'list' }: { scope?: ListScope }) {
  const gifts = scope === 'gift';
  const { hid } = useApp();
  const items = useItems(hid);
  const updateItem = useUpdateItem(hid);
  const lists = useLists(hid);
  const [rawList, setList] = useSelectedList(hid, scope);
  const [listSheet, setListSheet] = useState<'new' | List | null>(null);
  const { toggle, sheet } = useItemToggle();
  const priority = useSetPriority();
  const removeItem = useDeleteWithUndo();
  const [type, setType] = useState<TypeFilter>('todo');
  const [area, setArea] = useState<string | null>(null);
  const [showAllDone, setShowAllDone] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const everything = useMemo(() => items.data ?? [], [items.data]);
  const live = useMemo(() => (lists.data ?? []).filter((l) => !l.archived_at), [lists.data]);
  const giftLists = useMemo(() => new Set(live.filter((l) => l.is_gift).map((l) => l.id)), [live]);
  const isGiftItem = (i: Item) => i.list_id != null && giftLists.has(i.list_id);
  const active = useMemo(() => live.filter((l) => l.is_gift === gifts), [live, gifts]);
  // Lo de las listas de regalo vive en Regalos; Pendientes ve todo lo demás.
  const all = useMemo(
    () => everything.filter((i) => (i.list_id != null && giftLists.has(i.list_id)) === gifts),
    [everything, giftLists, gifts],
  );
  const list = resolveListFilter(rawList, lists.data, scope);
  const current = active.find((l) => l.id === list);
  const inSel = useMemo(() => all.filter((i) => inList(i, list)), [all, list]);
  const areas = useMemo(() => areasOf(inSel), [inSel]);
  const { groups, hiddenDone } = useMemo(
    () => groupItems(all, { type, area, showAllDone, list }),
    [all, type, area, showAllDone, list],
  );
  const pending = inSel.filter((i) => !isDone(i)).length;
  const pendingIn = (f: ListFilter) => all.filter((i) => !isDone(i) && inList(i, f)).length;
  const names = useMemo(() => new Map(active.map((l) => [l.id, l.name])), [active]);
  const listNameOf =
    list === 'all' && active.length > 0 ? (i: Item) => (i.list_id ? names.get(i.list_id) : undefined) : undefined;
  const pickList = (f: ListFilter) => {
    if (f === list && current) {
      setListSheet(current); // tocar la lista abierta = editarla
      return;
    }
    setList(f);
    setArea(null);
  };
  const advanceStage = (i: Item) => {
    const s = stageOf(i);
    const next = nextStage(s);
    // Entregado → vuelve a Comprado (por si fue un toque de más)
    updateItem.mutate({ id: i.id, patch: { gift_stage: next ?? null } });
  };
  const activeFilters = [type !== 'todo' ? TYPE_LABEL[type] : null, area].filter(Boolean) as string[];
  const open: Item | null = everything.find((i) => i.id === openId) ?? null;

  if (gifts && lists.isSuccess && active.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-card p-5">
        <p className="m-0 text-[15px] font-bold">Arma una lista para Navidad, un cumpleaños o la posada.</p>
        <p className="m-0 text-[13px] font-medium text-muted">
          Para quién es cada regalo, topes por persona y Comprado → Envuelto → Entregado.
        </p>
        <PrimaryButton onClick={() => setListSheet('new')}>Nueva lista de regalos</PrimaryButton>
        <ListSheet target={listSheet} gift onClose={() => setListSheet(null)} />
      </div>
    );
  }

  const Root = gifts ? 'div' : 'main';
  return (
    <Root className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start md:gap-x-10">
      <div className="contents md:sticky md:top-10 md:flex md:flex-col md:gap-4">
        {!gifts && (
          <header className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h1 className="m-0 truncate text-[30px] font-extrabold tracking-tight">
                {current?.name ?? 'Pendientes'}
              </h1>
              <span className="text-[13px] font-semibold text-muted">
                {pending} pendientes · {inSel.length - pending} hechos
              </span>
            </div>
            {active.length === 0 && (
              <button
                type="button"
                onClick={() => setListSheet('new')}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 text-[13px] font-bold text-ink"
              >
                <Icon name="plus" size={16} stroke={2.6} /> Lista
              </button>
            )}
          </header>
        )}

        {active.length > 0 && (
          <div role="radiogroup" aria-label="Lista" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {(
              [
                ...(gifts
                  ? []
                  : [
                      { f: 'all', label: 'Todas' },
                      { f: 'general', label: 'General' },
                    ]),
                ...active.map((l) => ({ f: l.id, label: l.name })),
              ] as Array<{ f: ListFilter; label: string }>
            ).map(({ f, label }) => {
              const on = f === list;
              const n = f === 'all' ? 0 : pendingIn(f);
              const editable = on && f !== 'all' && f !== 'general';
              return (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={editable ? `${label} (tocar para editar la lista)` : undefined}
                  onClick={() => pickList(f)}
                  className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[14px] font-bold ${
                    on ? 'border-hero bg-hero text-white' : 'border-line bg-card text-ink'
                  }`}
                >
                  <span className="max-w-[160px] truncate">{label}</span>
                  {n > 0 && <span className={`text-[12px] ${on ? 'text-on-hero' : 'text-muted'}`}>{n}</span>}
                  {editable && <Icon name="pencil" size={14} />}
                </button>
              );
            })}
            <button
              type="button"
              aria-label="Nueva lista"
              onClick={() => setListSheet('new')}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-dashed border-line bg-card text-ink"
            >
              <Icon name="plus" size={18} stroke={2.6} />
            </button>
          </div>
        )}

        <QuickAdd
          listId={captureListId(list)}
          gift={current?.is_gift ?? false}
          placeholder={current?.is_gift ? 'Lego $800 @Mamá' : current ? `Agregar a ${current.name}…` : undefined}
        />

        {current?.is_gift && <GiftPeople list={current} items={inSel} />}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters || activeFilters.length > 0}
            className={`flex h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold ${
              activeFilters.length > 0 ? 'border-primary bg-primary text-white' : 'border-line bg-card text-muted'
            }`}
          >
            {activeFilters.length > 0 ? activeFilters.join(' · ') : 'Filtrar'}
          </button>
          {activeFilters.length > 0 && (
            <button
              type="button"
              aria-label="Quitar filtros"
              onClick={() => {
                setType('todo');
                setArea(null);
                setShowFilters(false);
              }}
              className="flex size-11 items-center justify-center rounded-full border border-line bg-card text-muted"
            >
              <Icon name="close" size={16} stroke={2.6} />
            </button>
          )}
        </div>

        {(showFilters || activeFilters.length > 0) && (
          <>
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
              <div
                role="radiogroup"
                aria-label="Filtrar por área"
                className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
              >
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
          </>
        )}

        {current?.budget_id ? (
          <ListBudgetBar list={current} items={inSel} />
        ) : (
          <div className="order-last flex items-center justify-between rounded-[var(--radius-card)] bg-hero px-4 py-3.5 text-white md:order-none">
            <span className="truncate text-[13px] font-semibold text-on-hero">
              Compras pendientes{current ? ` · ${current.name}` : list === 'general' ? ' · General' : ''}
            </span>
            <span className="text-[18px] font-extrabold">{fmtMXN(pendingPurchasesCents(inSel))}</span>
          </div>
        )}
      </div>

      <div className="contents md:flex md:flex-col md:gap-4">
        {items.isLoading && <Spinner />}
        {items.isError && <EmptyCard>No se pudieron cargar los pendientes.</EmptyCard>}
        {items.isSuccess && all.length > 0 && inSel.length === 0 && current && (
          <EmptyCard>Lista vacía. Lo que escribas arriba se agrega a {current.name}.</EmptyCard>
        )}
        {items.isSuccess && groups.length === 0 && inSel.length > 0 && <EmptyCard>Nada con este filtro.</EmptyCard>}
        {items.isSuccess && all.length === 0 && !gifts && (
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
            listNameOf={listNameOf}
            stageOf={(i) => (isGiftItem(i) ? stageOf(i) : undefined)}
            onAdvanceStage={advanceStage}
            olderDone={!showAllDone ? { count: hiddenDone, onShow: () => setShowAllDone(true) } : undefined}
          />
        )}
      </div>

      <ItemSheet item={open} onClose={() => setOpenId(null)} />
      <ListSheet target={listSheet} gift={gifts} onClose={() => setListSheet(null)} />
      {sheet}
    </Root>
  );
}
