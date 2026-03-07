-- Create a security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email = 'aidanriehl5@gmail.com'
  )
$$;

-- Drop and recreate all admin policies that reference auth.users directly

-- challenges table
DROP POLICY IF EXISTS "Admin can insert challenges" ON public.challenges;
DROP POLICY IF EXISTS "Admin can update challenges" ON public.challenges;

CREATE POLICY "Admin can insert challenges"
ON public.challenges FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update challenges"
ON public.challenges FOR UPDATE TO authenticated
USING (public.is_admin());

-- Add delete policy for challenges (admin needs it)
CREATE POLICY "Admin can delete challenges"
ON public.challenges FOR DELETE TO authenticated
USING (public.is_admin());

-- app_settings table
DROP POLICY IF EXISTS "Admin can insert settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin can update settings" ON public.app_settings;

CREATE POLICY "Admin can insert settings"
ON public.app_settings FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update settings"
ON public.app_settings FOR UPDATE TO authenticated
USING (public.is_admin());

-- challenge_completions table
DROP POLICY IF EXISTS "Admin can view all completions" ON public.challenge_completions;

CREATE POLICY "Admin can view all completions"
ON public.challenge_completions FOR SELECT TO authenticated
USING (public.is_admin());

-- featured_videos table
DROP POLICY IF EXISTS "Admin can insert featured videos" ON public.featured_videos;
DROP POLICY IF EXISTS "Admin can update featured videos" ON public.featured_videos;
DROP POLICY IF EXISTS "Admin can delete featured videos" ON public.featured_videos;

CREATE POLICY "Admin can insert featured videos"
ON public.featured_videos FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update featured videos"
ON public.featured_videos FOR UPDATE TO authenticated
USING (public.is_admin());

CREATE POLICY "Admin can delete featured videos"
ON public.featured_videos FOR DELETE TO authenticated
USING (public.is_admin());

-- prize_pool table
DROP POLICY IF EXISTS "Admin can insert prize pool" ON public.prize_pool;
DROP POLICY IF EXISTS "Admin can update prize pool" ON public.prize_pool;

CREATE POLICY "Admin can insert prize pool"
ON public.prize_pool FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update prize pool"
ON public.prize_pool FOR UPDATE TO authenticated
USING (public.is_admin());

-- weekly_drawings table
DROP POLICY IF EXISTS "Admin can insert weekly drawings" ON public.weekly_drawings;
DROP POLICY IF EXISTS "Admin can update weekly drawings" ON public.weekly_drawings;

CREATE POLICY "Admin can insert weekly drawings"
ON public.weekly_drawings FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update weekly drawings"
ON public.weekly_drawings FOR UPDATE TO authenticated
USING (public.is_admin());

-- user_messages table
DROP POLICY IF EXISTS "Admin can send messages" ON public.user_messages;
DROP POLICY IF EXISTS "Admin can view all messages" ON public.user_messages;

CREATE POLICY "Admin can send messages"
ON public.user_messages FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can view all messages"
ON public.user_messages FOR SELECT TO authenticated
USING (public.is_admin());

-- winner_messages table
DROP POLICY IF EXISTS "Admin can send messages" ON public.winner_messages;
DROP POLICY IF EXISTS "Admin can view all messages" ON public.winner_messages;

CREATE POLICY "Admin can send messages"
ON public.winner_messages FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can view all messages"
ON public.winner_messages FOR SELECT TO authenticated
USING (public.is_admin());

-- subscriptions table
DROP POLICY IF EXISTS "Admin can view all subscriptions" ON public.subscriptions;

CREATE POLICY "Admin can view all subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (public.is_admin());