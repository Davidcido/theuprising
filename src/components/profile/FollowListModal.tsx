import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, UserPlus, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConversations } from "@/hooks/useConversations";
import UserAvatar from "@/components/UserAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type FollowUser = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  isFollowing: boolean;
};

interface FollowListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  currentUserId?: string;
  mode: "followers" | "following";
}

const FollowListModal = ({ open, onOpenChange, targetUserId, currentUserId, mode }: FollowListModalProps) => {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { getOrCreateConversation } = useConversations(currentUserId);

  useEffect(() => {
    if (!open || !targetUserId) return;
    setLoading(true);

    const fetchList = async () => {
      // Get follow relationships
      const column = mode === "followers" ? "following_id" : "follower_id";
      const selectColumn = mode === "followers" ? "follower_id" : "following_id";

      const { data: follows } = await supabase
        .from("follows")
        .select("follower_id, following_id")
        .eq(column, targetUserId);

      if (!follows || follows.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const userIds = follows.map((f) => (mode === "followers" ? f.follower_id : f.following_id));

      // Fetch profiles for these users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, bio")
        .in("user_id", userIds);

      // Check which ones the current user follows
      let currentFollowingSet = new Set<string>();
      if (currentUserId) {
        const { data: currentFollows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUserId)
          .in("following_id", userIds);
        currentFollowingSet = new Set((currentFollows || []).map((f) => f.following_id));
      }

      const result: FollowUser[] = (profiles || []).map((p) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        bio: p.bio,
        isFollowing: currentFollowingSet.has(p.user_id),
      }));

      setUsers(result);
      setLoading(false);
    };

    fetchList();
  }, [open, targetUserId, mode, currentUserId]);

  const handleToggleFollow = async (userId: string, currentlyFollowing: boolean) => {
    if (!currentUserId || userId === currentUserId) return;
    setTogglingIds((s) => new Set(s).add(userId));

    if (currentlyFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", userId);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: userId });
      await supabase.from("notifications").insert({
        user_id: userId,
        actor_id: currentUserId,
        type: "follow",
        content: "started following you",
      });
    }

    setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, isFollowing: !currentlyFollowing } : u)));
    setTogglingIds((s) => {
      const n = new Set(s);
      n.delete(userId);
      return n;
    });
  };

  const handleMessage = async (userId: string) => {
    if (!currentUserId) return;
    if (userId === currentUserId) {
      toast.error("You can't message yourself");
      return;
    }
    const convId = await getOrCreateConversation(userId);
    if (convId) {
      onOpenChange(false);
      navigate(`/messages/${convId}`);
    } else {
      toast.error("Failed to open conversation");
    }
  };

  const handleUserClick = (userId: string) => {
    onOpenChange(false);
    navigate(`/profile/${userId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {mode === "followers" ? "Followers" : "Following"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              {mode === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          ) : (
            users.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
              >
                <button onClick={() => handleUserClick(user.user_id)} className="shrink-0">
                  <UserAvatar
                    avatarUrl={user.avatar_url}
                    displayName={user.display_name || "User"}
                    size="sm"
                  />
                </button>
                <button
                  onClick={() => handleUserClick(user.user_id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.display_name || "Anonymous"}
                  </p>
                  {user.bio && (
                    <p className="text-xs text-muted-foreground truncate">{user.bio}</p>
                  )}
                </button>
                {currentUserId && user.user_id !== currentUserId && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleMessage(user.user_id)}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={user.isFollowing ? "ghost" : "default"}
                      className={`h-8 text-xs px-2.5 ${user.isFollowing ? "text-muted-foreground border border-border" : ""}`}
                      disabled={togglingIds.has(user.user_id)}
                      onClick={() => handleToggleFollow(user.user_id, user.isFollowing)}
                    >
                      {user.isFollowing ? (
                        <><UserMinus className="w-3.5 h-3.5 mr-1" /> Unfollow</>
                      ) : (
                        <><UserPlus className="w-3.5 h-3.5 mr-1" /> Follow</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowListModal;
