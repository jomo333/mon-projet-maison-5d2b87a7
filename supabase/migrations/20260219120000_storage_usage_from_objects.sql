-- Compute storage usage from actual storage.objects (user_storage_usage is never populated)
-- The first path segment (storage.foldername(name))[1] is the user_id
-- metadata->>'size' gives file size in bytes
CREATE OR REPLACE FUNCTION public.get_storage_usage_from_objects()
RETURNS TABLE(user_id uuid, bytes_used bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (split_part(o.name, '/', 1))::uuid AS user_id,
    COALESCE(SUM((o.metadata->>'size')::bigint), 0)::bigint AS bytes_used
  FROM storage.objects o
  WHERE o.bucket_id IN ('task-attachments', 'plans', 'project-photos')
    AND split_part(o.name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  GROUP BY split_part(o.name, '/', 1);
END;
$$;

-- Allow authenticated users (admin) to call this
GRANT EXECUTE ON FUNCTION public.get_storage_usage_from_objects() TO authenticated;
