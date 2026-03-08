import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import { UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type SuggestedUser = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

interface SuggestedUsersProps {
  currentUserId?: string;
  followingIds: Set<string>;
  onFollow: (userId: string) => void;
  compact?: boolean;
}

const SuggestedUsers = ({ currentUserId, followingIds, onFollow, compact }: SuggestedUsersProps) => {
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedLocally, setFollowedLocally] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!currentUserId) { setLoading(false); return; }

      // Get active users with recent posts, excluding self and already followed
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, bio")
        .neq("user_id", currentUserId)
        .limit(20);

      if (!profiles) { setLoading(false); return; }

      // Filter out already followed users
      const filtered = profiles.filter(p => !followingIds.has(p.user_id));

      // Get post counts for ranking
      const userIds = filtered.map(p => p.user_id);
      const { data: posts } = await supabase
        .from("community_posts")
        .select("author_id")
        .in("author_id", userIds);

      const postCounts: Record<string, number> = {};
      posts?.forEach(p => {
        if (p.author_id) postCounts[p.author_id] = (postCounts[p.author_id] || 0) + 1;
      });

      // Get follower counts for ranking
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .in("following_id", userIds);

      const followerCounts: Record<string, number> = {};
      follows?.forEach(f => {
        followerCounts[f.following_id] = (followerCounts[f.following_id] || 0) + 1;
      });

      // Score and sort
      const scored = filtered.map(u => ({
        ...u,
        score: (postCounts[u.user_id] || 0) * 2 + (followerCounts[u.user_id] || 0) * 3,
      }));
      scored.sort((a, b) => b.score - a.score);

      setUsers(scored.slice(0, compact ? 3 : 5));
      setLoading(false);
    };

    fetchSuggestions();
  }, [currentUserId, followingIds, compact]);

  const handleFollow = async (userId: string) => {
    if (!currentUserId) return;
    setFollowedLocally(prev => new Set(prev).add(userId));
    await supabase.from("follows").insert({ follower_id: currentUserId, following_id: userId });
    await supabase.from("notifications").insert({
      user_id: userId,
      actor_id: currentUserId,
      type: "follow",
      content: "started following you",
    });
    onFollow(userId);
  };

  if (loading || users.length === 0) return null;

  return (
    <div
      className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 mb-4"
      style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
    >
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
        <UserPlus className="w-4 h-4 text-emerald-400" />
        Suggested for You
      </h3>
      <div className="space-y-3">
        {users.map(user => {
          const isFollowed = followedLocally.has(user.user_id);
          return (
            <div key={user.user_id} className="flex items-center gap-3">
              <UserAvatar
                avatarUrl={user.avatar_url}
                displayName={user.display_name || "User"}
                size="sm"
                onClick={() => navigate(`/profile/${user.user_id}`)}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium text-foreground truncate cursor-pointer hover:underline"
                  onClick={() => navigate(`/profile/${user.user_id}`)}
                >
                  {user.display_name || "User"}
                </p>
                {user.bio && (
                  <p className="text-[11px] text-muted-foreground truncate">{user.bio}</p>
                )}
              </div>
              <Button
                size="sm"
                variant={isFollowed ? "ghost" : "hero"}
                onClick={() => !isFollowed && handleFollow(user.user_id)}
                disabled={isFollowed}
                className="shrink-0 text-xs h-7 px-3 rounded-full"
              >
                {isFollowed ? <><Check className="w-3 h-3 mr-1" /> Following</> : "Follow"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestedUsers;
