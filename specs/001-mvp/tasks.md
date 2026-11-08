# 001 — Lola Track MVP · Tareas

Formato: `[ID] [P?] descripción → criterio de hecho`. `[P]` = paralelizable con la anterior.
Orden pensado para ROASTER/FIXER: cada tarea es un PR pequeño con su criterio verificable.

## Fase 0 · Fundaciones (~6–8 h)

- [x] **T01** Scaffold Vite + React + TS strict + Tailwind v4 (tokens §5 en `@theme`) + ESLint/Prettier + Vitest → `npm run build && npm test` en verde.
- [ ] **T02** [P] Proyecto Supabase, aplicar `supabase/migrations/20261108000000_init.sql`, plantilla de email con `{{ .Token }}` → `supabase db push` sin errores.
- [x] **T03** `lib/supabase.ts`, `lib/money.ts` (`toCents`, `fromCents`, `fmtMXN`) con tests → los tests cubren 0, negativos y miles.
- [ ] **T04** Auth OTP (pedir correo → 6 dígitos) + onboarding (crear hogar / unirse con código) + invitar con `navigator.share` → dos cuentas terminan en el mismo hogar.
- [ ] **T05** Pruebas de RLS (SQL o Vitest con 3 usuarios: A y B en el hogar 1, C en el hogar 2) → C no lee ni escribe nada del hogar 1; B no puede unirse con un código ya usado o vencido.
- [ ] **T06** UI shell: TabBar, Sheet, Fab, Avatar, Chip, iconos SVG → navega entre 4 rutas en un iPhone de 390 px.
- [ ] **T07** `lib/quickAdd.ts` (ya incluido) + componente QuickAdd con vista previa de chips → los tests de `quickAdd.test.ts` pasan.
- [ ] **T08** Pendientes: lista agrupada, filtros, completar/reabrir (sin presupuesto aún), editar en sheet, eliminar → criterios H3.
- [ ] **T09** Realtime: `data/realtime.ts` suscribe por hogar y actualiza la cache → un cambio en el dispositivo A aparece en B en <2 s.
- [ ] **T10** PWA: manifest (name "Lola Track", short_name "Lola", theme `#5B47E0`), iconos, apple-touch-icon, `display: standalone`, SW con precache → instalable desde Safari en iPhone.
- [ ] **T11** Deploy en Cloudflare Pages + URL de Supabase en Auth redirect/site URL → los dos la usan desde el iPhone.

## Fase 1 · Presupuesto, agenda y "Ahora" (~6 h)

- [ ] **T12** Presupuesto: pills de bolsas, BalanceCard (view `budget_balances`), AmountSheet con teclado y chips, lista de movimientos, eliminar con deshacer → criterios H5.
- [ ] **T13** CompleteSheet para compras → RPC `complete_item`; reabrir → `reopen_item` → criterios H4 (el saldo se mueve y regresa).
- [ ] **T14** Agenda: WeekStrip, EventCard, EventSheet (crear/editar/eliminar, vínculo a pendiente) → criterios H6 sin push.
- [ ] **T15** Push: `lib/push.ts` (suscribir/guardar en `push_subscriptions`), handler `push` y `notificationclick` en `sw.ts`, botón "Activar avisos" → llega un push de prueba a un iPhone con la PWA instalada.
- [ ] **T16** Edge Function `send-reminders` + pg_cron cada 5 min (con `x-cron-secret`) → un evento a 61 min avisa una sola vez; si se edita la hora, vuelve a avisar.
- [ ] **T17** Pantalla Ahora: anillo, bolsa principal, 3 urgentes, 2 próximos → criterios H7.
- [ ] **T18** Fotos: `lib/image.ts` (resize a WebP ≤1280), subida a `photos/{hid}/{item}.webp`, miniatura con signed URL → una foto de 4 MB del iPhone queda por debajo de 300 KB.

## Fase 2 · Pulido (backlog)

- [ ] **T19** iPad: dos columnas y rail lateral a partir de 768 px.
- [ ] **T20** Modo oscuro (tokens dark).
- [ ] **T21** Plantilla "Checklist llegada" (seed opcional de ~25 pendientes típicos, editable).
- [ ] **T22** Recordatorio de pendientes con `due_date` vencida (8:00 am).
- [ ] **T23** Playwright smoke en viewport iPhone 14: login con OTP mockeado → crear → completar compra → saldo.
