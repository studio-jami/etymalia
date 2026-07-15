-- Retire the removed Android prototype's compatibility schema.
-- Keep prior migrations immutable for applied-database history. Refuse to destroy
-- unknown user data: archive or explicitly migrate legacy rows before applying.

do $$
begin
  if exists (select 1 from public.generated_assets limit 1)
    or exists (select 1 from public.brand_profiles limit 1) then
    raise exception
      'Legacy Android tables contain data. Archive or migrate it before retirement.';
  end if;
end;
$$;

drop table if exists public.generated_assets;
drop table if exists public.brand_profiles;
