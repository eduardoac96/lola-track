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
- [x] **T30** Registro cerrado: trigger `lola_block_signups` en `auth.users` (migración `20261108214500`) rechaza cuentas nuevas; la app muestra "registro cerrado". Reabrir: `drop trigger lola_block_signups on auth.users;`. Cuenta sin uso `eduardo96_@live.com` eliminada.
- [x] **T31** Número en el ícono = urgentes sin hacer (Badging API): la app lo actualiza al cambiar datos (incluye cambios de la pareja vía Realtime), se limpia al cerrar sesión, y cada push de `send-reminders` (v3) trae `badge` para actualizarlo con la app cerrada. Requiere avisos permitidos en iOS.

## v1.2 · Más simple, más motivante (8 nov 2026)

- [x] **T32** Prioridad con gestos: deslizar a la derecha marca o quita urgente (urgente ↔ pronto, con "Deshacer"; tecla `u`); arrastrar entre secciones cambia la prioridad (un solo tablero `PriorityBoard` con zonas por prioridad, también con teclado). `SwipeRow` bidireccional.
- [x] **T33** "Ahora" simplificado: encabezado con mini anillo de "casa lista" + "N de M hechos", una línea de presupuesto y una sola lista **Hoy** (máx. 5: eventos de hoy aún vigentes, urgentes en su orden, luego lo que vence hoy o ya venció; "Día libre" si no hay nada). Selector puro `buildToday` con pruebas.
- [x] **T34** Festejos sin gamificación: "¡Todo lo urgente listo!" al completar el último urgente (no al quitar la marca ni al borrar) y hitos de casa lista 25/50/75/100 % (con ≥6 pendientes), una vez por hogar y dispositivo (`lola:milestone:<hid>`, se inicializa en silencio). Háptico y animación corta; respeta movimiento reducido.
- [x] **T35** Resumen semanal por push: domingo desde las 19:00 Monterrey, "Esta semana: N pendientes hechos, $X gastados, …" (migración `20261109040000`: `households.last_weekly_digest` + RPC `weekly_digests` solo para service_role; `send-reminders` v4 reclama el hogar antes de enviar; no envía si la semana no tuvo actividad). Verificado contra la función desplegada.

## v1.3 · Deseos y urgentes (10 nov 2026)

- [x] **T36** Deseos por persona (H9): migración `20261111030000` (`wishes` con FK compuesta a `household_members`, `wish_claims` oculta al dueño vía `can_claim_wish`, `wishes` en Realtime), `data/wishes.ts`, pestaña `/deseos` (selector por persona, captura con `$precio`, estrella, "Ya lo tengo", apartar/comprado, swipe con deshacer), preview `?screen=wishes` (`&como=pareja`).
- [x] **T37** Recordatorio de urgentes (H10): `households.urgent_reminders` + `last_urgent_reminder`, RPC `urgent_reminders()` (solo service_role), `send-reminders` v5 reclama el turno 8/13/19 antes de enviar; switch "Recordar urgentes" en Ajustes.
- [x] Corrección: la regla global `a {}` pasó a `@layer base`; la pestaña activa ya se distingue de las demás.

## v1.4 · Listas (12 nov 2026)

- [x] **T38** Listas de pendientes ("Posada", "Mandado", "Fiesta fin de año"): migración `20261113040000` (`lists` con RLS `is_member`, nombre único entre activas; `items.list_id` con FK compuesta al hogar y `on delete set null (list_id)` → General; `lists` en Realtime). Sin listas la pantalla se ve igual (solo botón "+ Lista"); con listas aparecen chips Todas · General · … · + con conteo de pendientes. La captura (campo y botón +) cae en la lista abierta; tocar la lista abierta la edita (renombrar, terminar y archivar con "Deshacer", eliminar → pendientes a General). Archivadas: ocultas en toda la app y sin avisos (`item_list_active` en `due_item_reminders`/`urgent_reminders`, RPC `urgent_count` para el badge en `send-reminders` v6); se restauran desde "Nueva lista". Mover un pendiente de lista desde su hoja. Preview `?screen=items&listas=1`.

