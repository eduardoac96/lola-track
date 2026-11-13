/**
 * Vista previa de pantallas con datos de ejemplo (solo dev, no entra al build).
 * http://localhost:5173/preview.html?screen=now|items|agenda|budget|wishes|login|onboarding  (&como=pareja: verlo como la pareja)
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../lib/queryClient';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AppContext, type AppCtx } from '../app/context';
import { keys } from '../data/cache';
import type { List } from '../data/lists';
import type { Item } from '../data/items';
import type { CalEvent } from '../data/events';
import type { Balance, Movement } from '../data/budgets';
import type { Member } from '../data/household';
import { NowScreen } from '../features/now/NowScreen';
import { Celebrations } from '../features/celebrate/Celebrations';
import { ItemsScreen } from '../features/items/ItemsScreen';
import { AgendaScreen } from '../features/agenda/AgendaScreen';
import { BudgetScreen } from '../features/budget/BudgetScreen';
import { WishesScreen } from '../features/wishes/WishesScreen';
import type { Wish, WishClaim } from '../data/wishes';
import { LoginScreen } from '../features/auth/LoginScreen';
import { OnboardingScreen } from '../features/auth/OnboardingScreen';
import { TabBar } from '../ui/TabBar';
import { useAppBadge } from '../data/useAppBadge';

function Badge() {
  useAppBadge(HID);
  return null;
}
import { Fab, ToastProvider } from '../ui/kit';
import '../index.css';

const HID = 'h1';
const ME = 'u-odin';
const PARTNER = 'u-pareja';
const now = new Date();
const at = (days: number, h: number, m = 0) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, h, m).toISOString();

const members: Member[] = [
  { household_id: HID, user_id: ME, display_name: 'Odin', color: '#5B47E0', created_at: at(-30, 9) },
  { household_id: HID, user_id: PARTNER, display_name: 'Pareja', color: '#F5A524', created_at: at(-30, 9) },
];

let seq = 0;
const it = (p: Partial<Item>): Item => ({
  id: `item-${++seq}`,
  household_id: HID,
  type: 'tarea',
  title: '',
  priority: 'pronto',
  area: null,
  list_id: null,
  price_estimated_cents: null,
  sort_order: -Date.now() + seq * 1000,
  price_actual_cents: null,
  due_date: null,
  due_reminded_at: null,
  link_url: null,
  notes: null,
  photo_path: null,
  done_at: null,
  done_by: null,
  budget_movement_id: null,
  created_by: seq % 2 ? ME : PARTNER,
  created_at: at(-seq, 10),
  updated_at: at(-seq, 10),
  ...p,
});

const items: Item[] = [
  it({ type: 'tarea', title: 'Asegurar muebles a la pared', priority: 'urgente', area: 'Sala' }),
  it({
    type: 'compra',
    title: 'Protectores de enchufes',
    priority: 'urgente',
    area: 'Toda la casa',
    price_estimated_cents: 35000,
  }),
  it({ type: 'tarea', title: 'Revisar calentador', priority: 'urgente', area: 'Baños' }),
  it({ type: 'compra', title: 'Cambiador', area: 'Cuarto niños', price_estimated_cents: 390000 }),
  it({ type: 'tarea', title: 'Pintar cuarto de los niños', area: 'Cuarto niños', done_at: at(-2, 12), done_by: ME }),
  it({
    type: 'compra',
    title: 'Monitor para bebé',
    area: 'Cuarto niños',
    price_estimated_cents: 220000,
    price_actual_cents: 220000,
    done_at: at(0, 9),
    done_by: ME,
  }),
  it({ type: 'tarea', title: 'Agregar a los niños al seguro', area: 'Papeleo' }),
  it({
    type: 'compra',
    title: 'Lámpara de noche',
    priority: 'algun_dia',
    area: 'Cuarto niños',
    price_estimated_cents: 65000,
  }),
  it({ type: 'compra', title: 'Bañera', priority: 'algun_dia', area: 'Baños', price_estimated_cents: 89000 }),
  it({ type: 'tarea', title: 'Organizar clóset', priority: 'algun_dia', area: 'Cuarto niños' }),
];

const ev = (id: string, title: string, starts: string, place: string, durMin?: number, itemId?: string): CalEvent => ({
  id,
  household_id: HID,
  title,
  starts_at: starts,
  ends_at: durMin ? new Date(Date.parse(starts) + durMin * 60_000).toISOString() : null,
  place,
  notes: null,
  item_id: itemId ?? null,
  remind_minutes: 60,
  reminded_at: null,
  created_by: ME,
  created_at: starts,
  updated_at: starts,
});
const events: CalEvent[] = [
  ev('e1', 'Visita del plomero', at(0, 23, 30), 'Casa', 60, items[2]!.id),
  ev('e2', 'Recoger la cuna', at(2, 10, 30), 'Liverpool Valle Oriente', 30),
  ev('e3', 'Armar la cuna juntos', at(2, 19), 'Casa · cuarto de los niños', 120),
  ev('e4', 'Entrevista con pediatra', at(4, 16), 'Consultorio, San Pedro', 60),
  ev('e5', 'Entrega del cambiador', at(5, 9), 'Casa', undefined, items[3]!.id),
];

const mv = (id: string, concept: string, pesos: number, who: string, daysAgo: number): Movement => ({
  id,
  household_id: HID,
  budget_id: 'b-bebe',
  amount_cents: pesos * 100,
  concept,
  item_id: null,
  created_by: who,
  created_at: at(-daysAgo, 12),
});
const movements: Movement[] = [
  mv('m1', 'Monitor para bebé', -2200, ME, 0),
  mv('m2', 'Abono quincena', 5000, PARTNER, 1),
  mv('m3', 'Carriola', -7800, PARTNER, 4),
  mv('m4', 'Pintura cuarto', -1850, ME, 6),
  mv('m5', 'Abono quincena', 5000, ME, 7),
  mv('m6', 'Silla para auto', -5200, PARTNER, 10),
  mv('m7', 'Cuna', -4500, ME, 13),
  mv('m8', 'Monto inicial', 50000, ME, 18),
];
const balances: Balance[] = [
  {
    budget_id: 'b-bebe',
    household_id: HID,
    name: 'Bebé',
    sort: 0,
    archived: false,
    added_cents: 6000000,
    spent_cents: 2155000,
    available_cents: 3845000,
  },
  {
    budget_id: 'b-casa',
    household_id: HID,
    name: 'Arreglos casa',
    sort: 1,
    archived: false,
    added_cents: 1500000,
    spent_cents: 620000,
    available_cents: 880000,
  },
];

const wish = (id: string, owner: string, title: string, p: Partial<Wish> = {}): Wish => ({
  id,
  household_id: HID,
  owner_id: owner,
  title,
  price_estimated_cents: null,
  link_url: null,
  notes: null,
  starred: false,
  got_at: null,
  sort_order: Number(id.replace(/\D/g, '')),
  created_at: at(-3, 10),
  updated_at: at(-3, 10),
  ...p,
});
const wishes: Wish[] = [
  wish('w1', ME, 'Audífonos con cancelación de ruido', {
    price_estimated_cents: 549900,
    starred: true,
    link_url: 'https://www.amazon.com.mx/dp/B0EXAMPLE',
  }),
  wish('w2', ME, 'Libro: Atomic Habits', { price_estimated_cents: 39900 }),
  wish('w3', ME, 'Clase de cocina para dos'),
  wish('w4', ME, 'Termo Stanley', { got_at: at(-1, 12), price_estimated_cents: 89900 }),
  wish('w5', PARTNER, 'Bolsa de mano café', {
    price_estimated_cents: 180000,
    starred: true,
    notes: 'Mediana, color camel',
  }),
  wish('w6', PARTNER, 'Masaje en spa', { price_estimated_cents: 120000 }),
  wish('w7', PARTNER, 'Plantas para la terraza', { price_estimated_cents: 60000 }),
];
const claims: WishClaim[] = [
  {
    wish_id: 'w5',
    household_id: HID,
    status: 'apartado',
    claimed_by: ME,
    created_at: at(-1, 9),
    updated_at: at(-1, 9),
  },
  {
    wish_id: 'w7',
    household_id: HID,
    status: 'comprado',
    claimed_by: ME,
    created_at: at(-1, 9),
    updated_at: at(-1, 9),
  },
];

const qc = createQueryClient({ staleTime: Infinity, retry: false, refetchOnWindowFocus: false });
qc.setQueryData(keys.items(HID), items);
qc.setQueryData(keys.events(HID), events);
qc.setQueryData(keys.balances(HID), balances);
qc.setQueryData(keys.movements(HID), movements);
qc.setQueryData(keys.wishes(HID), wishes);
qc.setQueryData(keys.claims(HID), claims);

// ?listas=1 agrega listas de ejemplo (Posada, Mandado) con algunos pendientes
if (new URLSearchParams(location.search).has('listas')) {
  const mk = (id: string, name: string, archived = false): List => ({
    id,
    household_id: HID,
    name,
    sort_order: seq++,
    archived_at: archived ? at(-3, 9) : null,
    created_by: ME,
    created_at: at(-3, 9),
    updated_at: at(-3, 9),
  });
  qc.setQueryData(keys.lists(HID), [
    mk('l-posada', 'Posada'),
    mk('l-mandado', 'Mandado'),
    mk('l-boda', 'Boda prima', true),
  ]);
  qc.setQueryData(keys.items(HID), [
    it({ type: 'compra', title: 'Piñata', priority: 'urgente', list_id: 'l-posada', price_estimated_cents: 45000 }),
    it({ type: 'compra', title: 'Aguinaldos', list_id: 'l-posada', price_estimated_cents: 120000 }),
    it({ type: 'tarea', title: 'Mandar invitaciones', list_id: 'l-posada' }),
    it({ type: 'compra', title: 'Leche y pañales', list_id: 'l-mandado' }),
    ...items,
  ]);
} else {
  qc.setQueryData(keys.lists(HID), []);
}

// ?solo=1 simula a alguien solo en su hogar (muestra "Unirme a otro hogar" en Ajustes)
const shownMembers = new URLSearchParams(location.search).has('solo') ? members.slice(0, 1) : members;

const asPartner = new URLSearchParams(location.search).get('como') === 'pareja';
const ctx: AppCtx = {
  userId: asPartner ? PARTNER : ME,
  email: 'odin@example.com',
  hid: HID,
  household: {
    id: HID,
    name: 'Nuestra casa',
    created_at: at(-30, 9),
    urgent_reminders: true,
    last_urgent_reminder: null,
    last_weekly_digest: null,
  },
  members: shownMembers,
  memberById: (id) => members.find((m) => m.user_id === id),
};

const screen = new URLSearchParams(location.search).get('screen') ?? 'now';
const paths: Record<string, string> = {
  now: '/',
  items: '/pendientes',
  agenda: '/agenda',
  budget: '/presupuesto',
  wishes: '/deseos',
};
const isApp = screen in paths;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[paths[screen] ?? '/']}>
          {screen === 'login' && <LoginScreen />}
          {screen === 'onboarding' && <OnboardingScreen userId={ME} email="odin@example.com" />}
          {isApp && (
            <AppContext.Provider value={ctx}>
              <div className="md:pl-24">
                <div className="mx-auto min-h-dvh max-w-lg px-5 pt-7 pb-[170px] md:max-w-5xl md:px-10 md:pt-10 md:pb-24">
                  <Routes>
                    <Route path="/" element={<NowScreen />} />
                    <Route path="/pendientes" element={<ItemsScreen />} />
                    <Route path="/agenda" element={<AgendaScreen />} />
                    <Route path="/presupuesto" element={<BudgetScreen />} />
                    <Route path="/deseos" element={<WishesScreen />} />
                  </Routes>
                </div>
              </div>
              {screen !== 'budget' && screen !== 'wishes' && <Fab label="Agregar pendiente" onClick={() => {}} />}
              <TabBar />
              <Badge />
              <Celebrations hid={HID} />
            </AppContext.Provider>
          )}
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
