
-- 1. Add unique constraint on challenge_completions
ALTER TABLE public.challenge_completions
  ADD CONSTRAINT challenge_completions_user_challenge_week_unique
  UNIQUE (user_id, challenge_id, week_key);

-- 2. Create challenges table
CREATE TABLE public.challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  emoji text NOT NULL DEFAULT '🎯',
  description text NOT NULL DEFAULT '',
  week_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can view challenges
CREATE POLICY "Anyone can view challenges"
  ON public.challenges FOR SELECT
  USING (true);

-- Only admin can insert/update
CREATE POLICY "Admin can insert challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid())::text = 'aidanriehl5@gmail.com'
  );

CREATE POLICY "Admin can update challenges"
  ON public.challenges FOR UPDATE
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid())::text = 'aidanriehl5@gmail.com'
  );

-- 3. Create user_messages table for support chat
CREATE TABLE public.user_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  sender text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.user_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can send messages"
  ON public.user_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND sender = 'user');

CREATE POLICY "Admin can view all messages"
  ON public.user_messages FOR SELECT
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid())::text = 'aidanriehl5@gmail.com'
  );

CREATE POLICY "Admin can send messages"
  ON public.user_messages FOR INSERT
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid())::text = 'aidanriehl5@gmail.com'
  );

-- Enable realtime for user_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_messages;
