-- Lola Track · init schema
-- Households (2–4 members) share items, events and budgets. All access via RLS on is_member(household_id).
-- Money: bigint cents. Balances computed by view (never stored).

create extension if not exists pgcrypto;

-- ───────────────────────── Types
create type public.item_type as enum ('compra', 'arreglo', 'tarea');
create type public.item_priority as enum ('urgente', 'pronto', 'algun_dia');

-- ───────────────────────── Helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ───────────────────────── Households
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  created_at  timestamptz not null default now()
);

create table public.household_members (
  household_id  uuid not null references public.households (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 40),
  color         text not null default '#5B47E0' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members (user_id);

create table public.household_invites (
  code          text primary key,
  household_id  uuid not null references public.households (id) on delete cascade,
  created_by    uuid not null references auth.users (id) on delete cascade,
  expires_at    timestamptz not null default now() + interval '7 days',
  used_by       uuid references auth.users (id) on delete set null,
  used_at       timestamptz
);

-- Security definer: avoids RLS recursion on household_members.
create or replace function public.is_member(h uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = h and user_id = auth.uid()
  );
$$;

-- ───────────────────────── Budgets
create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 40),
  sort          int not null default 0,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index budgets_household_idx on public.budgets (household_id, sort);

create table public.budget_movements (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  budget_id     uuid not null references public.budgets (id) on delete cascade,
  amount_cents  bigint not null check (amount_cents <> 0 and abs(amount_cents) <= 100000000000),
  concept       text check (concept is null or char_length(concept) <= 80),
  item_id       uuid,  -- FK added after items exists
  created_by    uuid not null default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index budget_movements_budget_idx on public.budget_movements (budget_id, created_at desc);
create index budget_movements_household_idx on public.budget_movements (household_id);

-- ───────────────────────── Items (pendientes)
create table public.items (
  id                     uuid primary key default gen_random_uuid(),
  household_id           uuid not null references public.households (id) on delete cascade,
  type                   public.item_type not null default 'tarea',
  title                  text not null check (char_length(title) between 1 and 200),
  priority               public.item_priority not null default 'pronto',
  area                   text check (area is null or char_length(area) <= 40),
  price_estimated_cents  bigint check (price_estimated_cents is null or price_estimated_cents >= 0),
  price_actual_cents     bigint check (price_actual_cents is null or price_actual_cents >= 0),
  due_date               date,
  link_url               text check (link_url is null or link_url ~* '^https?://'),
  notes                  text check (notes is null or char_length(notes) <= 2000),
  photo_path             text,
  done_at                timestamptz,
  done_by                uuid references auth.users (id) on delete set null,
  budget_movement_id     uuid references public.budget_movements (id) on delete set null,
  created_by             uuid not null default auth.uid() references auth.users (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index items_household_idx on public.items (household_id, priority, done_at);
create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

alter table public.budget_movements
  add constraint budget_movements_item_fk
  foreign key (item_id) references public.items (id) on delete set null;

-- ───────────────────────── Events (agenda)
create table public.events (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 120),
  starts_at       timestamptz not null,
  ends_at         timestamptz check (ends_at is null or ends_at >= starts_at),
  place           text check (place is null or char_length(place) <= 120),
  notes           text check (notes is null or char_length(notes) <= 2000),
  item_id         uuid references public.items (id) on delete set null,
  remind_minutes  int check (remind_minutes is null or remind_minutes between 0 and 10080),  -- null = sin aviso
  reminded_at     timestamptz,
  created_by      uuid not null default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index events_household_start_idx on public.events (household_id, starts_at);
create index events_pending_reminder_idx on public.events (starts_at)
  where reminded_at is null and remind_minutes is not null;

create or replace function public.events_before_update()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.starts_at is distinct from old.starts_at
     or new.remind_minutes is distinct from old.remind_minutes then
    new.reminded_at := null;  -- reschedule reminder
  end if;
  return new;
end $$;
create trigger events_before_update before update on public.events
  for each row execute function public.events_before_update();

-- ───────────────────────── Push subscriptions
create table public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  household_id  uuid not null references public.households (id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index push_subscriptions_household_idx on public.push_subscriptions (household_id);

-- ───────────────────────── Balances view
create view public.budget_balances
with (security_invoker = true) as
select
  b.id            as budget_id,
  b.household_id,
  b.name,
  b.sort,
  b.archived,
  coalesce(sum(m.amount_cents) filter (where m.amount_cents > 0), 0)::bigint  as added_cents,
  coalesce(-sum(m.amount_cents) filter (where m.amount_cents < 0), 0)::bigint as spent_cents,
  coalesce(sum(m.amount_cents), 0)::bigint                                    as available_cents
from public.budgets b
left join public.budget_movements m on m.budget_id = b.id
group by b.id;

-- ───────────────────────── RLS
alter table public.households          enable row level security;
alter table public.household_members   enable row level security;
alter table public.household_invites   enable row level security;
alter table public.budgets             enable row level security;
alter table public.budget_movements    enable row level security;
alter table public.items               enable row level security;
alter table public.events              enable row level security;
alter table public.push_subscriptions  enable row level security;

-- households: read/rename own; create only via RPC
create policy households_select on public.households for select using (public.is_member(id));
create policy households_update on public.households for update using (public.is_member(id)) with check (public.is_member(id));

-- members: read co-members; edit own profile; join only via RPC
create policy members_select on public.household_members for select using (public.is_member(household_id));
create policy members_update_self on public.household_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members_leave_self on public.household_members for delete using (user_id = auth.uid());

-- invites: no direct access (RPC only) → no policies.

-- shared data: full CRUD for members
do $$
declare t text;
begin
  foreach t in array array['budgets', 'budget_movements', 'items', 'events'] loop
    execute format(
      'create policy %1$s_member_all on public.%1$s for all
         using (public.is_member(household_id))
         with check (public.is_member(household_id))', t);
  end loop;
end $$;

-- cross-household integrity (RLS checks household_id, these check references agree)
create or replace function public.check_same_household()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'budget_movements' then
    if not exists (select 1 from budgets where id = new.budget_id and household_id = new.household_id) then
      raise exception 'budget does not belong to household';
    end if;
    if new.item_id is not null and not exists (select 1 from items where id = new.item_id and household_id = new.household_id) then
      raise exception 'item does not belong to household';
    end if;
  elsif tg_table_name = 'events' then
    if new.item_id is not null and not exists (select 1 from items where id = new.item_id and household_id = new.household_id) then
      raise exception 'item does not belong to household';
    end if;
  elsif tg_table_name = 'items' then
    if new.budget_movement_id is not null and not exists (select 1 from budget_movements where id = new.budget_movement_id and household_id = new.household_id) then
      raise exception 'movement does not belong to household';
    end if;
  end if;
  return new;
end $$;
create trigger budget_movements_same_household before insert or update on public.budget_movements
  for each row execute function public.check_same_household();
create trigger events_same_household before insert or update on public.events
  for each row execute function public.check_same_household();
create trigger items_same_household before insert or update on public.items
  for each row execute function public.check_same_household();

-- push: own rows only, and only for a household you belong to
create policy push_own on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_member(household_id));

-- ───────────────────────── RPCs
create or replace function public.create_household(p_name text, p_display_name text, p_color text default '#5B47E0')
returns uuid
language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into households (name) values (trim(p_name)) returning id into h;
  insert into household_members (household_id, user_id, display_name, color)
    values (h, auth.uid(), trim(p_display_name), p_color);
  insert into budgets (household_id, name, sort) values (h, 'General', 0);
  return h;
end $$;

create or replace function public.create_invite(p_household uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.is_member(p_household) then raise exception 'forbidden'; end if;
  -- 8 chars, unambiguous alphabet (no 0/O/1/I)
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(b, i) % 32), 1), '')
    into c
    from (select gen_random_bytes(8) as b) r, generate_series(0, 7) as i;
  insert into household_invites (code, household_id, created_by) values (c, p_household, auth.uid());
  return c;
end $$;

create or replace function public.join_household(p_code text, p_display_name text, p_color text default '#F5A524')
returns uuid
language plpgsql security definer set search_path = public as $$
declare inv household_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into inv from household_invites where code = upper(trim(p_code)) for update;
  if not found or inv.used_at is not null or inv.expires_at < now() then
    raise exception 'invalid or expired code';
  end if;
  if exists (select 1 from household_members where household_id = inv.household_id and user_id = auth.uid()) then
    return inv.household_id;
  end if;
  if (select count(*) from household_members where household_id = inv.household_id) >= 4 then
    raise exception 'household is full';
  end if;
  insert into household_members (household_id, user_id, display_name, color)
    values (inv.household_id, auth.uid(), trim(p_display_name), p_color);
  update household_invites set used_by = auth.uid(), used_at = now() where code = inv.code;
  return inv.household_id;
end $$;

create or replace function public.create_budget(p_household uuid, p_name text, p_initial_cents bigint default 0)
returns uuid
language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  if not public.is_member(p_household) then raise exception 'forbidden'; end if;
  insert into budgets (household_id, name, sort)
    values (p_household, trim(p_name), coalesce((select max(sort) + 1 from budgets where household_id = p_household), 0))
    returning id into b;
  if coalesce(p_initial_cents, 0) > 0 then
    insert into budget_movements (household_id, budget_id, amount_cents, concept, created_by)
      values (p_household, b, p_initial_cents, 'Monto inicial', auth.uid());
  end if;
  return b;
end $$;

-- Completa un pendiente; si es compra con bolsa y monto, crea el movimiento (negativo) y lo enlaza. Atómico.
create or replace function public.complete_item(p_item uuid, p_actual_cents bigint default null, p_budget uuid default null)
returns public.items
language plpgsql security definer set search_path = public as $$
declare it items%rowtype; mv uuid;
begin
  select * into it from items where id = p_item for update;
  if not found or not public.is_member(it.household_id) then raise exception 'forbidden'; end if;
  if it.done_at is not null then return it; end if;

  if p_budget is not null and coalesce(p_actual_cents, 0) > 0 then
    if not exists (select 1 from budgets where id = p_budget and household_id = it.household_id) then
      raise exception 'budget does not belong to household';
    end if;
    insert into budget_movements (household_id, budget_id, amount_cents, concept, item_id, created_by)
      values (it.household_id, p_budget, -p_actual_cents, left(it.title, 80), it.id, auth.uid())
      returning id into mv;
  end if;

  update items set
    done_at = now(),
    done_by = auth.uid(),
    price_actual_cents = coalesce(p_actual_cents, price_actual_cents),
    budget_movement_id = mv
  where id = p_item
  returning * into it;
  return it;
end $$;

-- Reabre un pendiente y revierte su movimiento vinculado (si existe).
create or replace function public.reopen_item(p_item uuid)
returns public.items
language plpgsql security definer set search_path = public as $$
declare it items%rowtype; mv uuid;
begin
  select * into it from items where id = p_item for update;
  if not found or not public.is_member(it.household_id) then raise exception 'forbidden'; end if;
  mv := it.budget_movement_id;
  update items set done_at = null, done_by = null, budget_movement_id = null
    where id = p_item returning * into it;
  if mv is not null then delete from budget_movements where id = mv; end if;
  return it;
end $$;

-- Lock down: RPCs callable only by signed-in users.
revoke execute on function public.create_household(text, text, text) from public, anon;
revoke execute on function public.create_invite(uuid)               from public, anon;
revoke execute on function public.join_household(text, text, text)  from public, anon;
revoke execute on function public.create_budget(uuid, text, bigint) from public, anon;
revoke execute on function public.complete_item(uuid, bigint, uuid) from public, anon;
revoke execute on function public.reopen_item(uuid)                 from public, anon;
grant  execute on function public.create_household(text, text, text) to authenticated;
grant  execute on function public.create_invite(uuid)               to authenticated;
grant  execute on function public.join_household(text, text, text)  to authenticated;
grant  execute on function public.create_budget(uuid, text, bigint) to authenticated;
grant  execute on function public.complete_item(uuid, bigint, uuid) to authenticated;
grant  execute on function public.reopen_item(uuid)                 to authenticated;

-- ───────────────────────── Realtime
alter publication supabase_realtime add table
  public.items, public.events, public.budgets, public.budget_movements, public.household_members;

-- ───────────────────────── Storage (fotos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- path = {household_id}/{item_id}.webp
create policy photos_member_select on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy photos_member_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy photos_member_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy photos_member_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_member(((storage.foldername(name))[1])::uuid));

-- ───────────────────────── Reminders (pg_cron → Edge Function)
-- Ejecutar una vez tras desplegar la función (requiere extensiones pg_cron y pg_net en el proyecto):
--
-- select cron.schedule('lola-send-reminders', '*/5 * * * *', $$
--   select net.http_post(
--     url     := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
--     headers := jsonb_build_object('Content-Type', 'application/json',
--                                   'x-cron-secret', '<CRON_SECRET>'),
--     body    := '{}'::jsonb);
-- $$);

-- Cola que consume la Edge Function (service role).
create or replace function public.due_reminders()
returns table (event_id uuid, household_id uuid, title text, starts_at timestamptz, place text)
language sql stable security definer set search_path = public as $$
  select id, household_id, title, starts_at, place
  from events
  where reminded_at is null
    and remind_minutes is not null
    and starts_at > now()
    and starts_at - make_interval(mins => remind_minutes) <= now()
  order by starts_at
  limit 200;
$$;
revoke execute on function public.due_reminders() from public, anon, authenticated;
grant  execute on function public.due_reminders() to service_role;
