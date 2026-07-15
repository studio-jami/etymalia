-- Preserve workspace ownership invariants and make name-candidate replacement atomic.

create or replace function public.protect_workspace_owner_membership()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  owner_id uuid;
begin
  select w.owner_id into owner_id from public.workspaces w where w.id = old.workspace_id;

  if old.user_id = owner_id and old.role = 'owner'
    and (tg_op = 'DELETE' or new.role <> 'owner') then
    raise exception 'Transfer workspace ownership before changing the owner membership.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger memberships_protect_workspace_owner
  before update of role or delete on public.memberships
  for each row execute function public.protect_workspace_owner_membership();

create or replace function public.replace_name_candidates(
  target_brand_id uuid,
  replacements jsonb
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.brand_workspace_role(target_brand_id) not in ('owner', 'editor') then
    raise exception 'Editor access is required to replace name candidates.';
  end if;

  if jsonb_typeof(replacements) <> 'array' or jsonb_array_length(replacements) = 0 then
    raise exception 'At least one name candidate is required.';
  end if;

  delete from public.name_candidates where brand_id = target_brand_id;

  insert into public.name_candidates (brand_id, term, provenance, scores, is_shortlisted)
  select
    target_brand_id,
    candidate.term,
    candidate.provenance,
    candidate.scores,
    false
  from jsonb_to_recordset(replacements) as candidate(
    term text,
    provenance jsonb,
    scores jsonb
  );
end;
$$;

revoke all on function public.replace_name_candidates(uuid, jsonb) from public;
grant execute on function public.replace_name_candidates(uuid, jsonb) to authenticated;
