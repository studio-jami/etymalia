-- User-managed AI credentials -------------------------------------------------
--
-- BYOK values are encrypted by Supabase Vault. The application table contains
-- only ownership and provider metadata; it never stores a plaintext credential.
-- Decryption is available only through a SECURITY DEFINER function granted to
-- service_role, which is called from the server-only production credential store.

create table public.user_ai_credentials (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google')),
  vault_secret_id uuid not null unique references vault.secrets (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create trigger user_ai_credentials_set_updated_at
  before update on public.user_ai_credentials
  for each row execute function public.set_updated_at();

-- This table is not exposed through the Data API. Application code may only
-- reach it through the server-side functions below.
alter table public.user_ai_credentials enable row level security;
alter table public.user_ai_credentials force row level security;

-- This function is intentionally service-role only. Server Actions authenticate
-- the caller before invoking it, so a user cannot submit a credential for a
-- different account through the Data API.
create function public.set_user_google_ai_credential(
  target_user_id uuid,
  api_key text
)
returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  existing_secret_id uuid;
begin
  if target_user_id is null then
    raise exception 'A user ID is required.';
  end if;

  if api_key is null or char_length(btrim(api_key)) = 0 then
    raise exception 'A Google API key is required.';
  end if;

  select vault_secret_id
    into existing_secret_id
    from public.user_ai_credentials
   where user_id = target_user_id
     and provider = 'google';

  if existing_secret_id is null then
    insert into public.user_ai_credentials (user_id, provider, vault_secret_id)
    values (
      target_user_id,
      'google',
      vault.create_secret(api_key, null, 'Etymalia user-managed Google AI credential')
    );
  else
    perform vault.update_secret(
      existing_secret_id,
      api_key,
      null,
      'Etymalia user-managed Google AI credential'
    );
  end if;
end;
$$;

-- Never grant this to authenticated users: it returns the decrypted credential
-- exclusively to the trusted web server's service-role client.
create function public.get_user_google_ai_credential(target_user_id uuid)
returns text
language sql
security definer
set search_path = public, vault, pg_temp
as $$
  select secret.decrypted_secret
  from public.user_ai_credentials credential
  join vault.decrypted_secrets secret on secret.id = credential.vault_secret_id
  where credential.user_id = target_user_id
    and credential.provider = 'google'
  limit 1;
$$;

revoke all on function public.set_user_google_ai_credential(uuid, text) from public;
revoke all on function public.get_user_google_ai_credential(uuid) from public;
grant execute on function public.set_user_google_ai_credential(uuid, text) to service_role;
grant execute on function public.get_user_google_ai_credential(uuid) to service_role;
