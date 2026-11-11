-- v1.3 · Deseos por persona (T36) + recordatorio de urgentes 3 veces al día (T37).

-- ───────────────────────── Deseos
-- Cada miembro tiene su lista. Solo el dueño crea/edita/borra sus deseos; todo el hogar los ve.
create table public.wishes (
  id                     uuid primary key default gen_random_uuid(),
  household_id           uuid not null,
  owner_id               uuid not null default auth.uid(),
  title                  text not null check (char_length(title) between 1 and 200),
  price_estimated_cents  bigint check (price_estimated_cents is null or (price_estimated_cents >= 0 and price_estimated_cents <= 100000000000)),
  link_url               text check (link_url is null or link_url ~* '^https?://'),
  notes                  text check (notes is null or char_length(notes) <= 2000),
  starred                boolean not null default false,  -- "lo que más quiero"
  got_at                 timestamptz,                     -- el dueño marcó "Ya lo tengo"
  sort_order             double precision not null default (-extract(epoch from now()) * 1000),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- el dueño debe ser miembro del hogar; si sale del hogar, su lista se va con él
  foreign key (household_id, owner_id) references public.household_members (household_id, user_id) on delete cascade
);
create index wishes_household_owner_idx on public.wishes (household_id, owner_id, sort_order);
create index wishes_owner_idx on public.wishes (owner_id);
create trigger wishes_updated_at before update on public.wishes
  for each row execute function public.set_updated_at();

alter table public.wishes enable row level security;
create policy wishes_select on public.wishes for select to authenticated
  using (public.is_member(household_id));
create policy wishes_insert_own on public.wishes for insert to authenticated
  with check (public.is_member(household_id) and owner_id = (select auth.uid()));
create policy wishes_update_own on public.wishes for update to authenticated
  using (public.is_member(household_id) and owner_id = (select auth.uid()))
  with check (public.is_member(household_id) and owner_id = (select auth.uid()));
create policy wishes_delete_own on public.wishes for delete to authenticated
  using (public.is_member(household_id) and owner_id = (select auth.uid()));

-- ───────────────────────── Apartados (sorpresa)
-- "Lo aparto" / "Ya lo compré" sobre el deseo de otro. Invisible para el dueño del deseo:
-- tabla aparte con RLS que excluye al dueño, y SIN Realtime (los DELETE de Realtime no respetan RLS).
create table public.wish_claims (
  wish_id       uuid primary key references public.wishes (id) on delete cascade,
  household_id  uuid not null references public.households (id) on delete cascade,
  status        text not null default 'apartado' check (status in ('apartado', 'comprado')),
  claimed_by    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index wish_claims_household_idx on public.wish_claims (household_id);
create index wish_claims_claimed_by_idx on public.wish_claims (claimed_by);
create trigger wish_claims_updated_at before update on public.wish_claims
  for each row execute function public.set_updated_at();

-- ¿El deseo es de este hogar y NO es mío? (security definer: no depende del RLS de wishes)
create or replace function public.can_claim_wish(p_wish uuid, p_household uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from wishes w
    where w.id = p_wish
      and w.household_id = p_household
      and w.owner_id <> auth.uid()
      and public.is_member(w.household_id)
  );
$$;
revoke execute on function public.can_claim_wish(uuid, uuid) from public, anon;
grant  execute on function public.can_claim_wish(uuid, uuid) to authenticated;

alter table public.wish_claims enable row level security;
create policy wish_claims_not_owner on public.wish_claims for all to authenticated
  using (public.can_claim_wish(wish_id, household_id))
  with check (public.can_claim_wish(wish_id, household_id) and claimed_by = (select auth.uid()));

revoke all on public.wishes, public.wish_claims from anon;
grant select, insert, update, delete on public.wishes      to authenticated;
grant select, insert, update, delete on public.wish_claims to authenticated;
grant select, insert, update, delete on public.wishes, public.wish_claims to service_role;

alter publication supabase_realtime add table public.wishes;

-- ───────────────────────── Recordatorio de urgentes (8:00, 13:00 y 19:00 Monterrey)
alter table public.households add column if not exists urgent_reminders boolean not null default true;
alter table public.households add column if not exists last_urgent_reminder timestamptz;
-- No disparar el turno ya pasado de hoy al desplegar.
update public.households set last_urgent_reminder = now() where last_urgent_reminder is null;

-- Un renglón por hogar con urgentes sin hacer cuyo turno actual aún no se avisó.
create or replace function public.urgent_reminders()
returns table (household_id uuid, slot timestamptz, item_ids uuid[], titles text[])
language sql stable security definer set search_path = public as $$
  with clock as (
    select now() at time zone 'America/Monterrey' as ln
  ), cur as (
    select (date_trunc('day', ln) + make_interval(hours => case
              when extract(hour from ln) >= 19 then 19
              when extract(hour from ln) >= 13 then 13
              else 8 end)) at time zone 'America/Monterrey' as slot
    from clock
    where extract(hour from ln) >= 8
  )
  select i.household_id, c.slot,
         array_agg(i.id order by i.sort_order, i.created_at),
         array_agg(i.title order by i.sort_order, i.created_at)
  from items i
  join households h on h.id = i.household_id
  cross join cur c
  where i.priority = 'urgente'
    and i.done_at is null
    and h.urgent_reminders
    and (h.last_urgent_reminder is null or h.last_urgent_reminder < c.slot)
  group by i.household_id, c.slot;
$$;
revoke execute on function public.urgent_reminders() from public, anon, authenticated;
grant  execute on function public.urgent_reminders() to service_role;
