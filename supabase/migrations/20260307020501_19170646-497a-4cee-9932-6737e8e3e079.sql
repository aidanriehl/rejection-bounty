-- Add foreign key from posts.user_id to profiles.id so PostgREST can resolve the join
ALTER TABLE public.posts 
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE