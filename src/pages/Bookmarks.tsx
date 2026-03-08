import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Bookmark, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import UserAvatar from "@/components/UserAvatar";
import MediaGallery from "@/components/community/MediaGallery";
import { useNavigate } from "react-router-dom";

const Bookmarks = () => {
  const [userId, setUserId] = useState<string>();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });
  }, []);

  const { bookmarkedIds, toggleBookmark } = useBookmarks(userId);

  useEffect(() => {
    const fetchBookmarkedPosts = async () => {
      if (!userId || bookmarkedIds.size === 0) { setLoading(false); setPosts([]); return; }
      const ids = Array.from(bookmarkedIds);
      const { data } = await supabase
        .from("community_posts")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false });

      if (data) {
        const authorIds = [...new Set(data.filter(p => p.author_id).map(p => p.author_id))];
        let profilesMap: Record<string, any> = {};
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", authorIds as string[]);
          if (profiles) profiles.forEach(p => { profilesMap[p.user_id] = p; });
        }
        setPosts(data.map(p => ({ ...p, author_profile: p.author_id ? profilesMap[p.author_id] || null : null })));
      }
      setLoading(false);
    };
    fetchBookmarkedPosts();
  }, [userId, bookmarkedIds]);

  return (
    <div className="min-h-screen py-12 pb-24">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <Bookmark className="w-5 h-5 text-emerald-400" />
          <h1 className="text-2xl font-display font-bold text-foreground">Saved Posts</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg mb-1">No saved posts yet</p>
            <p className="text-sm">Bookmark posts from the community to find them here</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {posts.map(post => (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 rounded-2xl backdrop-blur-xl border border-white/10"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        avatarUrl={post.author_profile?.avatar_url}
                        displayName={post.author_profile?.display_name || post.anonymous_name}
                        size="xs"
                        onClick={post.author_id ? () => navigate(`/profile/${post.author_id}`) : undefined}
                      />
                      <span className="text-xs font-medium text-foreground">
                        {post.author_profile?.display_name || post.anonymous_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleBookmark(post.id)}
                      className="p-1.5 rounded-full hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors"
                      title="Remove bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-foreground/90 text-sm whitespace-pre-wrap break-words mb-2">{post.content}</p>
                  {post.media_urls && post.media_urls.length > 0 && <MediaGallery mediaUrls={post.media_urls} />}
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground/50">
                    <span>❤️ {post.likes_count}</span>
                    <span>💬 {post.comments_count}</span>
                    <span>🔁 {post.shares_count}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Bookmarks;
