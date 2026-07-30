-- Run this once after setup-shared-data.sql.
-- It stores the current ConstructIQ workspace state for a company.

create table if not exists public.company_app_state (
  company_id uuid primary key references public.companies(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.company_app_state enable row level security;

drop policy if exists company_app_state_member_access on public.company_app_state;
create policy company_app_state_member_access on public.company_app_state
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

-- Creates a company, makes the signed-in user its owner, and returns its join code.
create or replace function public.create_company_workspace(company_name text)
returns table (company_id uuid, join_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  new_join_code text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  insert into public.companies (name, owner_id)
  values (trim(company_name), auth.uid())
  returning id, companies.join_code into new_company_id, new_join_code;

  insert into public.company_members (company_id, user_id, role)
  values (new_company_id, auth.uid(), 'owner');

  insert into public.company_app_state (company_id, data, updated_by)
  values (new_company_id, '{}'::jsonb, auth.uid());

  return query select new_company_id, new_join_code;
end;
$$;

grant execute on function public.create_company_workspace(text) to authenticated;

-- Enable live update events for connected company members.
alter table public.company_app_state replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'company_app_state'
  ) then
    alter publication supabase_realtime add table public.company_app_state;
  end if;
end $$;
