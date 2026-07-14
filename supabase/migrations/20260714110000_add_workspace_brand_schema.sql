-- Etymalia workspace model ----------------------------------------------------
--
-- This is additive by design. The existing brand_profiles/generated_assets
-- tables remain the Android compatibility model until an explicit, validated
-- data migration moves eligible records into this workspace hierarchy.

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  plan text not null default 'free' check (plan in ('free', 'pro', 'studio')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  brief jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brand_tokens (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null unique references public.brands (id) on delete cascade,
  dtcg_json jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.name_candidates (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  term text not null check (char_length(trim(term)) between 1 and 160),
  provenance jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  availability_json jsonb not null default '{}'::jsonb,
  is_shortlisted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brand_references (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  storage_path text not null,
  kind text not null check (kind in ('image', 'video', 'document', 'other')),
  title text not null default '',
  mime_type text not null default '',
  byte_size bigint check (byte_size is null or byte_size >= 0),
  extracted_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, storage_path)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  kind text not null,
  variant text not null default '',
  lockup text not null default '',
  format text not null check (format in ('svg', 'png', 'webp', 'pdf', 'ico', 'html', 'vcf', 'mp4', 'zip', 'other')),
  storage_path text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (brand_id, storage_path)
);

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete cascade,
  storage_path text not null,
  manifest_json jsonb not null default '{}'::jsonb,
  status text not null default 'ready' check (status in ('pending', 'ready', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (brand_id, storage_path)
);

create index memberships_user_workspace_idx
  on public.memberships (user_id, workspace_id);
create index brands_workspace_updated_idx
  on public.brands (workspace_id, updated_at desc);
create index name_candidates_brand_shortlist_created_idx
  on public.name_candidates (brand_id, is_shortlisted, created_at desc);
create index brand_references_brand_created_idx
  on public.brand_references (brand_id, created_at desc);
create index assets_brand_kind_created_idx
  on public.assets (brand_id, kind, created_at desc);
create index exports_brand_created_idx
  on public.exports (brand_id, created_at desc);

-- New workspaces receive an owner membership atomically. This lets the client
-- create its own workspace without a permissive bootstrap membership policy.
create function public.add_workspace_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.memberships (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger workspaces_add_owner_membership
  after insert on public.workspaces
  for each row execute function public.add_workspace_owner_membership();

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();
create trigger brand_tokens_set_updated_at
  before update on public.brand_tokens
  for each row execute function public.set_updated_at();
create trigger name_candidates_set_updated_at
  before update on public.name_candidates
  for each row execute function public.set_updated_at();
create trigger brand_references_set_updated_at
  before update on public.brand_references
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER helpers prevent recursive policies on memberships. They
-- expose only the caller's own role and use an explicit safe search_path.
create function public.workspace_role(target_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.role
  from public.memberships m
  where m.workspace_id = target_workspace_id
    and m.user_id = auth.uid()
  limit 1;
$$;

create function public.brand_workspace_role(target_brand_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.role
  from public.brands b
  join public.memberships m on m.workspace_id = b.workspace_id
  where b.id = target_brand_id
    and m.user_id = auth.uid()
  limit 1;
$$;

create function public.has_brand_storage_access(object_path text, allowed_roles text[])
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  path_workspace_id uuid;
  path_brand_id uuid;
begin
  if object_path !~ '^workspace/[0-9a-fA-F-]{36}/brand/[0-9a-fA-F-]{36}/.+$' then
    return false;
  end if;

  begin
    path_workspace_id := split_part(object_path, '/', 2)::uuid;
    path_brand_id := split_part(object_path, '/', 4)::uuid;
  exception
    when invalid_text_representation then return false;
  end;

  return exists (
    select 1
    from public.brands b
    join public.memberships m on m.workspace_id = b.workspace_id
    where b.id = path_brand_id
      and b.workspace_id = path_workspace_id
      and m.user_id = auth.uid()
      and m.role = any (allowed_roles)
  );
end;
$$;

revoke all on function public.workspace_role(uuid) from public;
revoke all on function public.brand_workspace_role(uuid) from public;
revoke all on function public.has_brand_storage_access(text, text[]) from public;
grant execute on function public.workspace_role(uuid) to authenticated;
grant execute on function public.brand_workspace_role(uuid) to authenticated;
grant execute on function public.has_brand_storage_access(text, text[]) to authenticated;

alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.brands enable row level security;
alter table public.brand_tokens enable row level security;
alter table public.name_candidates enable row level security;
alter table public.brand_references enable row level security;
alter table public.assets enable row level security;
alter table public.exports enable row level security;

alter table public.workspaces force row level security;
alter table public.memberships force row level security;
alter table public.brands force row level security;
alter table public.brand_tokens force row level security;
alter table public.name_candidates force row level security;
alter table public.brand_references force row level security;
alter table public.assets force row level security;
alter table public.exports force row level security;

create policy "workspace members can view workspaces"
  on public.workspaces for select to authenticated
  using (public.workspace_role(id) is not null);
create policy "users can create their own workspaces"
  on public.workspaces for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owners can update workspaces"
  on public.workspaces for update to authenticated
  using (public.workspace_role(id) = 'owner')
  with check (owner_id = auth.uid() and public.workspace_role(id) = 'owner');
create policy "owners can delete workspaces"
  on public.workspaces for delete to authenticated
  using (public.workspace_role(id) = 'owner');

create policy "workspace members can view memberships"
  on public.memberships for select to authenticated
  using (public.workspace_role(workspace_id) is not null);
create policy "owners can add memberships"
  on public.memberships for insert to authenticated
  with check (public.workspace_role(workspace_id) = 'owner');
create policy "owners can change other memberships"
  on public.memberships for update to authenticated
  using (public.workspace_role(workspace_id) = 'owner' and user_id <> auth.uid())
  with check (public.workspace_role(workspace_id) = 'owner' and user_id <> auth.uid());
create policy "owners can remove other memberships"
  on public.memberships for delete to authenticated
  using (public.workspace_role(workspace_id) = 'owner' and user_id <> auth.uid());

create policy "workspace members can view brands"
  on public.brands for select to authenticated
  using (public.workspace_role(workspace_id) is not null);
create policy "editors can create brands"
  on public.brands for insert to authenticated
  with check (public.workspace_role(workspace_id) in ('owner', 'editor'));
create policy "editors can update brands"
  on public.brands for update to authenticated
  using (public.workspace_role(workspace_id) in ('owner', 'editor'))
  with check (public.workspace_role(workspace_id) in ('owner', 'editor'));
create policy "editors can delete brands"
  on public.brands for delete to authenticated
  using (public.workspace_role(workspace_id) in ('owner', 'editor'));

create policy "workspace members can view brand tokens"
  on public.brand_tokens for select to authenticated
  using (public.brand_workspace_role(brand_id) is not null);
create policy "editors can create brand tokens"
  on public.brand_tokens for insert to authenticated
  with check (public.brand_workspace_role(brand_id) in ('owner', 'editor'));
create policy "editors can update brand tokens"
  on public.brand_tokens for update to authenticated
  using (public.brand_workspace_role(brand_id) in ('owner', 'editor'))
  with check (public.brand_workspace_role(brand_id) in ('owner', 'editor'));
create policy "editors can delete brand tokens"
  on public.brand_tokens for delete to authenticated
  using (public.brand_workspace_role(brand_id) in ('owner', 'editor'));

create policy "workspace members can view name candidates"
  on public.name_candidates for select to authenticated
  using (public.brand_workspace_role(brand_id) is not null);
create policy "editors can create name candidates"
  on public.name_candidates for insert to authenticated
  with check (public.brand_workspace_role(brand_id) in ('owner', 'editor'));
create policy "editors can update name candidates"
  on public.name_candidates for update to authenticated
  using (public.brand_workspace_role(brand_id) in ('owner', 'editor'))
  with check (public.brand_workspace_role(brand_id) in ('owner', 'editor'));
create policy "editors can delete name candidates"
  on public.name_candidates for delete to authenticated
  using (public.brand_workspace_role(brand_id) in ('owner', 'editor'));

create policy "workspace members can view brand references"
  on public.brand_references for select to authenticated
  using (public.brand_workspace_role(brand_id) is not null);
create policy "editors can create brand references"
  on public.brand_references for insert to authenticated
  with check (public.brand_workspace_role(brand_id) in ('owner', 'editor'));
create policy "editors can update brand references"
  on public.brand_references for update to authenticated
  using (public.brand_workspace_role(brand_id) in ('owner', 'editor'))
  with check (public.brand_workspace_role(brand_id) in ('owner', 'editor'));
create policy "editors can delete brand references"
  on public.brand_references for delete to authenticated
  using (public.brand_workspace_role(brand_id) in ('owner', 'editor'));

create policy "workspace members can view assets"
  on public.assets for select to authenticated
  using (public.brand_workspace_role(brand_id) is not null);
create policy "editors can create assets"
  on public.assets for insert to authenticated
  with check (public.brand_workspace_role(brand_id) in ('owner', 'editor'));
create policy "editors can update assets"
  on public.assets for update to authenticated
  using (public.brand_workspace_role(brand_id) in ('owner', 'editor'))
  with check (public.brand_workspace_role(brand_id) in ('owner', 'editor'));
create policy "editors can delete assets"
  on public.assets for delete to authenticated
  using (public.brand_workspace_role(brand_id) in ('owner', 'editor'));

create policy "workspace members can view exports"
  on public.exports for select to authenticated
  using (public.brand_workspace_role(brand_id) is not null);
create policy "editors can create exports"
  on public.exports for insert to authenticated
  with check (public.brand_workspace_role(brand_id) in ('owner', 'editor'));
create policy "editors can update exports"
  on public.exports for update to authenticated
  using (public.brand_workspace_role(brand_id) in ('owner', 'editor'))
  with check (public.brand_workspace_role(brand_id) in ('owner', 'editor'));
create policy "editors can delete exports"
  on public.exports for delete to authenticated
  using (public.brand_workspace_role(brand_id) in ('owner', 'editor'));

-- New project tables are private application data. Explicit grants are needed
-- because this Supabase project disables automatic Data API exposure.
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.brands to authenticated;
grant select, insert, update, delete on public.brand_tokens to authenticated;
grant select, insert, update, delete on public.name_candidates to authenticated;
grant select, insert, update, delete on public.brand_references to authenticated;
grant select, insert, update, delete on public.assets to authenticated;
grant select, insert, update, delete on public.exports to authenticated;

-- Supabase Storage policies for the private `etymalia` bucket. Every object
-- must be stored at workspace/{workspaceId}/brand/{brandId}/... .
create policy "workspace members can read etymalia objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'etymalia'
    and public.has_brand_storage_access(name, array['owner', 'editor', 'viewer'])
  );
create policy "editors can upload etymalia objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'etymalia'
    and public.has_brand_storage_access(name, array['owner', 'editor'])
  );
create policy "editors can update etymalia objects"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'etymalia'
    and public.has_brand_storage_access(name, array['owner', 'editor'])
  )
  with check (
    bucket_id = 'etymalia'
    and public.has_brand_storage_access(name, array['owner', 'editor'])
  );
create policy "editors can delete etymalia objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'etymalia'
    and public.has_brand_storage_access(name, array['owner', 'editor'])
  );
