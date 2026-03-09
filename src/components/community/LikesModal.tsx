import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import UserAvatar from "@/components/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";

interface LikerProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface LikesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  likesCount: number;
  onNavigate: (path: string) => void;
}

const LikesModal = ({ open, onOpenChange, postId, likesCount, onNavigate }: LikesModalProps) => {
  const [likers, setLikers] = useState<LikerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [anonCount, setAnonCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const fetchLikers = async () => {
      setLoading(true);
      try {
        // Fetch likes that have a liker_user_id
        const { data: likes } = await supabase
          .from("community_likes")
          .select("liker_user_id")
          .eq("post_id", postId)
          .order("created_at", { ascending: false });

        if (cancelled) return;

        const userIds = (likes || [])
          .map((l: any) => l.liker_user_id)
          .filter(Boolean) as string[];
        
        const anonymousLikes = (likes || []).filter((l: any) => !l.liker_user_id).length;
        setAnonCount(anonymousLikes);

        if (userIds.length > 0) {
          const uniqueIds = [...new Set(userIds)];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, bio")
            .in("user_id", uniqueIds);

          if (!cancelled && profiles) {
            setLikers(profiles);
          }
        } else {
          setLikers([]);
        }
      } catch (err) {
        console.error("Failed to fetch likers:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLikers();

    // Real-time subscription for new likes
    const channel = supabase
      .channel(`likes-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_likes", filter: `post_id=eq.${postId}` },
        async () => {
          if (!cancelled) fetchLikers();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [open, postId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/15 max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Heart className="w-5 h-5 text-red-400" fill="currentColor" />
            Liked by {likesCount > 0 && <span className="text-muted-foreground text-sm font-normal">({likesCount})</span>}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-white/10 rounded w-24" />
                    <div className="h-2.5 bg-white/5 rounded w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : likers.length === 0 && anonCount === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No likes yet</p>
          ) : (
            <div className="space-y-1 py-1">
              {likers.map((liker) => (
                <button
                  key={liker.user_id}
                  onClick={() => {
                    onOpenChange(false);
                    onNavigate(`/profile/${liker.user_id}`);
                  }}
                  className="flex items-center gap-3 w-full px-2 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <UserAvatar
                    avatarUrl={liker.avatar_url}
                    displayName={liker.display_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {liker.display_name || "User"}
                    </p>
                    {liker.bio && (
                      <p className="text-[11px] text-muted-foreground truncate">{liker.bio}</p>
                    )}
                  </div>
                </button>
              ))}
              {anonCount > 0 && (
                <div className="flex items-center gap-3 px-2 py-2.5 text-muted-foreground">
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-xs">👤</div>
                  <span className="text-sm">
                    {anonCount} anonymous {anonCount === 1 ? "user" : "users"}
                  </span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LikesModal;
