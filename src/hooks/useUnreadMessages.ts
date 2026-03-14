import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadMessages = (userId?: string) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!userId) return;
    try {
      // First fetch conversation IDs, then count unread separately
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`);

      const convIds = convs?.map((c) => c.id) || [];
      if (convIds.length === 0) { setUnreadCount(0); return; }

      const { count } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("read", false)
        .neq("sender_id", userId)
        .in("conversation_id", convIds);

      setUnreadCount(count || 0);
    } catch (err) {
      console.error("[useUnreadMessages] fetch failed:", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchUnread();
    if (!userId) return;
    const channel = supabase
      .channel(`unread-messages-${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
      }, () => fetchUnread())
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "direct_messages",
      }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchUnread, userId]);

  return unreadCount;
};
