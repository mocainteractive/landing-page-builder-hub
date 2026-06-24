-- Landing Page Builder Hub — persistence tables (lpb_*)
-- Lives inside the shared Moca Hub Supabase project. Multi-tenant: every row is
-- scoped by client_id and protected by RLS via the user_clients relationship,
-- exactly like the Hub's own tables. The frontend uses the ANON key; the
-- service_role key is never used by this app.

-- ── Projects ────────────────────────────────────────────────────────────────
create table if not exists public.lpb_projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  user_id     uuid references public.users (id) on delete set null,
  title       text not null default 'Senza titolo',
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists lpb_projects_client_idx on public.lpb_projects (client_id);

-- ── Brand library ───────────────────────────────────────────────────────────
create table if not exists public.lpb_brands (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  user_id     uuid references public.users (id) on delete set null,
  name        text not null default 'Brand',
  tokens      jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists lpb_brands_client_idx on public.lpb_brands (client_id);

-- ── Exported HTML versions ──────────────────────────────────────────────────
create table if not exists public.lpb_exports (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.lpb_projects (id) on delete set null,
  client_id   uuid not null references public.clients (id) on delete cascade,
  user_id     uuid references public.users (id) on delete set null,
  title       text not null default 'Export',
  html        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists lpb_exports_client_idx on public.lpb_exports (client_id);

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

-- ── Row Level Security ──────────────────────────────────────────────────────
-- A user may access a row only if assigned to its client_id (via user_clients).
alter table public.lpb_projects enable row level security;
alter table public.lpb_brands   enable row level security;
alter table public.lpb_exports  enable row level security;

-- lpb_projects
create policy "lpb_projects_select_own_clients" on public.lpb_projects
  for select to authenticated using (
    exists (select 1 from public.user_clients uc
            where uc.user_id = auth.uid() and uc.client_id = lpb_projects.client_id));
create policy "lpb_projects_insert_own_clients" on public.lpb_projects
  for insert to authenticated with check (
    exists (select 1 from public.user_clients uc
            where uc.user_id = auth.uid() and uc.client_id = lpb_projects.client_id));
create policy "lpb_projects_update_own_clients" on public.lpb_projects
  for update to authenticated
  using (exists (select 1 from public.user_clients uc
                 where uc.user_id = auth.uid() and uc.client_id = lpb_projects.client_id))
  with check (exists (select 1 from public.user_clients uc
                 where uc.user_id = auth.uid() and uc.client_id = lpb_projects.client_id));
create policy "lpb_projects_delete_own_clients" on public.lpb_projects
  for delete to authenticated using (
    exists (select 1 from public.user_clients uc
            where uc.user_id = auth.uid() and uc.client_id = lpb_projects.client_id));

-- lpb_brands
create policy "lpb_brands_select_own_clients" on public.lpb_brands
  for select to authenticated using (
    exists (select 1 from public.user_clients uc
            where uc.user_id = auth.uid() and uc.client_id = lpb_brands.client_id));
create policy "lpb_brands_insert_own_clients" on public.lpb_brands
  for insert to authenticated with check (
    exists (select 1 from public.user_clients uc
            where uc.user_id = auth.uid() and uc.client_id = lpb_brands.client_id));
create policy "lpb_brands_delete_own_clients" on public.lpb_brands
  for delete to authenticated using (
    exists (select 1 from public.user_clients uc
            where uc.user_id = auth.uid() and uc.client_id = lpb_brands.client_id));

-- lpb_exports
create policy "lpb_exports_select_own_clients" on public.lpb_exports
  for select to authenticated using (
    exists (select 1 from public.user_clients uc
            where uc.user_id = auth.uid() and uc.client_id = lpb_exports.client_id));
create policy "lpb_exports_insert_own_clients" on public.lpb_exports
  for insert to authenticated with check (
    exists (select 1 from public.user_clients uc
            where uc.user_id = auth.uid() and uc.client_id = lpb_exports.client_id));
create policy "lpb_exports_delete_own_clients" on public.lpb_exports
  for delete to authenticated using (
    exists (select 1 from public.user_clients uc
            where uc.user_id = auth.uid() and uc.client_id = lpb_exports.client_id));
