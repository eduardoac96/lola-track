# 001 — Nido MVP · Plan técnico

## 1. Stack
| Capa | Elección | Por qué |
|---|---|---|
| Front | Vite + React 19 + TypeScript (strict) | Rápido, sin SSR innecesario |
| Estilos | Tailwind v4 con los tokens del spec §5 en `@theme` | Consistente con el mockup |
| Estado servidor | TanStack Query v5 + Supabase Realtime → `queryClient.setQueryData` | Cache, optimistic updates, invalidación por evento |
| Router | TanStack Router (o React Router 7), 4 rutas + sheets como estado | Simple |
| PWA | `vite-plugin-pwa` (injectManifest), service worker propio para push | Instalable en iOS/iPadOS |
| Backend | Supabase: Postgres + Auth (email OTP) + Realtime + Storage + Edge Functions + pg_cron | Cero servidores; el plan gratuito sobra para 2 usuarios |
| Push | Web Push (VAPID) con `web-push` desde una Edge Function | iOS 16.4+ con la PWA instalada |
| Hosting | Cloudflare Pages (deploy desde GitHub) | Igual que odin-factory |
| Tests | Vitest (unit) + Playwright (smoke e2e móvil) | |

## 2. Estructura
```
nido/
├─ CLAUDE.md
├─ specs/001-mvp/{spec,plan,tasks}.md
├─ supabase/
│  ├─ migrations/20261108000000_init.sql
│  ├─ functions/send-reminders/index.ts
│  └─ seed.sql                       # opcional, datos del mockup
├─ public/ (icons 192/512/maskable, apple-touch-icon 180)
└─ src/
   ├─ main.tsx · App.tsx · sw.ts
   ├─ lib/ supabase.ts · money.ts · quickAdd.ts · image.ts · push.ts · dates.ts
   ├─ data/ queries.ts · mutations.ts · realtime.ts   # 1 hook por recurso
   ├─ features/
   │  ├─ auth/      (OtpLogin, Onboarding, Invite)
   │  ├─ now/       (NowScreen, ProgressRing)
   │  ├─ items/     (ItemsScreen, ItemCard, QuickAdd, ItemSheet, CompleteSheet)
   │  ├─ agenda/    (AgendaScreen, WeekStrip, EventCard, EventSheet)
   │  └─ budget/    (BudgetScreen, BalanceCard, AmountSheet, MovementRow)
   └─ ui/ (TabBar, Sheet, Fab, Avatar, Chip, Icon)
```

## 3. Datos
Migración completa en `supabase/migrations/20261108000000_init.sql`. Resumen:

| Tabla | Clave | Notas |
|---|---|---|
| `households` | id | nombre del hogar |
| `household_members` | (household_id, user_id) | display_name, color; máximo 4 |
| `household_invites` | code | 8 chars, 7 días, un solo uso |
| `items` | id | type, priority, area, `price_estimated_cents`, `price_actual_cents`, photo_path, done_at, `budget_movement_id` |
| `budgets` | id | name, sort, archived |
| `budget_movements` | id | `amount_cents` con signo (≠0), item_id opcional |
| `events` | id | starts_at, ends_at, remind_minutes, reminded_at, item_id |
| `push_subscriptions` | id | por usuario y endpoint |
| `budget_balances` (view) | | added / spent / available por bolsa, `security_invoker` |

- **RLS en todas las tablas.** El predicado único es `public.is_member(household_id)` (security definer, evita recursión).
- **Mutaciones con reglas de negocio = RPC** (`create_household`, `create_invite`, `join_household`, `complete_item`, `reopen_item`, `create_budget`). Los CRUD simples van directo a las tablas bajo RLS.
- Realtime publica `items, events, budgets, budget_movements, household_members`. El cliente se suscribe con el filtro `household_id=eq.<id>`.

## 4. Decisiones clave y trampas conocidas
1. **Email OTP, no magic link.** En iOS la PWA instalada tiene almacenamiento separado de Safari: el link abriría Safari y la sesión no llegaría a la PWA. Hay que configurar la plantilla de email de Supabase para enviar `{{ .Token }}`.
2. **Dinero en centavos `bigint`.** La UI solo maneja pesos enteros; convertir con `money.ts` (`toCents`, `fmtMXN`).
3. **Saldo calculado, no almacenado.** Viene de la view `budget_balances`, así que no hay drift entre dos dispositivos.
4. **Optimistic updates** en completar, crear, eliminar y movimientos, con rollback en `onError`. El eco de Realtime se deduplica por `id`.
5. **Push en iOS** solo funciona si la PWA está instalada ("Agregar a pantalla de inicio") y el usuario acepta el permiso **tras un gesto**: hay un botón "Activar avisos" en el onboarding, no un prompt automático.
6. **Recordatorios:** pg_cron cada 5 min → `net.http_post` a la Edge Function `send-reminders`, que toma los eventos con `reminded_at is null and starts_at - remind_minutes*interval '1 minute' <= now() and starts_at > now()`, envía y marca. Si un endpoint responde 404 o 410, se borra la suscripción.
7. **Zona horaria:** `timestamptz` en la base y presentación en `America/Monterrey` (configurable por hogar más adelante).
8. **Fotos:** bucket privado `photos`, leídas con `createSignedUrl` (1 h) y cacheadas en memoria por `photo_path`.
9. **iPad:** a partir de 768 px, layout de dos columnas; el mismo código, sin app nativa.
10. **Seguridad:** la anon key es pública por diseño; toda la protección está en RLS. Las pruebas de RLS van en tasks T05.

## 5. Variables de entorno
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
# Edge Function secrets:
VAPID_PUBLIC_KEY= VAPID_PRIVATE_KEY= VAPID_SUBJECT=mailto:<tu-correo>
CRON_SECRET=          # header x-cron-secret validado por send-reminders
```

## 6. Costos
Supabase free (500 MB DB, 1 GB Storage, 50k MAU) + Cloudflare Pages free = **$0/mes**. Riesgo: Supabase pausa los proyectos gratuitos tras 7 días sin actividad; con uso diario no aplica.

## 7. Fuera del MVP (backlog F2+)
Recordatorio de pendientes vencidos (`due_date`), plantilla precargada "checklist llegada de los niños", búsqueda, historial de cambios, export CSV del presupuesto y cola offline.
