
-- Allow authenticated users to upload thumbnails to the avatars bucket
CREATE POLICY "Users can upload thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'thumbnails'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to upsert (update) their own thumbnails
CREATE POLICY "Users can update own thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'thumbnails'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
