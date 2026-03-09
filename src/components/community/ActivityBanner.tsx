import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ActivityBanner = () => {
  const [stats, setStats] = useState<{ posts: number; members: number; activeNow: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const now = new Date();
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

        const [postsRes, membersRes, activeRes] = await Promise.all([
          supabase.from("community_posts").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", fiveMinAgo),
        ]);
        if (!cancelled) {
          setStats({
            posts: postsRes.count || 0,
            members: membersRes.count || 0,
            activeNow: activeRes.count || 0,
          });
        }
      } catch {
        // silently fail
      }
    };
    fetchStats();
    // Refresh every 30s
    const interval = setInterval(fetchStats, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (!stats || (stats.posts === 0 && stats.members === 0 && stats.activeNow === 0)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex items-center justify-center gap-4 px-4 py-2.5 rounded-2xl border border-white/10 backdrop-blur-sm"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {stats.activeNow > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span><strong className="text-foreground">{stats.activeNow}</strong> active now</span>
        </div>
      )}
      {stats.members > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span><strong className="text-foreground">{stats.members}</strong> members</span>
        </div>
      )}
      {stats.posts > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span><strong className="text-foreground">{stats.posts}</strong> posts today</span>
        </div>
      )}
    </motion.div>
  );
};

export default ActivityBanner;
