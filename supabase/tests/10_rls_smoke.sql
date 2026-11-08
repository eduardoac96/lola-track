\set ON_ERROR_STOP 1
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b'),('00000000-0000-0000-0000-00000000000c');
create temp table ctx (k text primary key, v text); grant all on ctx to authenticated;

set role authenticated;
-- A creates household + invite
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
insert into ctx select 'h1', public.create_household('Casa','Odin');
insert into ctx select 'code', public.create_invite((select v::uuid from ctx where k='h1'));
select 'invite code', v, length(v) from ctx where k='code';

-- B joins
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select public.join_household((select lower(v) from ctx where k='code'), 'Pareja') = (select v::uuid from ctx where k='h1') as b_joined;
select count(*) as b_sees_members from household_members;

-- C: own household, can't see h1, can't reuse code
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
insert into ctx select 'h2', public.create_household('Otra','C');
do $$ begin perform public.join_household((select v from ctx where k='code'),'C'); raise exception 'SHOULD FAIL'; exception when others then if sqlerrm='SHOULD FAIL' then raise; end if; raise notice 'C reuse code blocked: %', sqlerrm; end $$;

-- A: items + budget flow
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
insert into ctx select 'bb', public.create_budget((select v::uuid from ctx where k='h1'),'Bebé', 6000000);
insert into items (household_id, type, title, priority, price_estimated_cents)
  select v::uuid, 'compra', 'Cuna', 'urgente', 450000 from ctx where k='h1' returning id \gset item_
select done_at is not null as done, price_actual_cents, budget_movement_id is not null as linked
  from public.complete_item(:'item_id', 430000, (select v::uuid from ctx where k='bb'));
select name, added_cents, spent_cents, available_cents from budget_balances order by sort;
select done_at is null as reopened from public.reopen_item(:'item_id');
select name, available_cents from budget_balances where name='Bebé';

-- C cannot read or write h1
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
select (select count(*) from items) as c_items, (select count(*) from budgets) as c_budgets_only_own, (select count(*) from budget_movements) as c_movs;
do $$ begin
  insert into items (household_id, title) values ((select v::uuid from ctx where k='h1'),'hack');
  raise exception 'SHOULD FAIL';
exception when others then if sqlerrm='SHOULD FAIL' then raise; end if; raise notice 'C insert into h1 blocked: %', sqlerrm; end $$;
select set_config('test.item', :'item_id', false);
do $$ begin perform public.complete_item(current_setting('test.item')::uuid); raise exception 'SHOULD FAIL'; exception when others then if sqlerrm='SHOULD FAIL' then raise; end if; raise notice 'C complete_item on h1 blocked: %', sqlerrm; end $$;
do $$ declare r int; begin update items set title='x' where household_id=(select v::uuid from ctx where k='h1'); get diagnostics r = row_count; raise notice 'C update rows on h1: %', r; end $$;
-- C cannot link its movement to h1 budget
do $$ begin
  insert into budget_movements (household_id, budget_id, amount_cents) values ((select v::uuid from ctx where k='h2'), (select v::uuid from ctx where k='bb'), -100);
  raise exception 'SHOULD FAIL';
exception when others then if sqlerrm='SHOULD FAIL' then raise; end if; raise notice 'C cross-household movement blocked: %', sqlerrm; end $$;
-- storage path check
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
insert into storage.objects (bucket_id, name) select 'photos', v || '/x.webp' from ctx where k='h1';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
select count(*) as c_sees_h1_photos from storage.objects;

-- events: reminder reset + due_reminders
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
insert into events (household_id, title, starts_at, remind_minutes, reminded_at)
  select v::uuid, 'Plomero', now() + interval '59 minutes', 60, now() from ctx where k='h1' returning id \gset ev_
update events set starts_at = starts_at + interval '1 minute' where id = :'ev_id' returning reminded_at is null as reminder_reset;
reset role;
select title from public.due_reminders();
