
CREATE TABLE public.featured_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url text NOT NULL,
  thumbnail_url text,
  username text,
  avatar text,
  challenge_title text,
  week_key text,
  display_order integer,
  completion_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view featured videos"
  ON public.featured_videos FOR SELECT
  USING (true);

CREATE POLICY "Admin can insert featured videos"
  ON public.featured_videos FOR INSERT
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid())::text = 'aidanriehl5@gmail.com'
  );

CREATE POLICY "Admin can update featured videos"
  ON public.featured_videos FOR UPDATE
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid())::text = 'aidanriehl5@gmail.com'
  );

CREATE POLICY "Admin can delete featured videos"
  ON public.featured_videos FOR DELETE
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid())::text = 'aidanriehl5@gmail.com'
  );
