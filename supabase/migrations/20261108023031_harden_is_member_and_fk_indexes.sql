-- is_member: only signed-in users (Supabase advisor 0028); RLS policies run as authenticated.
revoke execute on function public.is_member(uuid) from public, anon;
grant  execute on function public.is_member(uuid) to authenticated;

-- Covering indexes for FKs (Supabase advisor 0001): deletes/cascades on items, movements and auth.users.
create index if not exists budget_movements_item_idx        on public.budget_movements (item_id);
create index if not exists budget_movements_created_by_idx  on public.budget_movements (created_by);
create index if not exists events_item_idx                  on public.events (item_id);
create index if not exists events_created_by_idx            on public.events (created_by);
create index if not exists household_invites_created_by_idx on public.household_invites (created_by);
create index if not exists household_invites_used_by_idx    on public.household_invites (used_by);
create index if not exists items_budget_movement_idx        on public.items (budget_movement_id);
create index if not exists items_created_by_idx             on public.items (created_by);
create index if not exists items_done_by_idx                on public.items (done_by);
create index if not exists push_subscriptions_user_idx      on public.push_subscriptions (user_id);
