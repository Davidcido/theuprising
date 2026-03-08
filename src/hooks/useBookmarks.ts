import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBookmarks = (userId?: string) => {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", userId);
    if (data) setBookmarkedIds(new Set(data.map(b => b.post_id)));
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const toggleBookmark = async (postId: string) => {
    if (!userId) return;
    const isBookmarked = bookmarkedIds.has(postId);
    if (isBookmarked) {
      setBookmarkedIds(prev => { const n = new Set(prev); n.delete(postId); return n; });
      await supabase.from("bookmarks").delete().eq("user_id", userId).eq("post_id", postId);
    } else {
      setBookmarkedIds(prev => new Set(prev).add(postId));
      await supabase.from("bookmarks").insert({ user_id: userId, post_id: postId });
    }
  };

  const isBookmarked = (postId: string) => bookmarkedIds.has(postId);

  return { bookmarkedIds, isBookmarked, toggleBookmark, loading, refetch: fetchBookmarks };
};
