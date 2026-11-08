import { useApp } from '../../app/context';
import { UNDO_MS, useDeleteItem, useRestoreItem, type Item } from '../../data/items';
import { haptic, useToast } from '../../ui/kit';

/** Elimina un pendiente y ofrece "Deshacer" durante unos segundos. */
export function useDeleteWithUndo() {
  const { hid } = useApp();
  const del = useDeleteItem(hid);
  const restore = useRestoreItem(hid);
  const toast = useToast();

  return (item: Item) => {
    haptic();
    del.mutate(item);
    toast(
      {
        text: `"${item.title.length > 28 ? `${item.title.slice(0, 27)}…` : item.title}" eliminado`,
        action: { label: 'Deshacer', run: () => restore.mutate(item) },
      },
      UNDO_MS,
    );
  };
}
