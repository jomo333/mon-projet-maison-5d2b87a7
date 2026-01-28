-- =============================================
-- SECURE STORAGE BUCKETS: Replace all storage policies
-- First drop ALL existing policies, then create new secure ones
-- =============================================

-- Drop ALL existing policies on storage.objects for these buckets
DROP POLICY IF EXISTS "Users can view their own task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own task attachments" ON storage.objects;

DROP POLICY IF EXISTS "Users can view their own plans" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own plans" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own plans" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own plans" ON storage.objects;

DROP POLICY IF EXISTS "Users can view their own project photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own project photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own project photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own project photos" ON storage.objects;

-- Also drop any old public access policies
DROP POLICY IF EXISTS "Public can view task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can view plans" ON storage.objects;
DROP POLICY IF EXISTS "Public can view project photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view plans" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view project photos" ON storage.objects;

-- =============================================
-- TASK-ATTACHMENTS BUCKET - Secure policies with user_id prefix
-- =============================================

CREATE POLICY "task_attachments_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "task_attachments_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "task_attachments_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "task_attachments_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================
-- PLANS BUCKET - Secure policies with user_id prefix  
-- =============================================

CREATE POLICY "plans_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'plans' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "plans_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'plans' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "plans_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'plans' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "plans_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'plans' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================
-- PROJECT-PHOTOS BUCKET - Secure policies with user_id prefix
-- =============================================

CREATE POLICY "project_photos_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "project_photos_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "project_photos_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "project_photos_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-photos' AND (storage.foldername(name))[1] = auth.uid()::text);