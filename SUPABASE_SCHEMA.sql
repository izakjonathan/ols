-- Ølands Service Supabase schema
-- Run this in the SQL editor of the Supabase project you want to reuse.

create table if not exists public.oland_service_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_oland_service_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_oland_service_updated_at on public.oland_service_state;

create trigger set_oland_service_updated_at
before update on public.oland_service_state
for each row
execute function public.set_oland_service_updated_at();

alter table public.oland_service_state enable row level security;

-- Prototype policy:
-- Allows the public anon key used by the website to read/write this one shared app-state table.
-- This matches the current prototype/open-backend setup.
drop policy if exists "oland_service_public_state_select" on public.oland_service_state;
drop policy if exists "oland_service_public_state_insert" on public.oland_service_state;
drop policy if exists "oland_service_public_state_update" on public.oland_service_state;
drop policy if exists "oland_service_public_state_delete" on public.oland_service_state;

create policy "oland_service_public_state_select"
on public.oland_service_state for select
to anon
using (true);

create policy "oland_service_public_state_insert"
on public.oland_service_state for insert
to anon
with check (true);

create policy "oland_service_public_state_update"
on public.oland_service_state for update
to anon
using (true)
with check (true);

create policy "oland_service_public_state_delete"
on public.oland_service_state for delete
to anon
using (true);

insert into public.oland_service_state (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;
