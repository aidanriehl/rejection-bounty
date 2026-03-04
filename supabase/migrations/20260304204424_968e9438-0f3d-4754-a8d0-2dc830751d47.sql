
-- winner_messages table
CREATE TABLE public.winner_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_key text NOT NULL,
  winner_user_id uuid NOT NULL,
  sender text NOT NULL DEFAULT 'admin',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.winner_messages ENABLE ROW LEVEL SECURITY;

-- Winner can read their own messages
CREATE POLICY "Winners can view own messages"
  ON public.winner_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = winner_user_id);

-- Winner can insert replies (sender = 'user')
CREATE POLICY "Winners can reply"
  ON public.winner_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = winner_user_id AND sender = 'user');

-- Admin can view all messages
CREATE POLICY "Admin can view all messages"
  ON public.winner_messages FOR SELECT
  TO authenticated
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'aidanriehl5@gmail.com');

-- Admin can insert messages (sender = 'admin')
CREATE POLICY "Admin can send messages"
  ON public.winner_messages FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'aidanriehl5@gmail.com');

-- app_settings table (single row)
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_messaging_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Admin can update settings
CREATE POLICY "Admin can update settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'aidanriehl5@gmail.com');

-- Admin can insert settings
CREATE POLICY "Admin can insert settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'aidanriehl5@gmail.com');

-- Insert default row
INSERT INTO public.app_settings (winner_messaging_enabled) VALUES (true);

-- Enable realtime on winner_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.winner_messages;
