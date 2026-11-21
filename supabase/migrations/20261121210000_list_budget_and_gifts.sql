-- v1.8 · Listas con presupuesto y modo regalos (T42).
-- lists.budget_id: la lista descuenta de una bolsa (compras completadas) y muestra su barra.
-- lists.is_gift: modo regalos → "Para quién" por pendiente, topes por persona y estados
--   Idea (sin hacer) → Comprado (hecho) → Envuelto → Entregado (items.gift_stage).
-- lists.event_date: fecha del evento (24 dic); aviso push 7 días antes si quedan ideas sin comprar.
-- list_people: personas de una lista de regalos con tope opcional (centavos).

alter table public.lists
  add column budget_id uuid references public.budgets (id) on delete set null,
  add column is_gift boolean not null default false,
  add column event_date date,
  add column event_reminded_at timestamptz;
create index lists_budget_idx on public.lists (budget_id) where budget_id is not null;

alter table public.items
  add column recipient text check (recipient is null or char_length(btrim(recipient)) between 1 and 40),
  add column gift_stage text check (gift_stage is null or gift_stage in ('envuelto', 'entregado'));

-- La bolsa debe ser del mismo hogar; cambiar la fecha del evento rearma el aviso.
create or replace function public.lists_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.budget_id is not null and not exists (
    select 1 from budgets where id = new.budget_id and household_id = new.household_id
  ) then
    raise exception 'budget does not belong to household';
  end if;
  if tg_op = 'UPDATE' and new.event_date is distinct from old.event_date then
    new.event_reminded_at := null;
  end if;
  return new;
end $$;
revoke execute on function public.lists_guard() from public, anon, authenticated;
create trigger lists_guard before insert or update on public.lists
  for each row execute function public.lists_guard();

-- Reabrir un pendiente (vuelve a Idea) limpia su estado de regalo.
create or replace function public.items_clear_gift_stage()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.done_at is null then new.gift_stage := null; end if;
  return new;
end $$;
revoke execute on function public.items_clear_gift_stage() from public, anon, authenticated;
create trigger items_clear_gift_stage before insert or update on public.items
  for each row execute function public.items_clear_gift_stage();

-- ───────────────────────── Personas de una lista de regalos
create table public.list_people (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  list_id       uuid not null,
  name          text not null check (char_length(btrim(name)) between 1 and 40),
  cap_cents     bigint check (cap_cents is null or (cap_cents > 0 and cap_cents <= 100000000000)),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (household_id, list_id) references public.lists (household_id, id) on delete cascade
);
create unique index list_people_name_uq on public.list_people (list_id, lower(btrim(name)));
create index list_people_household_idx on public.list_people (household_id);
create trigger list_people_updated_at before update on public.list_people
  for each row execute function public.set_updated_at();

alter table public.list_people enable row level security;
create policy list_people_select on public.list_people for select to authenticated using (public.is_member(household_id));
create policy list_people_insert on public.list_people for insert to authenticated with check (public.is_member(household_id));
create policy list_people_update on public.list_people for update to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy list_people_delete on public.list_people for delete to authenticated using (public.is_member(household_id));

revoke all on public.list_people from anon;
grant select, insert, update, delete on public.list_people to authenticated;
grant select, insert, update, delete on public.list_people to service_role;

alter publication supabase_realtime add table public.list_people;

-- ───────────────────────── Duplicar lista de regalos (plantilla para el próximo año)
-- Copia modo regalos, personas y topes; fecha +1 año; sin pendientes ni bolsa.
create or replace function public.duplicate_list(p_list uuid, p_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare src lists%rowtype; nid uuid := gen_random_uuid();
begin
  select * into src from lists where id = p_list;
  if not found or not public.is_member(src.household_id) then raise exception 'forbidden'; end if;
  insert into lists (id, household_id, name, is_gift, event_date, created_by)
    values (nid, src.household_id, btrim(p_name), src.is_gift,
            case when src.event_date is null then null else (src.event_date + interval '1 year')::date end,
            auth.uid());
  insert into list_people (household_id, list_id, name, cap_cents)
    select household_id, nid, name, cap_cents from list_people where list_id = p_list;
  return nid;
end $$;
revoke execute on function public.duplicate_list(uuid, text) from public, anon;
grant  execute on function public.duplicate_list(uuid, text) to authenticated;

-- ───────────────────────── Aviso: faltan ≤7 días y hay ideas sin comprar (desde las 8:00)
create or replace function public.gift_list_reminders()
returns table (list_id uuid, household_id uuid, name text, days_left int, pending int)
language sql stable security definer set search_path = public as $$
  with today as (select (now() at time zone 'America/Monterrey')::date as d,
                        extract(hour from now() at time zone 'America/Monterrey') as h)
  select l.id, l.household_id, l.name, (l.event_date - t.d)::int,
         (select count(*)::int from items i where i.list_id = l.id and i.done_at is null)
  from lists l cross join today t
  where l.is_gift and l.archived_at is null and l.event_reminded_at is null
    and l.event_date is not null and l.event_date - t.d between 0 and 7
    and t.h >= 8
    and exists (select 1 from items i where i.list_id = l.id and i.done_at is null);
$$;
revoke execute on function public.gift_list_reminders() from public, anon, authenticated;
grant  execute on function public.gift_list_reminders() to service_role;
