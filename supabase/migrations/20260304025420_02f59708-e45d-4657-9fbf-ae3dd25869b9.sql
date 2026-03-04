
-- Create friendships table (one-directional follow)
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Prevent self-follows
CREATE OR REPLACE FUNCTION public.prevent_self_follow()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id = NEW.friend_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_self_follow
BEFORE INSERT ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_follow();

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can see their own friendships (who they follow)
CREATE POLICY "Users can view own friendships"
ON public.friendships FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can follow others
CREATE POLICY "Users can follow others"
ON public.friendships FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
ON public.friendships FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
