import { useApp } from '../../app/context';
import {
  useFinPlanPoints,
  useFinPlanSteps,
  useToggleStep,
  type FinAccount,
  type FinPlanStep,
} from '../../data/finance';
import { fmtMXN } from '../../lib/money';
import { Icon } from '../../ui/Icon';
import { EmptyCard, Spinner, haptic } from '../../ui/kit';
import { monthKey, monthLabel, planStatus, planTable } from './plan';

/** Camino: paso actual, "¿voy bien?" contra el plan, hitos y saldos esperados mes a mes. */
export function CaminoView({ accounts }: { accounts: FinAccount[] }) {
  const { hid, userId } = useApp();
  const steps = useFinPlanSteps(hid, userId);
  const points = useFinPlanPoints(hid, userId);
  const toggle = useToggleStep(hid, userId);

  if (steps.isLoading || points.isLoading) return <Spinner />;
  const st = planStatus(new Date(), steps.data ?? [], points.data ?? [], accounts);
  const table = planTable(points.data ?? [], accounts);
  const thisMonth = monthKey(new Date());
  const total = st.steps.length;

  if (total === 0 && table.length === 0) {
    return <EmptyCard>Todavía no hay un plan cargado.</EmptyCard>;
  }

  const behind = st.checks.filter((c) => c.behind);
  const overdue = st.steps.filter((r) => r.overdue);

  return (
    <div className="flex flex-col gap-4">
      {/* ¿Voy bien? */}
      <section className="flex flex-col gap-2 rounded-[var(--radius-hero)] bg-hero px-5 py-5 text-white">
        <span className="text-[13px] font-semibold text-on-hero">
          {st.current ? `Paso ${st.current.index + 1} de ${total}` : 'Plan completo'}
        </span>
        <span className="text-[26px] leading-tight font-extrabold">
          {st.current ? st.current.step.title : 'Cumpliste todos los pasos'}
        </span>
        {st.current && (
          <span className="text-[15px] font-semibold text-on-hero">
            {st.current.remaining != null && st.current.remaining > 0 && <>Faltan {fmtMXN(st.current.remaining)}</>}
            {st.current.remaining != null && st.current.remaining > 0 && st.current.step.due_month && ' · '}
            {st.current.step.due_month && <>Meta: {monthLabel(st.current.step.due_month)}</>}
          </span>
        )}
        <span
          className={`mt-1 self-start rounded-full px-3 py-1 text-[13px] font-extrabold ${
            st.onTrack ? 'bg-abono-tint text-abono' : 'bg-gasto-tint text-gasto'
          }`}
        >
          {st.onTrack
            ? 'En camino'
            : behind.length
              ? `Atrasado: ${behind.map((c) => `${c.account.name} ${fmtMXN(-c.diff)}`).join(' · ')}`
              : `Atrasado: ${overdue[0]?.step.title ?? ''}`}
        </span>
      </section>

      {/* Contra el plan */}
      <section className="flex flex-col gap-2">
        <h2 className="m-0 text-[18px] font-extrabold">
          {st.refMonth ? `Contra el plan (cierre de ${monthLabel(st.refMonth)})` : 'Contra el plan'}
        </h2>
        {st.checks.length === 0 ? (
          <EmptyCard>La primera revisión se hace al cerrar el primer mes del plan.</EmptyCard>
        ) : (
          <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[20px] border border-line bg-card p-0">
            {st.checks.map((c, n) => (
              <li
                key={c.account.id}
                className={`flex min-h-12 items-center gap-3 px-4 py-2 ${n === st.checks.length - 1 ? '' : 'border-b border-line-soft'}`}
              >
                <span className="flex-1 text-[15px] font-bold">{c.account.name}</span>
                <span className="flex flex-col items-end">
                  <span className="text-[15px] font-extrabold">{fmtMXN(c.actual)}</span>
                  <span className="text-[12px] font-semibold text-muted">Plan {fmtMXN(c.expected)}</span>
                </span>
                <span
                  className={`w-20 text-right text-[13px] font-extrabold ${c.diff >= 0 ? 'text-abono' : c.behind ? 'text-gasto' : 'text-muted'}`}
                >
                  {c.diff === 0 ? 'Igual' : `${c.diff > 0 ? '+' : '−'}${fmtMXN(Math.abs(c.diff))}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pasos */}
      {total > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[18px] font-extrabold">Pasos</h2>
          <ol className="m-0 flex list-none flex-col overflow-hidden rounded-[20px] border border-line bg-card p-0">
            {st.steps.map((r, n) => (
              <StepRow
                key={r.step.id}
                step={r.step}
                done={r.done}
                current={st.current?.index === n}
                overdue={r.overdue}
                remaining={r.remaining}
                last={n === total - 1}
                onToggle={() => {
                  haptic();
                  toggle.mutate(r.step);
                }}
              />
            ))}
          </ol>
        </section>
      )}

      {/* Mes a mes */}
      {table.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[18px] font-extrabold">Mes a mes (saldo esperado al cierre)</h2>
          <div className="overflow-x-auto rounded-[20px] border border-line bg-card">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className="sticky left-0 bg-card px-3 py-2 font-bold">Mes</th>
                  {table[0]!.values.map((v) => (
                    <th key={v.account.id} className="px-3 py-2 text-right font-bold whitespace-nowrap">
                      {v.account.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map((row) => {
                  const now = row.month === thisMonth;
                  return (
                    <tr key={row.month} className={`border-t border-line-soft ${now ? 'bg-soft' : ''}`}>
                      <th
                        scope="row"
                        className="sticky left-0 bg-inherit px-3 py-2 text-left font-extrabold whitespace-nowrap"
                      >
                        {monthLabel(row.month)}
                        {now && <span className="ml-1 text-[11px] font-bold text-primary-hover">hoy</span>}
                      </th>
                      {row.values.map((v) => (
                        <td key={v.account.id} className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                          {v.expected == null ? '—' : fmtMXN(v.expected)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function StepRow({
  step,
  done,
  current,
  overdue,
  remaining,
  last,
  onToggle,
}: {
  step: FinPlanStep;
  done: boolean;
  current: boolean;
  overdue: boolean;
  remaining: number | null;
  last: boolean;
  onToggle: () => void;
}) {
  const auto = remaining != null;
  const circle = (
    <span
      className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-white ${
        done ? 'border-done bg-done' : current ? 'border-primary bg-card' : 'border-check bg-card'
      }`}
    >
      {done && <Icon name="check" size={20} stroke={3} />}
    </span>
  );
  return (
    <li
      className={`flex items-center gap-3 px-3 py-2 ${last ? '' : 'border-b border-line-soft'} ${current ? 'bg-soft' : ''}`}
    >
      {auto ? (
        <span aria-label={done ? 'Cumplido' : 'Se cumple solo con el saldo'}>{circle}</span>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={done}
          aria-label={done ? `Desmarcar ${step.title}` : `Marcar ${step.title} como hecho`}
        >
          {circle}
        </button>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`text-[15px] font-bold ${done ? 'text-muted line-through' : ''}`}>{step.title}</span>
        {step.note && <span className="text-[12px] font-semibold text-muted">{step.note}</span>}
      </span>
      <span className="flex flex-col items-end text-right">
        {step.due_month && (
          <span className={`text-[13px] font-extrabold ${overdue ? 'text-gasto' : 'text-muted'}`}>
            {monthLabel(step.due_month)}
          </span>
        )}
        {!done && remaining != null && remaining > 0 && (
          <span className="text-[12px] font-semibold text-muted">Faltan {fmtMXN(remaining)}</span>
        )}
      </span>
    </li>
  );
}
