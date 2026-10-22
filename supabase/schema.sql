-- Run once in a NEW Supabase project's SQL Editor. No keys or financial data here.
begin;
create table public.money_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null,
  revision bigint not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now(),
  constraint workspace_shape check (
    jsonb_typeof(data) = 'object' and data->>'version' = '1'
    and jsonb_typeof(data->'categories') = 'array'
    and jsonb_typeof(data->'transactions') = 'array'
    and jsonb_typeof(data->'bills') = 'array'
    and jsonb_typeof(data->'budgets') = 'object'
    and data ?& array['version','categories','transactions','bills','budgets']
    and octet_length(data::text) <= 2000000
  )
);
alter table public.money_workspaces enable row level security;
alter table public.money_workspaces force row level security;
revoke all on public.money_workspaces from public, anon, authenticated;
grant select, insert, update, delete on public.money_workspaces to authenticated;
create policy own_select on public.money_workspaces for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.money_workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.money_workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_delete on public.money_workspaces for delete to authenticated using ((select auth.uid()) = user_id);
-- Do not accept fabricated owner changes or arbitrary revision values.
create function public.money_workspace_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    NEW.revision := 1;
  else
    if NEW.user_id <> OLD.user_id then raise exception 'Owner cannot change'; end if;
    NEW.revision := OLD.revision + 1;
  end if;
  NEW.updated_at := now();
  return NEW;
end;
$$;
revoke all on function public.money_workspace_revision() from public;
create trigger money_workspace_revision before insert or update on public.money_workspaces for each row execute function public.money_workspace_revision();
commit;
