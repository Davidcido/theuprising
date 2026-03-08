import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBlocks = (currentUserId?: string) => {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [blockedByIds, setBlockedByIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchBlocks = useCallback(async () => {
    if (!currentUserId) { setLoading(false); return; }
    
    const { data: myBlocks } = await supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", currentUserId);
    
    if (myBlocks) setBlockedIds(new Set(myBlocks.map(b => b.blocked_id)));
    
    // Check who blocked me (via a broader query approach)
    // We can't directly query where blocked_id = me due to RLS
    // But we handle this server-side by checking in follow/message logic
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  const blockUser = async (targetId: string) => {
    if (!currentUserId || currentUserId === targetId) return;
    await supabase.from("user_blocks").insert({ blocker_id: currentUserId, blocked_id: targetId });
    
    // Also unfollow both directions
    await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", targetId);
    await supabase.from("follows").delete().eq("follower_id", targetId).eq("following_id", currentUserId);
    
    setBlockedIds(prev => new Set(prev).add(targetId));
  };

  const unblockUser = async (targetId: string) => {
    if (!currentUserId) return;
    await supabase.from("user_blocks").delete().eq("blocker_id", currentUserId).eq("blocked_id", targetId);
    setBlockedIds(prev => { const n = new Set(prev); n.delete(targetId); return n; });
  };

  const isBlocked = (userId: string) => blockedIds.has(userId);

  return { blockedIds, isBlocked, blockUser, unblockUser, loading, refetch: fetchBlocks };
};
