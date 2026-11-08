# 001 — Lola Track MVP · Tareas

Formato: `[ID] [P?] descripción → criterio de hecho`. `[P]` = paralelizable con la anterior.
Orden pensado para ROASTER/FIXER: cada tarea es un PR pequeño con su criterio verificable.

## Fase 0 · Fundaciones (~6–8 h)

- [x] **T01** Scaffold Vite + React + TS strict + Tailwind v4 (tokens §5 en `@theme`) + ESLint/Prettier + Vitest → `npm run build && npm test` en verde.
- [x] **T02** [P] Proyecto Supabase `lola-track` (`xkiumlisdkxwqlvuqneg`, us-west-2) con 3 migraciones aplicadas, advisors revisados y tipos en `src/lib/database.types.ts`.
  - [ ] **T02b** (manual, dashboard) Auth → Email: plantilla "Magic Link" con `{{ .Token }}` (código 6 dígitos), OTP expiry 600 s, Site URL = dominio de Cloudflare Pages.
- [x] **T03** `lib/supabase.ts`, `lib/money.ts` (`toCents`, `fromCents`, `fmtMXN`) con tests → los tests cubren 0, negativos y miles.
- [x] **T04** Auth OTP (pedir correo → 6 dígitos) + onboarding (crear hogar / unirse con código) + invitar con `navigator.share` → dos cuentas terminan en el mismo hogar.
- [x] **T05** Pruebas de RLS (local: `supabase/tests`; remoto: 15 casos en verde 2026-11-08) (SQL o Vitest con 3 usuarios: A y B en el hogar 1, C en el hogar 2) → C no lee ni escribe nada del hogar 1; B no puede unirse con un código ya usado o vencido.
- [x] **T06** UI shell: TabBar, Sheet, Fab, Avatar, Chip, iconos SVG → navega entre 4 rutas en un iPhone de 390 px.
- [x] **T07** `lib/quickAdd.ts` (ya incluido) + componente QuickAdd con vista previa de chips → los tests de `quickAdd.test.ts` pasan.
- [x] **T08** Pendientes: lista agrupada, filtros, completar/reabrir (sin presupuesto aún), editar en sheet, eliminar → criterios H3.
- [x] **T09** Realtime: `data/realtime.ts` suscribe por hogar y actualiza la cache → un cambio en el dispositivo A aparece en B en <2 s.
- [x] **T10** PWA: manifest (name "Lola Track", short_name "Lola", theme `#5B47E0`), iconos, apple-touch-icon, `display: standalone`, SW con precache → instalable desde Safari en iPhone.
- [ ] **T11** (manual) Deploy en Cloudflare Pages → los dos la usan desde el iPhone.
  - Cloudflare → Workers & Pages → Create → Pages → conectar `eduardoac96/lola-track`. Build: `npm run build`, output `dist`. Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.
  - `public/_redirects` (SPA) y `public/_headers` (sw sin caché) ya incluidos.
  - Supabase → Authentication → URL Configuration → Site URL = dominio de Pages.

## Fase 1 · Presupuesto, agenda y "Ahora" (~6 h)

- [x] **T12** Presupuesto: pills de bolsas, BalanceCard (view `budget_balances`), AmountSheet con teclado y chips, lista de movimientos, eliminar con deshacer → criterios H5.
- [x] **T13** CompleteSheet para compras → RPC `complete_item`; reabrir → `reopen_item` → criterios H4 (el saldo se mueve y regresa).
- [x] **T14** Agenda: WeekStrip, EventCard, EventSheet (crear/editar/eliminar, vínculo a pendiente) → criterios H6 sin push.
- [x] **T15** Push (llaves VAPID generadas y guardadas en Vault; la función las lee vía `get_push_config()`): `lib/push.ts` (suscribir/guardar en `push_subscriptions`), handler `push` y `notificationclick` en `sw.ts`, botón "Activar avisos" → llega un push de prueba a un iPhone con la PWA instalada.
- [x] **T16** Edge Function `send-reminders` desplegada + pg_cron cada 5 min (secreto en Vault; probado: 200 con secreto, 403 sin él) → un evento a 61 min avisa una sola vez; si se edita la hora, vuelve a avisar.
- [x] **T17** Pantalla Ahora: anillo, bolsa principal, 3 urgentes, 2 próximos → criterios H7.
- [x] **T18** Fotos: `lib/image.ts` (resize a WebP ≤1280), subida a `photos/{hid}/{item}.webp`, miniatura con signed URL → una foto de 4 MB del iPhone queda por debajo de 300 KB.

  - [x] **T15b** Llaves VAPID: en Vault (`lola_vapid_public`, `lola_vapid_private`); pública en `.env.example`. Ya no requiere paso manual.

## Fase 2 · Pulido (backlog)

- [x] **T19** iPad: dos columnas y rail lateral a partir de 768 px.
- [x] **T20** Modo oscuro (tokens dark).
- [x] **T21** Plantilla "Checklist llegada" (seed opcional de ~25 pendientes típicos, editable).
- [x] **T22** Recordatorio de pendientes con `due_date` (desde 8:00 Monterrey, un aviso por hogar; se reprograma si cambia la fecha). Probado contra la función desplegada.
- [x] **T23** Playwright smoke en viewport iPhone 14: login con OTP mockeado → crear → completar compra → saldo.

## v1.1 · Mejoras de uso (8 nov 2026)

- [x] **T24** Toggle día/noche: botón sol/luna en Ahora + Automático/Día/Noche en Ajustes (`data-theme`, se recuerda por dispositivo, sin parpadeo al cargar).
- [x] **T25** Deslizar a la izquierda para eliminar pendientes (Ahora y Pendientes) con "Deshacer" que restaura la fila completa (foto incluida: su borrado del Storage se difiere). Toast movido arriba para no tapar botones.
- [x] **T26** Sin "Arreglo": filtros Todo · Compras · Tareas, editor solo Compra/Tarea, checklist como tareas, `#arreglo` en captura rápida = tarea. El valor sigue en el enum de la DB (sin datos que lo usen) y se muestra como Tarea si aparece.
- [x] **T27** Reordenar a mano: asa ⋮⋮ por tarjeta, arrastre dentro de cada prioridad (teclado incluido). Columna `items.sort_order` (migración `20261108180000`).
- [x] **T28** Presupuesto: renombrar y eliminar bolsas (confirmación con conteo de movimientos), tocar un movimiento para editar monto/tipo/concepto; swipe compartido (`ui/SwipeRow`). Corrección: los totales gastado/aportado se ajustan bien al borrar o editar.
- [x] **T29** Unirse a otro hogar: RPC `switch_household` (migración `20261108213000`): sale del hogar actual y, si quedaba solo, lo borra; en Ajustes aparece "¿Tu pareja ya tiene un hogar en Lola?" cuando eres el único miembro, con aviso de cuántos datos se pierden. Onboarding advierte no crear un segundo hogar. Caso real resuelto: la pareja había creado un hogar vacío y se movió al hogar principal.
