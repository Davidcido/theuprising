import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePinnedPost = (userId?: string) => {
  const [pinnedPostId, setPinnedPostId] = useState<string | null>(null);

  const fetchPinned = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("pinned_post_id")
      .eq("user_id", userId)
      .single();
    if (data) setPinnedPostId((data as any).pinned_post_id || null);
  }, [userId]);

  const pinPost = async (postId: string) => {
    if (!userId) return;
    await supabase.from("profiles").update({ pinned_post_id: postId }).eq("user_id", userId);
    setPinnedPostId(postId);
  };

  const unpinPost = async () => {
    if (!userId) return;
    await supabase.from("profiles").update({ pinned_post_id: null }).eq("user_id", userId);
    setPinnedPostId(null);
  };

  return { pinnedPostId, fetchPinned, pinPost, unpinPost };
};
