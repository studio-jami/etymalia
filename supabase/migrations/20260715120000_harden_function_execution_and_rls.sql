-- Restore least-privilege execution on SECURITY DEFINER helpers and avoid
-- per-row auth initialization in workspace and membership RLS policies.

alter function public.set_updated_at()
  set search_path = public, pg_temp;

-- Trigger functions do not need Data API execution grants.
revoke all on function public.add_workspace_owner_membership()
  from public, anon, authenticated, service_role;
revoke all on function public.rls_auto_enable()
  from public, anon, authenticated, service_role;

-- RLS helpers are callable only by signed-in users. They intentionally retain
-- SECURITY DEFINER to avoid recursive membership-policy evaluation.
revoke all on function public.workspace_role(uuid) from public, anon;
revoke all on function public.brand_workspace_role(uuid) from public, anon;
revoke all on function public.has_brand_storage_access(text, text[]) from public, anon;
grant execute on function public.workspace_role(uuid) to authenticated;
grant execute on function public.brand_workspace_role(uuid) to authenticated;
grant execute on function public.has_brand_storage_access(text, text[]) to authenticated;

-- Credential helpers are trusted-server-only. Do not expose them through the
-- Data API to anonymous or ordinary authenticated clients.
revoke all on function public.set_user_google_ai_credential(uuid, text)
  from public, anon, authenticated;
revoke all on function public.get_user_google_ai_credential(uuid)
  from public, anon, authenticated;
grant execute on function public.set_user_google_ai_credential(uuid, text) to service_role;
grant execute on function public.get_user_google_ai_credential(uuid) to service_role;

-- Wrap auth-dependent values in scalar subqueries so Postgres evaluates each
-- value once per statement rather than once per candidate row.
drop policy "users can create their own workspaces" on public.workspaces;
create policy "users can create their own workspaces"
  on public.workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy "owners can update workspaces" on public.workspaces;
create policy "owners can update workspaces"
  on public.workspaces for update to authenticated
  using ((select public.workspace_role(id)) = 'owner')
  with check (
    owner_id = (select auth.uid())
    and (select public.workspace_role(id)) = 'owner'
  );

drop policy "owners can change other memberships" on public.memberships;
create policy "owners can change other memberships"
  on public.memberships for update to authenticated
  using (
    (select public.workspace_role(workspace_id)) = 'owner'
    and user_id <> (select auth.uid())
  )
  with check (
    (select public.workspace_role(workspace_id)) = 'owner'
    and user_id <> (select auth.uid())
  );

drop policy "owners can remove other memberships" on public.memberships;
create policy "owners can remove other memberships"
  on public.memberships for delete to authenticated
  using (
    (select public.workspace_role(workspace_id)) = 'owner'
    and user_id <> (select auth.uid())
  );
