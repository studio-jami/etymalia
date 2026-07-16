-- Persistent, non-destructive creative directions. A direction captures the
-- editable brand state at a moment in time; activating one restores that
-- snapshot atomically through a guarded RPC.

create table public.brand_directions (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  is_active boolean not null default false,
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index brand_directions_one_active_idx
  on public.brand_directions (brand_id)
  where is_active;
create index brand_directions_brand_updated_idx
  on public.brand_directions (brand_id, updated_at desc);

create trigger brand_directions_set_updated_at
  before update on public.brand_directions
  for each row execute function public.set_updated_at();

alter table public.brand_directions enable row level security;
alter table public.brand_directions force row level security;

create policy "workspace members can view brand directions"
  on public.brand_directions for select to authenticated
  using (private.brand_workspace_role(brand_id) is not null);
create policy "editors can create brand directions"
  on public.brand_directions for insert to authenticated
  with check (
    private.brand_workspace_role(brand_id) in ('owner', 'editor')
    and created_by = auth.uid()
  );
create policy "editors can update brand directions"
  on public.brand_directions for update to authenticated
  using (private.brand_workspace_role(brand_id) in ('owner', 'editor'))
  with check (private.brand_workspace_role(brand_id) in ('owner', 'editor'));
create policy "editors can delete brand directions"
  on public.brand_directions for delete to authenticated
  using (private.brand_workspace_role(brand_id) in ('owner', 'editor'));

grant select, insert, update, delete on public.brand_directions to authenticated;

create or replace function public.activate_brand_direction(target_direction_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  direction public.brand_directions%rowtype;
  candidate jsonb;
begin
  select * into direction
  from public.brand_directions
  where id = target_direction_id and status <> 'archived'
  for update;

  if not found or private.brand_workspace_role(direction.brand_id) not in ('owner', 'editor') then
    raise exception 'Editor access is required to activate a direction.';
  end if;

  if jsonb_typeof(direction.snapshot->'brief') <> 'object'
    or jsonb_typeof(direction.snapshot->'tokens') <> 'object'
    or jsonb_typeof(direction.snapshot->'candidates') <> 'array' then
    raise exception 'This direction has an invalid snapshot.';
  end if;

  update public.brands
  set name = coalesce(nullif(trim(direction.snapshot->>'name'), ''), name),
      brief = direction.snapshot->'brief'
  where id = direction.brand_id;

  insert into public.brand_tokens (brand_id, dtcg_json, version)
  values (direction.brand_id, direction.snapshot->'tokens', coalesce((direction.snapshot->>'tokenVersion')::integer, 1))
  on conflict (brand_id) do update
  set dtcg_json = excluded.dtcg_json,
      version = greatest(public.brand_tokens.version + 1, excluded.version);

  delete from public.name_candidates where brand_id = direction.brand_id;
  for candidate in select value from jsonb_array_elements(direction.snapshot->'candidates') loop
    insert into public.name_candidates (brand_id, term, provenance, scores, availability_json, is_shortlisted)
    values (
      direction.brand_id,
      left(coalesce(candidate->>'term', ''), 160),
      coalesce(candidate->'provenance', '{}'::jsonb),
      coalesce(candidate->'scores', '{}'::jsonb),
      coalesce(candidate->'availability', '{}'::jsonb),
      coalesce((candidate->>'isShortlisted')::boolean, false)
    );
  end loop;

  update public.brand_directions set is_active = false where brand_id = direction.brand_id and is_active;
  update public.brand_directions set is_active = true where id = direction.id;
end;
$$;

revoke all on function public.activate_brand_direction(uuid) from public, anon;
grant execute on function public.activate_brand_direction(uuid) to authenticated;
