-- v1.6 · Movimientos de Mis finanzas (T40): gastos del día a día y abonos/cargos a deudas y metas.
-- Privado por dueño como el resto de fin_*. Saldo de la cuenta se mueve solo vía RPC (atómico).
--   direction 'gasto'  → registro de gasto (sin cuenta); category = texto libre (normalmente el nombre de una línea de la quincena)
--   direction 'abono'  → hacia la meta: deuda baja / ahorro sube
--   direction 'cargo'  → en contra: deuda sube / ahorro baja

alter table public.fin_accounts add constraint fin_accounts_owner_id_key unique (owner_id, id);

create table public.fin_movements (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null,
  owner_id      uuid not null default auth.uid(),
  account_id    uuid,
  direction     text not null check (direction in ('gasto', 'abono', 'cargo')),
  amount_cents  bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
  concept       text check (concept is null or char_length(btrim(concept)) between 1 and 80),
  category      text check (category is null or char_length(btrim(category)) between 1 and 40),
  occurred_on   date not null default current_date,
  created_at    timestamptz not null default now(),
  check ((direction = 'gasto') = (account_id is null)),
  foreign key (owner_id, account_id) references public.fin_accounts (owner_id, id) on delete cascade,
  foreign key (household_id, owner_id) references public.household_members (household_id, user_id) on delete cascade
);
create index fin_movements_owner_date_idx on public.fin_movements (household_id, owner_id, occurred_on desc);
create index fin_movements_owner_only_idx on public.fin_movements (owner_id);
create index fin_movements_account_idx on public.fin_movements (owner_id, account_id);

alter table public.fin_movements enable row level security;
create policy fin_movements_select_own on public.fin_movements for select to authenticated
  using (public.is_member(household_id) and owner_id = (select auth.uid()));
-- Solo gastos sueltos por insert directo; abonos/cargos van por RPC para mover el saldo.
create policy fin_movements_insert_own on public.fin_movements for insert to authenticated
  with check (public.is_member(household_id) and owner_id = (select auth.uid()) and direction = 'gasto');
create policy fin_movements_update_own on public.fin_movements for update to authenticated
  using (public.is_member(household_id) and owner_id = (select auth.uid()) and direction = 'gasto')
  with check (public.is_member(household_id) and owner_id = (select auth.uid()) and direction = 'gasto');
create policy fin_movements_delete_own on public.fin_movements for delete to authenticated
  using (public.is_member(household_id) and owner_id = (select auth.uid()) and direction = 'gasto');
revoke all on public.fin_movements from anon;
grant select, insert, update, delete on public.fin_movements to authenticated;
grant select, insert, update, delete on public.fin_movements to service_role;

-- Abono o cargo a una cuenta propia: inserta el movimiento y mueve el saldo en una transacción.
create or replace function public.fin_account_move(
  p_id uuid, p_account uuid, p_direction text, p_amount_cents bigint, p_concept text, p_occurred_on date
) returns public.fin_accounts
language plpgsql security definer set search_path = public as $$
declare
  a public.fin_accounts;
  delta bigint;
begin
  if p_direction not in ('abono', 'cargo') then raise exception 'Movimiento inválido'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'Monto inválido'; end if;
  select * into a from public.fin_accounts where id = p_account for update;
  if a.id is null or a.owner_id <> auth.uid() or not public.is_member(a.household_id) then
    raise exception 'No autorizado';
  end if;
  -- deuda: abono resta; meta: abono suma
  delta := case when (a.kind = 'deuda') = (p_direction = 'abono') then -p_amount_cents else p_amount_cents end;
  if a.balance_cents + delta < 0 then raise exception 'El monto es mayor al saldo'; end if;
  insert into public.fin_movements (id, household_id, owner_id, account_id, direction, amount_cents, concept, occurred_on)
  values (coalesce(p_id, gen_random_uuid()), a.household_id, a.owner_id, a.id, p_direction, p_amount_cents,
          nullif(btrim(p_concept), ''), coalesce(p_occurred_on, current_date));
  update public.fin_accounts set balance_cents = balance_cents + delta where id = a.id returning * into a;
  return a;
end $$;

-- Borra un abono/cargo y revierte su efecto en el saldo.
create or replace function public.fin_account_unmove(p_movement uuid)
returns public.fin_accounts
language plpgsql security definer set search_path = public as $$
declare
  m public.fin_movements;
  a public.fin_accounts;
  delta bigint;
begin
  select * into m from public.fin_movements where id = p_movement;
  if m.id is null or m.owner_id <> auth.uid() or not public.is_member(m.household_id) or m.account_id is null then
    raise exception 'No autorizado';
  end if;
  select * into a from public.fin_accounts where id = m.account_id for update;
  delta := case when (a.kind = 'deuda') = (m.direction = 'abono') then m.amount_cents else -m.amount_cents end;
  if a.balance_cents + delta < 0 then raise exception 'El saldo quedaría negativo'; end if;
  delete from public.fin_movements where id = m.id;
  update public.fin_accounts set balance_cents = balance_cents + delta where id = a.id returning * into a;
  return a;
end $$;

revoke all on function public.fin_account_move(uuid, uuid, text, bigint, text, date) from public, anon;
revoke all on function public.fin_account_unmove(uuid) from public, anon;
grant execute on function public.fin_account_move(uuid, uuid, text, bigint, text, date) to authenticated;
grant execute on function public.fin_account_unmove(uuid) to authenticated;
