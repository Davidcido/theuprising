import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadMessages = (userId?: string) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!userId) return;
    // Count unread messages where sender is not the current user
    const { count } = await supabase
      .from("direct_messages")
      .select("*", { count: "exact", head: true })
      .eq("read", false)
      .neq("sender_id", userId)
      .in(
        "conversation_id",
        (await supabase
          .from("conversations")
          .select("id")
          .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`)
        ).data?.map((c) => c.id) || []
      );
    setUnreadCount(count || 0);
  }, [userId]);

  useEffect(() => {
    fetchUnread();
    if (!userId) return;
    const channel = supabase
      .channel("unread-messages")
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
