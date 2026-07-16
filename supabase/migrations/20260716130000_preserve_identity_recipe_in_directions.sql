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
  select * into direction from public.brand_directions where id = target_direction_id and status <> 'archived' for update;
  if not found or private.brand_workspace_role(direction.brand_id) not in ('owner', 'editor') then
    raise exception 'Editor access is required to activate a direction.';
  end if;
  if jsonb_typeof(direction.snapshot->'brief') <> 'object' or jsonb_typeof(direction.snapshot->'tokens') <> 'object' or jsonb_typeof(direction.snapshot->'candidates') <> 'array' then
    raise exception 'This direction has an invalid snapshot.';
  end if;
  update public.brands set
    name = coalesce(nullif(trim(direction.snapshot->>'name'), ''), name),
    brief = direction.snapshot->'brief',
    identity_recipe = coalesce(direction.snapshot->'identityRecipe', identity_recipe)
  where id = direction.brand_id;
  insert into public.brand_tokens (brand_id, dtcg_json, version)
  values (direction.brand_id, direction.snapshot->'tokens', coalesce((direction.snapshot->>'tokenVersion')::integer, 1))
  on conflict (brand_id) do update set dtcg_json = excluded.dtcg_json, version = greatest(public.brand_tokens.version + 1, excluded.version);
  delete from public.name_candidates where brand_id = direction.brand_id;
  for candidate in select value from jsonb_array_elements(direction.snapshot->'candidates') loop
    insert into public.name_candidates (brand_id, term, provenance, scores, availability_json, is_shortlisted)
    values (direction.brand_id, left(coalesce(candidate->>'term', ''), 160), coalesce(candidate->'provenance', '{}'::jsonb), coalesce(candidate->'scores', '{}'::jsonb), coalesce(candidate->'availability', '{}'::jsonb), coalesce((candidate->>'isShortlisted')::boolean, false));
  end loop;
  update public.brand_directions set is_active = false where brand_id = direction.brand_id and is_active;
  update public.brand_directions set is_active = true where id = direction.id;
end;
$$;
