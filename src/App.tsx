import { useCallback, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { AppContext, type AppCtx } from './app/context';
import { useHousehold, type HouseholdData } from './data/household';
import { useRealtime } from './data/realtime';
import { useAppBadge } from './data/useAppBadge';
import { Celebrations } from './features/celebrate/Celebrations';
import { useSession } from './data/session';
import { hasSupabaseConfig } from './lib/supabase';
import { LoginScreen } from './features/auth/LoginScreen';
import { OnboardingScreen } from './features/auth/OnboardingScreen';
import { NowScreen } from './features/now/NowScreen';
import { ItemsScreen } from './features/items/ItemsScreen';
import { AgendaScreen } from './features/agenda/AgendaScreen';
import { BudgetScreen } from './features/budget/BudgetScreen';
import { QuickAdd } from './features/items/QuickAdd';
import { TabBar } from './ui/TabBar';
import { Sheet } from './ui/Sheet';
import { EmptyCard, Fab, PrimaryButton, Spinner, ToastProvider } from './ui/kit';

export default function App() {
  if (!hasSupabaseConfig) {
    return (
      <main className="mx-auto max-w-md p-6">
        <EmptyCard>
          Falta configurar Supabase: copia <code>.env.example</code> a <code>.env</code>.
        </EmptyCard>
      </main>
    );
  }
  return (
    <ToastProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </ToastProvider>
  );
}

function Gate() {
  const session = useSession();
  const userId = session?.user.id;
  const household = useHousehold(userId);

  if (session === undefined) return <FullSpinner />;
  if (session === null) return <LoginScreen />;
  if (household.isLoading) return <FullSpinner />;
  if (household.isError)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <EmptyCard>No pudimos cargar tu hogar. Revisa tu conexión.</EmptyCard>
        <PrimaryButton onClick={() => household.refetch()}>Reintentar</PrimaryButton>
      </main>
    );
  if (!household.data) return <OnboardingScreen userId={session.user.id} email={session.user.email ?? ''} />;

  return <Shell userId={session.user.id} email={session.user.email ?? ''} data={household.data} />;
}

function Shell({ userId, email, data }: { userId: string; email: string; data: HouseholdData }) {
  const hid = data.household.id;
  useRealtime(hid, userId);
  useAppBadge(hid);
  const [quickAdd, setQuickAdd] = useState(false);
  const location = useLocation();

  const memberById = useCallback(
    (id: string | null | undefined) => (id ? data.members.find((m) => m.user_id === id) : undefined),
    [data.members],
  );
  const ctx = useMemo<AppCtx>(
    () => ({ userId, email, hid, household: data.household, members: data.members, memberById }),
    [userId, email, hid, data, memberById],
  );
  const showFab = location.pathname !== '/presupuesto';

  return (
    <AppContext.Provider value={ctx}>
      <div className="md:pl-24">
        <div className="mx-auto min-h-dvh max-w-lg px-5 pt-[max(28px,env(safe-area-inset-top))] pb-[calc(170px+env(safe-area-inset-bottom))] md:max-w-5xl md:px-10 md:pt-10 md:pb-24">
          <Routes>
            <Route path="/" element={<NowScreen />} />
            <Route path="/pendientes" element={<ItemsScreen />} />
            <Route path="/agenda" element={<AgendaScreen />} />
            <Route path="/presupuesto" element={<BudgetScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      {showFab && <Fab label="Agregar pendiente" onClick={() => setQuickAdd(true)} />}
      <Sheet open={quickAdd} onClose={() => setQuickAdd(false)} title="Nuevo pendiente">
        <div className="pb-2">
          <QuickAdd autoFocus onCreated={() => setQuickAdd(false)} />
        </div>
      </Sheet>
      <TabBar />
      <Celebrations hid={hid} />
    </AppContext.Provider>
  );
}

function FullSpinner() {
  return (
    <div className="flex min-h-dvh">
      <Spinner />
    </div>
  );
}
