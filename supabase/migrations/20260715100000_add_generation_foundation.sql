-- Request-first, runner-neutral durable generation foundation.

insert into storage.buckets (id, name, public)
values ('etymalia', 'etymalia', false)
on conflict (id) do update set public = false;

alter table public.generation_jobs
  alter column trigger_run_id drop not null;

alter table public.generation_jobs
  add column if not exists runner text,
  add column if not exists runner_run_id text,
  add column if not exists idempotency_key text,
  add column if not exists request_json jsonb,
  add column if not exists input_version jsonb,
  add column if not exists priority text,
  add column if not exists queued_at timestamptz not null default now();

alter table public.generation_jobs
  add constraint generation_jobs_runner_check
    check (runner is null or runner in ('trigger', 'cloudflare', 'fake')),
  add constraint generation_jobs_priority_check
    check (priority is null or priority in ('interactive', 'standard', 'background')),
  add constraint generation_jobs_queued_state_check
    check (status <> 'queued' or started_at is null),
  add constraint generation_jobs_running_state_check
    check (status <> 'running' or started_at is not null),
  add constraint generation_jobs_terminal_started_check
    check (status not in ('completed', 'failed') or started_at is not null),
  add constraint generation_jobs_terminal_order_check
    check (completed_at is null or started_at is null or completed_at >= started_at);

alter table public.generation_jobs
  drop constraint if exists generation_jobs_trigger_run_id_key;

drop index if exists public.generation_jobs_runner_run_id_key;
create unique index generation_jobs_runner_run_id_key
  on public.generation_jobs (runner_run_id)
  where runner_run_id is not null;

create unique index generation_jobs_workspace_idempotency_key
  on public.generation_jobs (workspace_id, idempotency_key)
  where idempotency_key is not null;

create index generation_jobs_brand_status_created_idx
  on public.generation_jobs (brand_id, status, created_at desc);

create or replace function public.validate_brand_storage_path()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  expected_workspace_id uuid;
  path_workspace_id uuid;
  path_brand_id uuid;
begin
  if new.storage_path !~ '^workspace/[0-9a-fA-F-]{36}/brand/[0-9a-fA-F-]{36}/.+$' then
    raise exception 'Storage path must be workspace/{workspaceId}/brand/{brandId}/...';
  end if;

  path_workspace_id := split_part(new.storage_path, '/', 2)::uuid;
  path_brand_id := split_part(new.storage_path, '/', 4)::uuid;
  select workspace_id into expected_workspace_id from public.brands where id = new.brand_id;

  if expected_workspace_id is null or path_brand_id <> new.brand_id or path_workspace_id <> expected_workspace_id then
    raise exception 'Storage path must belong to the asset brand workspace.';
  end if;

  return new;
end;
$$;

create trigger assets_validate_storage_path
  before insert or update of brand_id, storage_path on public.assets
  for each row execute function public.validate_brand_storage_path();

create trigger brand_references_validate_storage_path
  before insert or update of brand_id, storage_path on public.brand_references
  for each row execute function public.validate_brand_storage_path();

create trigger exports_validate_storage_path
  before insert or update of brand_id, storage_path on public.exports
  for each row execute function public.validate_brand_storage_path();
