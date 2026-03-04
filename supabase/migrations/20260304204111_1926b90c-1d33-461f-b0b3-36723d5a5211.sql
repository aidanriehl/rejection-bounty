ALTER TABLE public.weekly_drawings 
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS trim_start numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trim_end numeric;