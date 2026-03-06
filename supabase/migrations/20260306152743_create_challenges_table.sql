-- Create challenges table for storing weekly challenges
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  description TEXT,
  week_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index on week_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_challenges_week_key ON public.challenges(week_key);

-- Add RLS policies
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can read challenges
CREATE POLICY "Anyone can read challenges"
  ON public.challenges
  FOR SELECT
  USING (true);

-- Only authenticated users can insert (admin check should be done in app)
CREATE POLICY "Authenticated users can insert challenges"
  ON public.challenges
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update
CREATE POLICY "Authenticated users can update challenges"
  ON public.challenges
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only authenticated users can delete
CREATE POLICY "Authenticated users can delete challenges"
  ON public.challenges
  FOR DELETE
  TO authenticated
  USING (true);

-- Add unique constraint on challenge_completions for upsert
ALTER TABLE public.challenge_completions
  ADD CONSTRAINT challenge_completions_unique_user_challenge_week
  UNIQUE (user_id, challenge_id, week_key);
