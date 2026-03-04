
-- Challenge completions table (tracks videos uploaded per challenge per week)
CREATE TABLE public.challenge_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_key TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Prize pool table
CREATE TABLE public.prize_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL UNIQUE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Weekly drawings table
CREATE TABLE public.weekly_drawings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_key TEXT NOT NULL UNIQUE,
  prize_amount NUMERIC NOT NULL DEFAULT 0,
  winner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  winning_video_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_drawings ENABLE ROW LEVEL SECURITY;

-- RLS policies for challenge_completions
CREATE POLICY "Users can insert own completions" ON public.challenge_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own completions" ON public.challenge_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all completions" ON public.challenge_completions FOR SELECT TO authenticated USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'aidanriehl5@gmail.com'
);

-- RLS policies for subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'aidanriehl5@gmail.com'
);

-- RLS policies for prize_pool (readable by all authenticated users for realtime)
CREATE POLICY "Anyone can view prize pool" ON public.prize_pool FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can update prize pool" ON public.prize_pool FOR UPDATE TO authenticated USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'aidanriehl5@gmail.com'
);
CREATE POLICY "Admin can insert prize pool" ON public.prize_pool FOR INSERT TO authenticated WITH CHECK (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'aidanriehl5@gmail.com'
);

-- RLS policies for weekly_drawings (readable by all for slot machine)
CREATE POLICY "Anyone can view weekly drawings" ON public.weekly_drawings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert weekly drawings" ON public.weekly_drawings FOR INSERT TO authenticated WITH CHECK (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'aidanriehl5@gmail.com'
);
CREATE POLICY "Admin can update weekly drawings" ON public.weekly_drawings FOR UPDATE TO authenticated USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'aidanriehl5@gmail.com'
);

-- Enable realtime for prize_pool and weekly_drawings
ALTER PUBLICATION supabase_realtime ADD TABLE public.prize_pool;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_drawings;

-- Function: increment prize pool when subscription is created
CREATE OR REPLACE FUNCTION public.increment_prize_pool()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month TEXT;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  INSERT INTO public.prize_pool (month, total_amount, updated_at)
  VALUES (current_month, 3.50, now())
  ON CONFLICT (month) DO UPDATE SET
    total_amount = prize_pool.total_amount + 3.50,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscription_created
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_prize_pool();

-- Function: calculate tickets for a given week
CREATE OR REPLACE FUNCTION public.calculate_tickets(p_week_key TEXT)
RETURNS TABLE(user_id UUID, username TEXT, avatar TEXT, video_count BIGINT, tickets INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.user_id,
    p.username,
    p.avatar,
    COUNT(cc.id) AS video_count,
    CASE
      WHEN COUNT(cc.id) >= 5 THEN 8
      ELSE COUNT(cc.id)::INT
    END AS tickets
  FROM public.challenge_completions cc
  JOIN public.profiles p ON p.id = cc.user_id
  WHERE cc.week_key = p_week_key
    AND cc.video_url IS NOT NULL
  GROUP BY cc.user_id, p.username, p.avatar;
END;
$$;
