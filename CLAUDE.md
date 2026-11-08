# CLAUDE.md — Lola Track

App personal (PWA) de pendientes, agenda y presupuesto para un hogar de 2 personas. Fuente de verdad: `specs/001-mvp/` (spec → plan → tasks). Si algo choca con el spec, el spec gana; si el spec está mal, propón el cambio en el PR.

## Stack

Vite · React 19 · TypeScript strict · Tailwind v4 · TanStack Query · Supabase (Postgres, Auth OTP, Realtime, Storage, Edge Functions, pg_cron) · vite-plugin-pwa · Vitest · Playwright · Cloudflare Pages.

## Comandos

```
npm run dev        # Vite
npm test           # Vitest
npm run build      # tsc --noEmit && vite build
npm run e2e        # Playwright (viewport iPhone 14)
supabase db push   # aplica migraciones
supabase functions deploy send-reminders
```

## Reglas

- **Dinero:** siempre `bigint` en centavos en la DB y `number` de centavos en TS. Nunca floats para montos. Formato solo con `fmtMXN` de `lib/money.ts`.
- **Seguridad:** toda tabla nueva lleva `household_id`, RLS habilitado y políticas con `public.is_member(household_id)`. Las mutaciones con más de un paso van como RPC `security definer` con `set search_path = public` y validan `is_member`.
- **Migraciones:** nunca editar una ya aplicada; crear una nueva `YYYYMMDDHHMMSS_desc.sql`.
- **Datos:** un hook por recurso en `src/data/`. Optimistic update y rollback en `onError`. Realtime actualiza la cache y deduplica por `id`.
- **UI:** objetivos táctiles ≥44 px, `aria-label` en botones de solo ícono, solo iconos SVG inline (sin emoji), textos en es-MX. Nada de formularios largos: lo opcional va detrás de "Más detalles".
- **iOS:** sin magic links (OTP); permiso de push solo tras un gesto; respetar `env(safe-area-inset-*)`.
- **Alcance:** no implementar nada listado en "Fuera" del spec sin pedirlo.
- **Done =** criterio de la tarea cumplido + `npm test` y `npm run build` en verde + tarea marcada en `tasks.md`.
