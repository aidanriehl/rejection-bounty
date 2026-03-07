CREATE POLICY "Users can see who follows them"
ON public.friendships
FOR SELECT
TO authenticated
USING (auth.uid() = friend_id);