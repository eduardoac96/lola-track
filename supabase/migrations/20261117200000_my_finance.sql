-- v1.5 · Mis finanzas (T39): plan financiero PRIVADO por persona.
-- Solo el dueño ve y edita sus filas (ni la pareja). Sin Realtime: se refresca al volver a la app.
--   fin_items     líneas del plan: 'quincena' (grp '15' | '30', se marcan por quincena) y 'extra' (grp = nombre del ingreso: "Aguinaldo (dic)")
--   fin_checks    "ya lo pagué" de una línea de quincena en una quincena concreta (period = día de pago)
--   fin_accounts  saldos que se siguen: deudas y metas (fondo de emergencia)

create table public.fin_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null,
  owner_id      uuid not null default auth.uid(),
  section       text not null check (section in ('quincena', 'extra')),
  grp           text not null check (char_length(btrim(grp)) between 1 and 40),
  name          text not null check (char_length(btrim(name)) between 1 and 60),
  amount_cents  bigint not null default 0 check (amount_cents >= 0 and amount_cents <= 100000000000),
  kind          text not null default 'gasto' check (kind in ('gasto', 'deuda', 'ahorro')),
  sort_order    double precision not null default (extract(epoch from now()) * 1000),
  done_at       timestamptz,  -- solo extras: pagado
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (section <> 'quincena' or grp in ('15', '30')),
  unique (owner_id, id),
  foreign key (household_id, owner_id) references public.household_members (household_id, user_id) on delete cascade
);
create index fin_items_owner_idx on public.fin_items (household_id, owner_id, section, sort_order);
create index fin_items_owner_only_idx on public.fin_items (owner_id);
create trigger fin_items_updated_at before update on public.fin_items
  for each row execute function public.set_updated_at();

create table public.fin_checks (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null,
  owner_id      uuid not null default auth.uid(),
  item_id       uuid not null,
  period        date not null,
  created_at    timestamptz not null default now(),
  unique (item_id, period),
  -- solo puedo marcar mis propias líneas
  foreign key (owner_id, item_id) references public.fin_items (owner_id, id) on delete cascade,
  foreign key (household_id, owner_id) references public.household_members (household_id, user_id) on delete cascade
);
create index fin_checks_owner_period_idx on public.fin_checks (household_id, owner_id, period);
create index fin_checks_owner_only_idx on public.fin_checks (owner_id);

create table public.fin_accounts (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null,
  owner_id       uuid not null default auth.uid(),
  name           text not null check (char_length(btrim(name)) between 1 and 60),
  kind           text not null check (kind in ('deuda', 'meta')),
  balance_cents  bigint not null default 0 check (balance_cents >= 0 and balance_cents <= 100000000000),
  target_cents   bigint check (target_cents is null or (target_cents > 0 and target_cents <= 100000000000)),
  sort_order     double precision not null default (extract(epoch from now()) * 1000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (household_id, owner_id) references public.household_members (household_id, user_id) on delete cascade
);
create index fin_accounts_owner_idx on public.fin_accounts (household_id, owner_id, sort_order);
create index fin_accounts_owner_only_idx on public.fin_accounts (owner_id);
create trigger fin_accounts_updated_at before update on public.fin_accounts
  for each row execute function public.set_updated_at();

-- ───────────────────────── RLS: miembro del hogar Y dueño, en todo (también select)
do $$
declare t text;
begin
  foreach t in array array['fin_items', 'fin_checks', 'fin_accounts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy %1$s_select_own on public.%1$I for select to authenticated
      using (public.is_member(household_id) and owner_id = (select auth.uid()))$p$, t);
    execute format($p$create policy %1$s_insert_own on public.%1$I for insert to authenticated
      with check (public.is_member(household_id) and owner_id = (select auth.uid()))$p$, t);
    execute format($p$create policy %1$s_update_own on public.%1$I for update to authenticated
      using (public.is_member(household_id) and owner_id = (select auth.uid()))
      with check (public.is_member(household_id) and owner_id = (select auth.uid()))$p$, t);
    execute format($p$create policy %1$s_delete_own on public.%1$I for delete to authenticated
      using (public.is_member(household_id) and owner_id = (select auth.uid()))$p$, t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;
