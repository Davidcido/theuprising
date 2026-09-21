import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useProfileViews = (profileUserId?: string, currentUserId?: string) => {
  const [totalViews, setTotalViews] = useState(0);
  const [weeklyViews, setWeeklyViews] = useState(0);
  const [recentViewers, setRecentViewers] = useState<{ user_id: string; display_name: string | null; avatar_url: string | null; viewed_at: string }[]>([]);

  const trackView = useCallback(async () => {
    if (!profileUserId || profileUserId === currentUserId) return;
    const sessionId = localStorage.getItem("uprising_session_id") || "anon";
    await supabase.from("profile_views").insert({
      profile_user_id: profileUserId,
      viewer_id: currentUserId || null,
      viewer_session_id: sessionId,
    });
  }, [profileUserId, currentUserId]);

  const fetchViews = useCallback(async () => {
    if (!profileUserId) return;

    // Counts come from a secure function: totals only, never who viewed
    const { data: counts } = await supabase.rpc("get_profile_view_counts" as any, {
      _profile_user_id: profileUserId,
    });
    const row: any = Array.isArray(counts) ? counts[0] : counts;
    setTotalViews(Number(row?.total_views) || 0);
    setWeeklyViews(Number(row?.weekly_views) || 0);

    // Recent viewers (only for profile owner)
    if (currentUserId === profileUserId) {
      const { data: views } = await supabase
        .from("profile_views")
        .select("viewer_id, viewed_at")
        .eq("profile_user_id", profileUserId)
        .not("viewer_id", "is", null)
        .order("viewed_at", { ascending: false })
        .limit(10);

      if (views && views.length > 0) {
        const viewerIds = [...new Set(views.map(v => v.viewer_id).filter(Boolean))] as string[];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", viewerIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const unique = new Map<string, any>();
        for (const v of views) {
          if (v.viewer_id && !unique.has(v.viewer_id)) {
            const prof = profileMap.get(v.viewer_id);
            unique.set(v.viewer_id, {
              user_id: v.viewer_id,
              display_name: prof?.display_name || null,
              avatar_url: prof?.avatar_url || null,
              viewed_at: v.viewed_at,
            });
          }
        }
        setRecentViewers(Array.from(unique.values()));
      }
    }
  }, [profileUserId, currentUserId]);

  useEffect(() => { trackView(); }, [trackView]);
  useEffect(() => { fetchViews(); }, [fetchViews]);

  return { totalViews, weeklyViews, recentViewers };
};
