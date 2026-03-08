import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  actor_id: string | null;
  reference_id: string | null;
  content: string;
  read: boolean;
  created_at: string;
  actor_profile?: { display_name: string | null; avatar_url: string } | null;
};

export const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      // Fetch actor profiles
      const actorIds = [...new Set(data.filter((n) => n.actor_id).map((n) => n.actor_id!))];
      let profilesMap: Record<string, { display_name: string | null; avatar_url: string }> = {};
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", actorIds);
        if (profiles) {
          for (const p of profiles) {
            profilesMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
          }
        }
      }

      const enriched = data.map((n) => ({
        ...n,
        actor_profile: n.actor_id ? profilesMap[n.actor_id] || null : null,
      }));
      setNotifications(enriched);
      setUnreadCount(enriched.filter((n) => !n.read).length);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    if (!userId) return;
    const channel = supabase
      .channel("user-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, userId]);

  const markAsRead = async (notificationId: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
    setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, loading, markAsRead, markAllRead, refetch: fetchNotifications };
};
