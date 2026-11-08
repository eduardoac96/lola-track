-- Data API grants are explicit in this project (new tables are NOT auto-exposed).
-- Signed-in users only; RLS still filters every row. anon gets nothing.
revoke all on public.households, public.household_members, public.household_invites,
              public.budgets, public.budget_movements, public.items, public.events,
              public.push_subscriptions, public.budget_balances from anon;

grant select, update                 on public.households         to authenticated;
grant select, update, delete         on public.household_members  to authenticated;
grant select, insert, update, delete on public.budgets            to authenticated;
grant select, insert, update, delete on public.budget_movements   to authenticated;
grant select, insert, update, delete on public.items              to authenticated;
grant select, insert, update, delete on public.events             to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select                         on public.budget_balances    to authenticated;
-- household_invites: RPC only (no grants).

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage on type public.item_type, public.item_priority to authenticated, service_role;
