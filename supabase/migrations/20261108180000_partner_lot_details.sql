-- Additional structured partner listing fields used by the marketplace UI.
ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS seller_name text,
  ADD COLUMN IF NOT EXISTS seller_phone text,
  ADD COLUMN IF NOT EXISTS land_type text,
  ADD COLUMN IF NOT EXISTS title_status text;
