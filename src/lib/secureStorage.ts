import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/hooks/useSignedUrl";

export type StorageBucket = "task-attachments" | "project-photos" | "plans";

/**
 * Get the current authenticated user's ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Build a storage path with user_id as the first segment for RLS compliance
 * Path format: user_id/...rest
 */
export function buildStoragePath(userId: string, ...segments: string[]): string {
  return [userId, ...segments].join("/");
}

/**
 * Upload a file to storage with proper user_id prefix for RLS
 */
export async function uploadFileSecure(
  bucket: StorageBucket,
  file: File,
  pathSegments: string[]
): Promise<{ path: string; url: string }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const fileExt = file.name.split(".").pop();
  const uniqueId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const fileName = `${uniqueId}.${fileExt}`;

  const path = buildStoragePath(userId, ...pathSegments, fileName);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file);

  if (uploadError) throw uploadError;

  // Generate a signed URL instead of public URL
  const signedUrl = await getSignedUrl(bucket, path);
  if (!signedUrl) {
    throw new Error("Failed to generate signed URL");
  }

  return { path, url: signedUrl };
}

/**
 * Delete a file from storage using the path
 */
export async function deleteFileSecure(
  bucket: StorageBucket,
  fileUrl: string
): Promise<void> {
  const bucketMarker = `/${bucket}/`;
  const markerIndex = fileUrl.indexOf(bucketMarker);
  
  if (markerIndex < 0) {
    // Try to extract path from signed URL
    const pathMatch = fileUrl.match(/\/storage\/v1\/object\/sign\/[^\/]+\/(.+?)(?:\?|$)/);
    if (pathMatch) {
      await supabase.storage.from(bucket).remove([decodeURIComponent(pathMatch[1])]);
      return;
    }
    throw new Error("Invalid file URL format");
  }

  const path = fileUrl.slice(markerIndex + bucketMarker.length).split("?")[0].split("#")[0];
  if (!path) throw new Error("Could not extract path from URL");

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

/**
 * Get storage path from a URL
 */
export function getPathFromUrl(bucket: StorageBucket, fileUrl: string): string | null {
  const bucketMarker = `/${bucket}/`;
  const markerIndex = fileUrl.indexOf(bucketMarker);
  
  if (markerIndex >= 0) {
    return fileUrl.slice(markerIndex + bucketMarker.length).split("?")[0].split("#")[0];
  }

  // Try signed URL format
  const pathMatch = fileUrl.match(/\/storage\/v1\/object\/sign\/[^\/]+\/(.+?)(?:\?|$)/);
  if (pathMatch) {
    return decodeURIComponent(pathMatch[1]);
  }

  return null;
}

/**
 * Download a file using authenticated storage API (bypasses RLS for reading)
 */
export async function downloadFileSecure(
  bucket: StorageBucket,
  path: string
): Promise<Blob> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  return data;
}

/**
 * Get a fresh signed URL for a file
 */
export async function getSecureUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Convert a public URL to a signed URL
 * Returns original URL if conversion fails
 */
export async function publicToSignedUrl(
  fileUrl: string,
  expiresIn: number = 3600
): Promise<string> {
  // Detect bucket from URL
  let bucket: StorageBucket | null = null;
  if (fileUrl.includes("/task-attachments/")) bucket = "task-attachments";
  else if (fileUrl.includes("/project-photos/")) bucket = "project-photos";
  else if (fileUrl.includes("/plans/")) bucket = "plans";

  if (!bucket) return fileUrl;

  const path = getPathFromUrl(bucket, fileUrl);
  if (!path) return fileUrl;

  try {
    return await getSecureUrl(bucket, path, expiresIn);
  } catch {
    // Return original URL as fallback
    return fileUrl;
  }
}
