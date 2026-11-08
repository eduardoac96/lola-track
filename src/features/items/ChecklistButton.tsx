import { useApp } from '../../app/context';
import { useBulkCreateItems, useItems } from '../../data/items';
import { PrimaryButton, useToast } from '../../ui/kit';
import { missingFromChecklist } from './checklist';

/** Carga las sugerencias del checklist de llegada que aún no existen. Se puede usar varias veces sin duplicar. */
export function ChecklistButton({ tone = 'primary' }: { tone?: 'primary' | 'ink' }) {
  const { hid } = useApp();
  const items = useItems(hid);
  const bulk = useBulkCreateItems(hid);
  const toast = useToast();
  const missing = missingFromChecklist((items.data ?? []).map((i) => i.title));

  if (!items.isSuccess) return null;
  if (missing.length === 0) {
    return <p className="m-0 text-[13px] font-medium text-muted">Ya tienes todo el checklist sugerido.</p>;
  }
  return (
    <PrimaryButton
      tone={tone}
      disabled={bulk.isPending}
      onClick={async () => {
        const created = await bulk.mutateAsync(
          missing.map((m) => ({ title: m.title, type: m.type, priority: m.priority, area: m.area })),
        );
        toast({ text: `Se agregaron ${created.length} pendientes sugeridos` });
      }}
    >
      {bulk.isPending ? 'Agregando…' : `Cargar checklist sugerido (${missing.length})`}
    </PrimaryButton>
  );
}