## v1.5 · Mis finanzas (17 nov 2026)

- [x] **T39** Mis finanzas privadas: migración `20261117200000` (`fin_items` líneas de quincena 15/30 y extras agrupados por ingreso, `fin_checks` marcas por quincena con FK compuesta al dueño, `fin_accounts` deudas y metas; RLS `is_member` **y** `owner_id = auth.uid()` también en select: la pareja no ve nada; sin Realtime). Presupuesto con selector Hogar · Mis finanzas (se recuerda por dispositivo); vistas Quincena (navegar quincenas, "falta por pagar", marcar pagado), Extras (marcar hecho) y Saldos (barra de meta). Quincena actual = último día de pago (15 o 30/último del mes), `features/finance/period.ts` con pruebas. Preview `?screen=finance`. RLS verificado como la pareja (0 filas).
- [x] **T40** Movimientos (v1.6): migración `20261118040000` (`fin_movements` privado por dueño; gastos sueltos por insert directo, abonos/cargos solo vía RPC `fin_account_move` / `fin_account_unmove` que mueven el saldo atómicamente y no lo dejan negativo). Pestaña **Gastos** (registrar en 2 toques, mes con total y por categoría contra lo planeado en la quincena) y detalle de cuenta en **Saldos** con Abonar/Aumentar (deuda) o Depositar/Retirar (meta) e historial borrable. Lógica en `period.ts` (`monthSpending`) con pruebas.

## v1.7 · Camino (20 nov 2026)

- [x] **T41** Pagos ligados y Camino: migración `20261120180000` (`fin_items.account_id` con `on delete set null (account_id)`; `fin_movements.item_id/period` con índice único por línea y quincena; RPC `fin_item_toggle` que marca/desmarca y abona o revierte el abono en la misma transacción, sin bajar deudas de 0; `fin_plan_steps` hitos y `fin_plan_points` saldo esperado por cuenta al cierre de cada mes, RLS por dueño). Campo "Abona a" en la línea (detrás de "Más detalles") y etiqueta "Abona a …" en la lista. Pestaña **Camino** (por defecto): paso actual con lo que falta y su mes, "En camino / Atrasado" contra el cierre del último mes (margen $500) y hitos vencidos, lista de pasos (los de cuenta se cumplen solos; los demás se palomean) y tabla mes a mes sin gráficas. Lógica en `features/finance/plan.ts` con pruebas. Preview `?screen=finance`.

## v1.8 · Presupuesto por lista y regalos (21 nov 2026)

- [x] **T42** Listas con presupuesto y modo regalos: migración `20261121210000` (`lists.budget_id` validada al hogar por trigger `lists_guard`, `lists.is_gift`, `lists.event_date` + `event_reminded_at` que se rearma al cambiar la fecha; `items.recipient` y `items.gift_stage` envuelto/entregado, limpiado al reabrir; `list_people` con tope en centavos, RLS `is_member`, Realtime; RPC `duplicate_list`; `gift_list_reminders()` solo service_role). En la hoja de la lista: bolsa existente o "+ Nueva bolsa" con total, switch "Lista de regalos", fecha del evento y "Duplicar para <año+1>" (personas y topes, sin pendientes). En Pendientes: barra Gastado · Planeado · Libre (ámbar ≥80 %, rojo al pasarse) en lugar de "Compras pendientes"; en regalos, `@nombre` = Para quién y todo es compra, tarjetas por persona con subtotal y tope (rojo si se rebasa), chip de estado Comprado → Envuelto → Entregado en la tarjeta y en la hoja. Al comprar, la bolsa de la lista viene preseleccionada. `send-reminders` v7: un push por lista ≤7 días antes del evento si hay regalos sin comprar. Lógica en `features/items/gifts.ts` con pruebas. Preview `?screen=items&listas=1` (lista "Navidad 2026"). Fuera: quién pagó y modo sorpresa.

