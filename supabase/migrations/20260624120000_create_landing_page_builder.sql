-- Landing Page Builder Hub — persistence tables (lpb_*)
-- Designed to live inside the Moca Hub Supabase project alongside the hub schema.
-- Rows are scoped by the Moca client/user resolved from the launch-token session.
-- Access is performed exclusively via the service role from the app's API routes
-- (which bypass RLS); RLS is enabled with no public policies so anon/auth roles
-- cannot read or write these tables directly.

-- Saved landing-page projects (brand tokens + ordered blocks).
create table if not exists public.lpb_projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null,
  user_id     uuid,
  title       text not null default 'Senza titolo',
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists lpb_projects_client_idx on public.lpb_projects (client_id);
create index if not exists lpb_projects_updated_idx on public.lpb_projects (updated_at desc);

-- Reusable brand library per client.
create table if not exists public.lpb_brands (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null,
  user_id     uuid,
  name        text not null default 'Brand',
  tokens      jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists lpb_brands_client_idx on public.lpb_brands (client_id);

-- Exported HTML versions.
create table if not exists public.lpb_exports (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.lpb_projects (id) on delete set null,
  client_id   uuid not null,
  user_id     uuid,
  title       text not null default 'Export',
  html        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists lpb_exports_client_idx on public.lpb_exports (client_id);
create index if not exists lpb_exports_project_idx on public.lpb_exports (project_id);

-- Keep updated_at fresh on project writes.
create or replace function public.lpb_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lpb_projects_touch on public.lpb_projects;
create trigger lpb_projects_touch
  before update on public.lpb_projects
  for each row execute function public.lpb_touch_updated_at();

-- Lock down direct access; the service role (used by the app's API routes)
-- bypasses RLS, so no policies are needed for the app to function.
alter table public.lpb_projects enable row level security;
alter table public.lpb_brands   enable row level security;
alter table public.lpb_exports  enable row level security;
