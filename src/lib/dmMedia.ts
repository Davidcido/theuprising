import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "dm-media";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

const cache = new Map<string, { url: string; expiresAt: number }>();

/** Extracts the storage object path from a stored dm-media attachment URL. */
export function getDmMediaPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

/** Creates (and caches) a signed URL for a private dm-media attachment. */
export async function getDmMediaUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const path = getDmMediaPath(url);
  if (!path) return url; // not a dm-media attachment — use as-is

  const cached = cache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;

  cache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + (SIGNED_URL_TTL_SECONDS - 300) * 1000,
  });
  return data.signedUrl;
}

/** React helper that resolves a stored attachment URL to a viewable URL. */
export function useDmMediaUrl(url: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(() =>
    url && !getDmMediaPath(url) ? url : null,
  );

  useEffect(() => {
    let active = true;
    if (!url) {
      setResolved(null);
      return;
    }
    if (!getDmMediaPath(url)) {
      setResolved(url);
      return;
    }
    getDmMediaUrl(url).then((signed) => {
      if (active) setResolved(signed);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return resolved;
}
