-- Editable deterministic identity inputs belong to the shared brand state.
alter table public.brands
  add column identity_recipe jsonb not null default '{"mark":"rounded","lockup":"horizontal","type":"editorial","tracking":"tight"}'::jsonb;
