import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const VIEW_DEBOUNCE_KEY = "uprising_post_views";
const VIEW_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes per post per session

const getViewedPosts = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(VIEW_DEBOUNCE_KEY) || "{}");
  } catch {
    return {};
  }
};

const setViewedPosts = (views: Record<string, number>) => {
  try {
    // Clean old entries
    const now = Date.now();
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(views)) {
      if (now - v < VIEW_COOLDOWN_MS * 4) cleaned[k] = v;
    }
    localStorage.setItem(VIEW_DEBOUNCE_KEY, JSON.stringify(cleaned));
  } catch {}
};

export const usePostViewTracker = () => {
  const pendingViews = useRef<Set<string>>(new Set());
  const flushTimer = useRef<ReturnType<typeof setTimeout>>();

  const flushViews = useCallback(() => {
    if (pendingViews.current.size === 0) return;
    const ids = Array.from(pendingViews.current);
    pendingViews.current.clear();
    
    // Batch increment views
    ids.forEach(id => {
      supabase.rpc("increment_views", { post_id_input: id }).then(() => {});
    });
  }, []);

  const trackView = useCallback((postId: string) => {
    if (postId.startsWith("repost-") || postId.startsWith("optimistic-")) return;
    
    const viewed = getViewedPosts();
    const now = Date.now();
    const lastViewed = viewed[postId] || 0;
    
    if (now - lastViewed < VIEW_COOLDOWN_MS) return;
    
    viewed[postId] = now;
    setViewedPosts(viewed);
    
    pendingViews.current.add(postId);
    
    // Debounce flush to batch multiple views
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushViews, 1000);
  }, [flushViews]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushViews();
    };
  }, [flushViews]);

  return { trackView };
};
