import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useFollow = (currentUserId?: string, targetUserId?: string) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (!targetUserId) return;
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", targetUserId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", targetUserId),
    ]);
    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);
  }, [targetUserId]);

  const checkFollowing = useCallback(async () => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) return;
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .maybeSingle();
    setIsFollowing(!!data);
  }, [currentUserId, targetUserId]);

  useEffect(() => {
    fetchCounts();
    checkFollowing();
  }, [fetchCounts, checkFollowing]);

  const toggleFollow = async () => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) return;
    setLoading(true);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", targetUserId);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: targetUserId });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
      // Create notification
      await supabase.from("notifications").insert({
        user_id: targetUserId,
        actor_id: currentUserId,
        type: "follow",
        content: "started following you",
      });
    }
    setLoading(false);
  };

  return { isFollowing, followerCount, followingCount, toggleFollow, loading, refetch: fetchCounts };
};
