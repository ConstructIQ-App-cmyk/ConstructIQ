-- ConstructIQ shared company data setup
-- Run this once in Supabase: SQL Editor > New query > Run.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'manager', 'foreman', 'member')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  job_type text not null,
  location text not null,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  name text not null,
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  job_id uuid references public.jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.crew_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  crew_id uuid not null references public.crews(id) on delete cascade,
  name text not null,
  role text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.material_catalog (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  default_unit text not null,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stock_location_id uuid not null references public.stock_locations(id) on delete cascade,
  material_id uuid references public.material_catalog(id) on delete set null,
  name text not null,
  quantity numeric not null default 0,
  unit text not null,
  low_stock_threshold numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  tool_identifier text,
  checked_out_to text,
  updated_at timestamptz not null default now()
);

create index if not exists jobs_company_id_idx on public.jobs(company_id);
create index if not exists crews_company_id_idx on public.crews(company_id);
create index if not exists stock_locations_company_id_idx on public.stock_locations(company_id);
create index if not exists stock_items_location_id_idx on public.stock_items(stock_location_id);

-- Security helpers. They are used by the row-level security policies below.
create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = target_company_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_company_owner(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.companies
    where id = target_company_id and owner_id = auth.uid()
  );
$$;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.jobs enable row level security;
alter table public.inspection_items enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.stock_locations enable row level security;
alter table public.material_catalog enable row level security;
alter table public.stock_items enable row level security;
alter table public.tools enable row level security;

drop policy if exists company_read on public.companies;
drop policy if exists company_create on public.companies;
drop policy if exists company_update on public.companies;
create policy company_read on public.companies for select using (public.is_company_member(id));
create policy company_create on public.companies for insert with check (owner_id = auth.uid());
create policy company_update on public.companies for update using (owner_id = auth.uid());

drop policy if exists member_read on public.company_members;
drop policy if exists member_add on public.company_members;
drop policy if exists member_update on public.company_members;
create policy member_read on public.company_members for select using (public.is_company_member(company_id));
create policy member_add on public.company_members for insert with check (
  public.is_company_owner(company_id) or (user_id = auth.uid() and public.is_company_owner(company_id))
);
create policy member_update on public.company_members for update using (public.is_company_owner(company_id));

-- First version: all members of a company may create, update, or remove operational data.
-- Role-specific edit limits can be added later.
drop policy if exists jobs_member_access on public.jobs;
create policy jobs_member_access on public.jobs for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists inspections_member_access on public.inspection_items;
create policy inspections_member_access on public.inspection_items for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists crews_member_access on public.crews;
create policy crews_member_access on public.crews for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists crew_members_member_access on public.crew_members;
create policy crew_members_member_access on public.crew_members for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists stock_locations_member_access on public.stock_locations;
create policy stock_locations_member_access on public.stock_locations for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists material_catalog_member_access on public.material_catalog;
create policy material_catalog_member_access on public.material_catalog for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists stock_items_member_access on public.stock_items;
create policy stock_items_member_access on public.stock_items for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists tools_member_access on public.tools;
create policy tools_member_access on public.tools for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
