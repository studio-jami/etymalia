-- Keep recursive RLS helpers out of the Data API's exposed public schema.
-- Policy execution still needs authenticated callers to use the private schema.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter function public.workspace_role(uuid) set schema private;
alter function public.brand_workspace_role(uuid) set schema private;
alter function public.has_brand_storage_access(text, text[]) set schema private;

revoke all on function private.workspace_role(uuid) from public, anon;
revoke all on function private.brand_workspace_role(uuid) from public, anon;
revoke all on function private.has_brand_storage_access(text, text[]) from public, anon;
grant execute on function private.workspace_role(uuid) to authenticated;
grant execute on function private.brand_workspace_role(uuid) to authenticated;
grant execute on function private.has_brand_storage_access(text, text[]) to authenticated;

-- This authenticated RPC remains public, but it must use the private role
-- helper after its schema move.
create or replace function public.replace_name_candidates(
  target_brand_id uuid,
  replacements jsonb
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if private.brand_workspace_role(target_brand_id) not in ('owner', 'editor') then
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

revoke all on function public.replace_name_candidates(uuid, jsonb) from public, anon;
grant execute on function public.replace_name_candidates(uuid, jsonb) to authenticated;
