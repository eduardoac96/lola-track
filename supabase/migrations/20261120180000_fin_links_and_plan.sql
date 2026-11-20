-- v1.7 · Mis finanzas: pagos ligados a cuentas + "Camino" (plan mes a mes).
--   fin_items.account_id   al marcar la línea se abona sola a esa deuda/meta (y se revierte al desmarcar)
--   fin_movements.item_id/period   rastro del abono automático (uno por línea y quincena)
--   fin_plan_steps         hitos del plan (paso actual = primer hito sin cumplir)
--   fin_plan_points        saldo esperado de cada cuenta al cierre de cada mes ("¿voy bien?")

-- ───────────────────────── Ligar líneas a cuentas
alter table public.fin_items add column account_id uuid;
alter table public.fin_items add constraint fin_items_account_fk
  foreign key (owner_id, account_id) references public.fin_accounts (owner_id, id) on delete set null (account_id);
create index fin_items_account_idx on public.fin_items (owner_id, account_id) where account_id is not null;

alter table public.fin_movements add column item_id uuid references public.fin_items (id) on delete set null;
alter table public.fin_movements add column period date;
create unique index fin_movements_item_period_key on public.fin_movements (item_id, coalesce(period, '0001-01-01'::date))
  where item_id is not null;

-- Marca/desmarca una línea (quincena: fin_checks del periodo; extra: done_at) y, si está ligada
-- a una cuenta, abona o revierte el abono en la misma transacción.
create or replace function public.fin_item_toggle(p_item uuid, p_period date, p_check_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  i public.fin_items;
  a public.fin_accounts;
  m public.fin_movements;
  was boolean;
  mkey date;
  amt bigint;
  delta bigint;
begin
  select * into i from public.fin_items where id = p_item for update;
  if i.id is null or i.owner_id <> auth.uid() or not public.is_member(i.household_id) then
    raise exception 'No autorizado';
  end if;

  if i.section = 'quincena' then
    if p_period is null then raise exception 'Falta la quincena'; end if;
    was := exists (select 1 from public.fin_checks where item_id = i.id and period = p_period);
    if was then
      delete from public.fin_checks where item_id = i.id and period = p_period;
    else
      insert into public.fin_checks (id, household_id, owner_id, item_id, period)
      values (coalesce(p_check_id, gen_random_uuid()), i.household_id, i.owner_id, i.id, p_period);
    end if;
    mkey := p_period;
  else
    was := i.done_at is not null;
    update public.fin_items set done_at = case when was then null else now() end where id = i.id;
    mkey := null;
  end if;

  if was then
    select * into m from public.fin_movements where item_id = i.id and period is not distinct from mkey;
    if m.id is not null then
      select * into a from public.fin_accounts where id = m.account_id for update;
      delta := case when (a.kind = 'deuda') = (m.direction = 'abono') then m.amount_cents else -m.amount_cents end;
      delete from public.fin_movements where id = m.id;
      update public.fin_accounts set balance_cents = greatest(0, balance_cents + delta) where id = a.id;
    end if;
  elsif i.account_id is not null and i.amount_cents > 0 then
    select * into a from public.fin_accounts where id = i.account_id for update;
    -- una deuda no baja de 0: se abona solo lo que falte
    amt := case when a.kind = 'deuda' then least(i.amount_cents, a.balance_cents) else i.amount_cents end;
    if amt > 0 then
      insert into public.fin_movements
        (household_id, owner_id, account_id, direction, amount_cents, concept, occurred_on, item_id, period)
      values (a.household_id, a.owner_id, a.id, 'abono', amt, left(btrim(i.name), 80),
              coalesce(p_period, current_date), i.id, mkey);
      update public.fin_accounts
        set balance_cents = balance_cents + case when a.kind = 'deuda' then -amt else amt end
        where id = a.id;
    end if;
  end if;

  return jsonb_build_object('checked', not was);
end $$;

revoke all on function public.fin_item_toggle(uuid, date, uuid) from public, anon;
grant execute on function public.fin_item_toggle(uuid, date, uuid) to authenticated;

-- ───────────────────────── Camino
create table public.fin_plan_steps (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null,
  owner_id      uuid not null default auth.uid(),
  title         text not null check (char_length(btrim(title)) between 1 and 80),
  note          text check (note is null or char_length(btrim(note)) between 1 and 120),
  due_month     date check (due_month is null or extract(day from due_month) = 1),
  account_id    uuid,
  target_cents  bigint check (target_cents is null or (target_cents >= 0 and target_cents <= 100000000000)),
  done_at       timestamptz,
  sort_order    double precision not null default (extract(epoch from now()) * 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (owner_id, account_id) references public.fin_accounts (owner_id, id) on delete set null (account_id),
  foreign key (household_id, owner_id) references public.household_members (household_id, user_id) on delete cascade
);
create index fin_plan_steps_owner_idx on public.fin_plan_steps (household_id, owner_id, sort_order);
create index fin_plan_steps_owner_only_idx on public.fin_plan_steps (owner_id);
create index fin_plan_steps_account_idx on public.fin_plan_steps (owner_id, account_id);
create trigger fin_plan_steps_updated_at before update on public.fin_plan_steps
  for each row execute function public.set_updated_at();

create table public.fin_plan_points (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null,
  owner_id        uuid not null default auth.uid(),
  account_id      uuid not null,
  month           date not null check (extract(day from month) = 1),  -- saldo esperado al CIERRE de ese mes
  expected_cents  bigint not null check (expected_cents >= 0 and expected_cents <= 100000000000),
  created_at      timestamptz not null default now(),
  unique (account_id, month),
  foreign key (owner_id, account_id) references public.fin_accounts (owner_id, id) on delete cascade,
  foreign key (household_id, owner_id) references public.household_members (household_id, user_id) on delete cascade
);
create index fin_plan_points_owner_idx on public.fin_plan_points (household_id, owner_id, month);
create index fin_plan_points_owner_only_idx on public.fin_plan_points (owner_id);

do $$
declare t text;
begin
  foreach t in array array['fin_plan_steps', 'fin_plan_points'] loop
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
