# Lola Track

Pendientes, agenda y presupuesto compartidos para el hogar. PWA para iPhone, iPad y web, con sincronización en tiempo real.

- Spec: [`specs/001-mvp/spec.md`](specs/001-mvp/spec.md)
- Plan técnico: [`specs/001-mvp/plan.md`](specs/001-mvp/plan.md)
- Tareas: [`specs/001-mvp/tasks.md`](specs/001-mvp/tasks.md)
- Base de datos: [`supabase/migrations/`](supabase/migrations/) — proyecto Supabase `xkiumlisdkxwqlvuqneg`
- Parser de captura rápida: [`src/lib/quickAdd.ts`](src/lib/quickAdd.ts)

## Arranque

1. `npm i`
2. `cp .env.example .env` (ya trae URL y publishable key del proyecto).
3. `npm run dev`
4. Pendiente manual: plantilla de email OTP en Supabase (ver T02b en `tasks.md`).
