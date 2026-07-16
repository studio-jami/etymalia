-- PostgREST's `on_conflict=workspace_id,idempotency_key` can target a unique
-- constraint, but not the previous partial unique index. A standard unique
-- constraint still permits multiple NULL idempotency keys and restores the
-- request-first upsert path used by the trusted generation action.

drop index if exists public.generation_jobs_workspace_idempotency_key;
alter table public.generation_jobs
  add constraint generation_jobs_workspace_idempotency_key
  unique (workspace_id, idempotency_key);
