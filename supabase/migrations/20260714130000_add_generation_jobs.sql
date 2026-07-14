-- Durable observability for server-run generation work --------------------------
--
-- Jobs are written exclusively by trusted service-role workers. Workspace members
-- may read their own workspace's history, but cannot forge lifecycle state.

create type public.generation_job_status as enum (
  'queued',
  'running',
  'completed',
  'failed'
);

create type public.generation_job_type as enum (
  'full_kit'
);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  type public.generation_job_type not null,
  status public.generation_job_status not null default 'queued',
  trigger_run_id text not null check (char_length(trim(trigger_run_id)) between 1 and 200),
  attempt integer not null default 1 check (attempt > 0),
  error_type text check (error_type is null or char_length(error_type) <= 80),
  error_summary text check (error_summary is null or char_length(error_summary) <= 500),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trigger_run_id),
  check (
    (status in ('queued', 'running') and completed_at is null)
    or (status in ('completed', 'failed') and completed_at is not null)
  ),
  check (
    (status = 'failed' and error_type is not null and error_summary is not null)
    or (status <> 'failed' and error_type is null and error_summary is null)
  )
);

create index generation_jobs_workspace_created_idx
  on public.generation_jobs (workspace_id, created_at desc);
create index generation_jobs_brand_created_idx
  on public.generation_jobs (brand_id, created_at desc);

create trigger generation_jobs_set_updated_at
  before update on public.generation_jobs
  for each row execute function public.set_updated_at();

-- A job's brand must belong to its recorded workspace. Individual foreign keys
-- cannot express this relationship because brands use a single-column primary key.
create function public.validate_generation_job_brand_workspace()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.brands
    where id = new.brand_id
      and workspace_id = new.workspace_id
  ) then
    raise exception 'Generation job brand must belong to its workspace.';
  end if;

  return new;
end;
$$;

create trigger generation_jobs_validate_brand_workspace
  before insert or update of workspace_id, brand_id on public.generation_jobs
  for each row execute function public.validate_generation_job_brand_workspace();

alter table public.generation_jobs enable row level security;
alter table public.generation_jobs force row level security;

create policy "workspace members can view generation jobs"
  on public.generation_jobs for select to authenticated
  using (public.workspace_role(workspace_id) is not null);

-- The API exposes read-only observability. Only the Trigger worker's service-role
-- client may create or advance lifecycle records.
grant select on public.generation_jobs to authenticated;
