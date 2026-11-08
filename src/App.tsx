import { hasSupabaseConfig } from './lib/supabase';

export default function App() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-5 pt-[max(28px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-muted">Hogar</span>
        <h1 className="m-0 text-3xl font-extrabold tracking-tight">Lola Track</h1>
      </header>

      <section className="rounded-[var(--radius-hero)] bg-primary p-5 text-white">
        <p className="m-0 text-[13px] font-semibold text-[#E4E0FF]">Scaffold listo</p>
        <p className="m-0 mt-1 text-xl font-extrabold">Pendientes · Agenda · Presupuesto</p>
      </section>

      {!hasSupabaseConfig && (
        <p className="m-0 rounded-[var(--radius-card)] border border-line bg-card p-4 text-sm font-semibold text-muted">
          Falta configurar Supabase: copia <code>.env.example</code> a <code>.env</code> y llena las variables.
        </p>
      )}
    </main>
  );
}