## v1.9 · Identidad y orden (21 nov 2026)

- [x] **T43** Identidad terracota/salvia: paleta cálida (terracota = acción, salvia = hecho/abono, mostaza = pronto) en claro y oscuro, títulos en Fraunces, `theme_color`/manifest. Colores de miembro guardados con la paleta anterior se traducen al mostrarlos (`memberColor` en `ui/kit.tsx`), sin migración. Pendientes: sin cuadrito de ícono (solo miniatura si hay foto), títulos a 2 líneas, filtros tipo/área detrás de "Filtrar", ayuda de sintaxis solo al enfocar la captura, hechos agrupados en "Hechos (n)" colapsable al final. Control segmentado flexible (5 opciones caben en iPhone).
- [x] **T44** Un solo concepto de presupuesto: las bolsas. En Presupuesto, la bolsa muestra "Planeado en listas" (compras sin hacer de las listas ligadas), "Libre"/"Te pasas" y chips a esas listas; la barra de la lista dice "Bolsa X ›" y abre esa bolsa. Presupuesto queda solo con Hogar.
- [x] **T45** Espacio privado **Yo** (`/yo`): se abre tocando los avatares en Ahora; Mis finanzas (Camino, Quincena, Gastos, Extras, Saldos) + botón Hogar y ajustes. "Solo tú ves esto".
- [x] **T46** Pestaña **Regalos** (`/regalos`, `/deseos` redirige): Deseos | Para regalar. Las listas de regalo salen de Pendientes y viven aquí (selección recordada aparte, `lola:gift:<hid>`); "Nueva lista" desde Regalos nace en modo regalos y el switch de la hoja mueve la lista entre pestañas. Aviso push de listas de regalo abre `/regalos` (`send-reminders` v8). Preview `?screen=wishes`, `?screen=gifts&listas=1`.
- [x] **T47** Prioridad como interruptor (22 nov 2026): Pendientes muestra **Urgente** y **Lo demás**; en la hoja del pendiente, switch "Urgente" en lugar del selector de 3; deslizar a la derecha sigue alternando. Sin migración: "no urgente" = `pronto`, el `algun_dia` heredado se muestra en Lo demás y se normaliza al moverlo (`bucketOf` en `select.ts`). La captura solo entiende `!urgente` (`!pronto`/`!algun` se ignoran como prioridad).
- [x] **T48** Comprar en lista con bolsa sin preguntar (22 nov 2026): palomear una compra de una lista ligada a bolsa y con precio estimado la marca comprada y resta ese precio de la bolsa al instante; aviso "Comprado · −$X de Bolsa" con **Ajustar precio** (reabre y vuelve a completar con el precio real, en ese orden) y **Deshacer** (reabrir borra el movimiento). Sin precio, la hoja solo pide cuánto costó (sin "Solo marcar hecho"). Compras fuera de listas con bolsa: igual que antes. Toast admite varias acciones.
- [x] **T49** Regalos fuera de "casa lista" (22 nov 2026): el anillo de Ahora y los festejos (hitos 25/50/75/100 % y "todo lo urgente listo") ignoran lo de listas de regalo (`homeItems` en `select.ts`); los festejos esperan a que carguen las listas. Aviso de compra acortado a "Comprado −$X".
- [x] **T50** Pendientes por dueño (25 nov 2026): `items.owner_id` (null = Casa; personal visible para todo el hogar). Chips "De quién" en Pendientes (Casa y míos por defecto · Casa · Míos · otro miembro · Todos, recordado por dispositivo); lo capturado toma el dueño de la vista; "De quién" en la hoja del pendiente. No urgentes sin moverse 14+ días van plegados en "Estancados" (deslizar → Reactivar). Avisos de urgentes: Casa a todos, personales solo a su dueño (`urgent_reminders.owner_ids`).
