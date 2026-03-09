import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ActivityBanner = () => {
  const [stats, setStats] = useState<{ posts: number; members: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        // Get recent posts count (last 24h)
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const [postsRes, membersRes] = await Promise.all([
          supabase.from("community_posts").select("id", { count: "exact", head: true }).gte("created_at", cutoff),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
        ]);
        if (!cancelled) {
          setStats({
            posts: postsRes.count || 0,
            members: membersRes.count || 0,
          });
        }
      } catch {
        // silently fail
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  if (!stats || (stats.posts === 0 && stats.members === 0)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex items-center justify-center gap-4 px-4 py-2.5 rounded-2xl border border-white/10 backdrop-blur-sm"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
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
