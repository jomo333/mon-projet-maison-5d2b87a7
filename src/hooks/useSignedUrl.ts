import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache for signed URLs to avoid regenerating them frequently
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

// URL expiry time in seconds (1 hour)
const SIGNED_URL_EXPIRY = 3600;

// Buffer time before expiry to refresh (5 minutes)
const REFRESH_BUFFER = 300;

/**
 * Extract bucket name and path from a Supabase storage URL
 */
export function parseStorageUrl(fileUrl: string): { bucket: string; path: string } | null {
  if (!fileUrl) return null;

  // Match patterns like:
  // https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
  // https://xxx.supabase.co/storage/v1/object/sign/bucket-name/path/to/file
  const patterns = [
    /\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/(.+?)(?:\?.*)?$/,
    // Also match direct bucket references: /bucket-name/path
    /\/([^\/]+)\/(.+?)(?:\?.*)?$/,
  ];

  for (const pattern of patterns) {
    const match = fileUrl.match(pattern);
    if (match) {
      return { bucket: match[1], path: decodeURIComponent(match[2]) };
    }
  }

  return null;
}

/**
 * Detect bucket from URL for common bucket patterns
 */
function detectBucket(fileUrl: string): string | null {
  if (fileUrl.includes("/task-attachments/")) return "task-attachments";
  if (fileUrl.includes("/project-photos/")) return "project-photos";
  if (fileUrl.includes("/plans/")) return "plans";
  return null;
}

/**
 * Generate a signed URL for a file
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string | null> {
  const cacheKey = `${bucket}:${path}`;
  const now = Date.now() / 1000;

  // Check cache
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > now + REFRESH_BUFFER) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }

    // Cache the URL
    signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: now + expiresIn,
    });

    return data.signedUrl;
  } catch (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }
}

/**
 * Generate a signed URL from a public URL
 */
export async function getSignedUrlFromPublicUrl(
  publicUrl: string,
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string | null> {
  const bucket = detectBucket(publicUrl);
  if (!bucket) return null;

  // Extract path after bucket name
  const bucketMarker = `/${bucket}/`;
  const markerIndex = publicUrl.indexOf(bucketMarker);
  if (markerIndex < 0) return null;

  const path = publicUrl.slice(markerIndex + bucketMarker.length).split("?")[0].split("#")[0];
  if (!path) return null;

  return getSignedUrl(bucket, path, expiresIn);
}

/**
 * Hook for getting a signed URL from a public file URL
 */
export function useSignedUrl(publicUrl: string | null | undefined): {
  signedUrl: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSignedUrl = useCallback(async () => {
    if (!publicUrl) {
      setSignedUrl(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = await getSignedUrlFromPublicUrl(publicUrl);
      if (url) {
        setSignedUrl(url);
      } else {
        // If we can't generate a signed URL, try to use the original
        // This handles cases where the file might be in a different bucket
        setError("Could not generate signed URL");
        setSignedUrl(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSignedUrl(null);
    } finally {
      setLoading(false);
    }
  }, [publicUrl]);

  useEffect(() => {
    fetchSignedUrl();
  }, [fetchSignedUrl]);

  return { signedUrl, loading, error, refetch: fetchSignedUrl };
}

/**
 * Hook for batch-generating signed URLs for multiple files
 */
export function useSignedUrls(publicUrls: string[]): {
  signedUrls: Map<string, string>;
  loading: boolean;
  refetch: () => void;
} {
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchSignedUrls = useCallback(async () => {
    if (publicUrls.length === 0) {
      setSignedUrls(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);

    const results = new Map<string, string>();

    await Promise.all(
      publicUrls.map(async (url) => {
        const signedUrl = await getSignedUrlFromPublicUrl(url);
        if (signedUrl) {
          results.set(url, signedUrl);
        }
      })
    );

    setSignedUrls(results);
    setLoading(false);
  }, [publicUrls.join(",")]);

  useEffect(() => {
    fetchSignedUrls();
  }, [fetchSignedUrls]);

  return { signedUrls, loading, refetch: fetchSignedUrls };
}

/**
 * Clear the signed URL cache (useful when user logs out)
 */
export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
}
