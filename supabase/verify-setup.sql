-- Read-only setup check. Does not read financial rows, emails, tokens, or passwords.
-- Run in Supabase SQL Editor after schema.sql.
with target as (
  select oid, relrowsecurity, relforcerowsecurity
  from pg_class where oid = to_regclass('public.money_workspaces')
), checks as (
  select 'Workspace table exists' as check_name, exists(select 1 from target) as passed
  union all
  select 'RLS enabled', coalesce((select relrowsecurity from target),false)
  union all
  select 'RLS forced', coalesce((select relforcerowsecurity from target),false)
  union all
  select 'Anonymous table access denied', exists(select 1 from target) and not coalesce(
    has_table_privilege('anon',to_regclass('public.money_workspaces'),'SELECT') or
    has_table_privilege('anon',to_regclass('public.money_workspaces'),'INSERT') or
    has_table_privilege('anon',to_regclass('public.money_workspaces'),'UPDATE') or
    has_table_privilege('anon',to_regclass('public.money_workspaces'),'DELETE'),true)
  union all
  select 'Authenticated table operations granted', coalesce(
    has_table_privilege('authenticated',to_regclass('public.money_workspaces'),'SELECT') and
    has_table_privilege('authenticated',to_regclass('public.money_workspaces'),'INSERT') and
    has_table_privilege('authenticated',to_regclass('public.money_workspaces'),'UPDATE') and
    has_table_privilege('authenticated',to_regclass('public.money_workspaces'),'DELETE'),false)
  union all
  select 'Exactly four expected policies',
    (select count(*)=4 and count(*) filter(where policyname in ('own_select','own_insert','own_update','own_delete'))=4
     from pg_policies where schemaname='public' and tablename='money_workspaces')
  union all
  select 'Revision trigger installed', exists(
    select 1 from pg_trigger where tgrelid=to_regclass('public.money_workspaces')
    and tgname='money_workspace_revision' and not tgisinternal and tgenabled='O')
)
select check_name, case when passed then 'PASS' else 'FAIL — review setup' end as result from checks;

-- Inspect these definitions too: a policy count alone does not prove isolation.
select policyname, cmd, roles, qual as using_expression, with_check
from pg_policies where schemaname='public' and tablename='money_workspaces'
order by policyname;
-- This is a configuration check, not a replacement for the two-user live tests.
