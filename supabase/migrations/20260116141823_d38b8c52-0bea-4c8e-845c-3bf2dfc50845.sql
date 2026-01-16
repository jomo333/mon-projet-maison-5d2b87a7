-- Create storage bucket for plans
INSERT INTO storage.buckets (id, name, public) 
VALUES ('plans', 'plans', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload plans to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'plans' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own plans
CREATE POLICY "Users can view their own plans"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'plans' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to read plans (for AI analysis)
CREATE POLICY "Public can view plans"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'plans');

-- Allow users to delete their own plans
CREATE POLICY "Users can delete their own plans"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'plans' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);