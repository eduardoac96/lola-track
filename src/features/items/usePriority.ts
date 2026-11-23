import { useApp } from '../../app/context';
import { useUpdateItem, type Item, type ItemPriority } from '../../data/items';
import { haptic, useToast } from '../../ui/kit';

/** Cambia prioridad (y opcionalmente orden) con aviso y "Deshacer". */
export function useSetPriority() {
  const { hid } = useApp();
  const update = useUpdateItem(hid);
  const toast = useToast();

  const set = (item: Item, priority: ItemPriority, sortOrder?: number) => {
    if (item.priority === priority && sortOrder === undefined) return;
    haptic();
    const before = { priority: item.priority, sort_order: item.sort_order };
    update.mutate({ id: item.id, patch: { priority, ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}) } });
    if ((item.priority === 'urgente') !== (priority === 'urgente')) {
      toast({
        text: `"${item.title.length > 24 ? `${item.title.slice(0, 23)}…` : item.title}" ${
          priority === 'urgente' ? 'es urgente' : 'ya no es urgente'
        }`,
        action: { label: 'Deshacer', run: () => update.mutate({ id: item.id, patch: before }) },
      });
    }
  };

  return {
    set,
    /** Deslizar a la derecha: urgente ↔ pronto. */
    toggleUrgent: (item: Item) => set(item, item.priority === 'urgente' ? 'pronto' : 'urgente'),
  };
}
