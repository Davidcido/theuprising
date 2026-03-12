import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const WARMUP_KEY = "uprising_feed_warmup";
const WARMUP_TTL = 3 * 60 * 1000; // 3 minutes

/**
 * Silently prefetches the first batch of community posts on app load
 * so the feed is already cached when the user navigates to /community.
 */
export function useFeedWarmup() {
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;

    // Check if we already have a fresh warmup cache
    try {
      const raw = localStorage.getItem(WARMUP_KEY);
      if (raw) {
        const { ts } = JSON.parse(raw);
        if (Date.now() - ts < WARMUP_TTL) return; // still fresh
      }
    } catch {}

    // Fire and forget — don't block anything
    const warmup = async () => {
      try {
        const { data } = await supabase
          .from("community_posts")
          .select("id, content, anonymous_name, author_id, is_anonymous, likes_count, comments_count, shares_count, views_count, created_at, media_urls, original_post_id, reposted_by_name, engagement_score")
          .order("created_at", { ascending: false })
          .limit(15);

        if (data && data.length > 0) {
          localStorage.setItem(
            WARMUP_KEY,
            JSON.stringify({ posts: data, ts: Date.now() })
          );
          // Also populate the main feed cache
          localStorage.setItem(
            "uprising_community_cache",
            JSON.stringify({ posts: data, ts: Date.now() })
          );
        }
      } catch {
        // Silent — warmup failure is not critical
      }
    };

    // Delay slightly to not compete with critical app initialization
    const timer = setTimeout(warmup, 1500);
    return () => clearTimeout(timer);
  }, []);
}
