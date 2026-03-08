import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Shield, Eye, EyeOff, Sparkles, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import { toast } from "@/hooks/use-toast";
import uprisingLogo from "@/assets/uprising-logo.jpeg";
import EmojiPicker from "@/components/EmojiPicker";
import { useNavigate } from "react-router-dom";
import { createNotification } from "@/lib/notifications";
import PostCard, { Post, Comment, Reaction } from "@/components/community/PostCard";

type FeedTab = "foryou" | "following" | "trending";

const FEED_TABS: { key: FeedTab; label: string; icon: typeof Sparkles }[] = [
  { key: "foryou", label: "For You", icon: Sparkles },
  { key: "following", label: "Following", icon: Users },
  { key: "trending", label: "Trending", icon: TrendingUp },
];

const getSessionId = () => {
  let id = localStorage.getItem("uprising_session_id");
  if (!id) {
    id = "User" + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem("uprising_session_id", id);
  }
  return id;
};

const Community = () => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [communityOpen, setCommunityOpen] = useState(true);
  const [postAnonymously, setPostAnonymously] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; displayName: string } | null>(null);
  const [reportMenuPost, setReportMenuPost] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>("foryou");
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const sessionId = getSessionId();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", session.user.id)
          .single();
        setCurrentUser({
          id: session.user.id,
          displayName: profile?.display_name || session.user.email?.split("@")[0] || "User",
        });
        // Fetch following list
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", session.user.id);
        if (follows) {
          setFollowingIds(new Set(follows.map(f => f.following_id)));
        }
      }
    });
  }, []);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const authorIds = [...new Set(data.filter((p: any) => p.author_id).map((p: any) => p.author_id))];
      let profilesMap: Record<string, { display_name: string | null; avatar_url: string }> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", authorIds);
        if (profiles) {
          for (const p of profiles) {
            profilesMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
          }
        }
      }
      setAllPosts(data.map((p: any) => ({
        ...p,
        author_profile: p.author_id ? profilesMap[p.author_id] || null : null,
      })));
    }
    setLoading(false);
  }, []);

  const fetchLikedPosts = useCallback(async () => {
    const { data } = await supabase
      .from("community_likes")
      .select("post_id")
      .eq("session_id", sessionId);
    if (data) setLikedPosts(new Set(data.map((l) => l.post_id)));
  }, [sessionId]);

  const fetchReactions = useCallback(async () => {
    const { data } = await supabase.from("community_reactions").select("*");
    if (data) {
      const grouped: Record<string, Reaction[]> = {};
      const mine = new Set<string>();
      for (const r of data) {
        if (!grouped[r.post_id]) grouped[r.post_id] = [];
        grouped[r.post_id].push(r);
        if (r.session_id === sessionId) mine.add(`${r.post_id}:${r.emoji}`);
      }
      setReactions(grouped);
      setMyReactions(mine);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchPosts();
    fetchLikedPosts();
    fetchReactions();

    supabase.from("community_settings").select("value").eq("key", "community_status").single()
      .then(({ data }) => { if (data) setCommunityOpen(data.value === "open"); });

    const postsChannel = supabase
      .channel("community-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => fetchPosts())
      .subscribe();

    const commentsChannel = supabase
      .channel("community-comments")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_comments" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newComment = payload.new as Comment;
          setComments((prev) => ({
            ...prev,
            [newComment.post_id]: [...(prev[newComment.post_id] || []), newComment],
          }));
        } else if (payload.eventType === "DELETE") {
          const oldComment = payload.old as { id: string; post_id: string };
          setComments((prev) => ({
            ...prev,
            [oldComment.post_id]: (prev[oldComment.post_id] || []).filter(c => c.id !== oldComment.id),
          }));
        }
      })
      .subscribe();

    const reactionsChannel = supabase
      .channel("community-reactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_reactions" }, () => fetchReactions())
      .subscribe();

    const settingsChannel = supabase
      .channel("community-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_settings" }, (payload) => {
        const row = payload.new as { key: string; value: string };
        if (row.key === "community_status") setCommunityOpen(row.value === "open");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [fetchPosts, fetchLikedPosts, fetchReactions]);

  // --- Feed sorting logic ---
  const displayPosts = useMemo(() => {
    switch (activeTab) {
      case "foryou": {
        // Smart ranked feed: sort by engagement_score descending, with follow boost
        return [...allPosts].sort((a, b) => {
          const scoreA = (a.engagement_score || 0) + (a.author_id && followingIds.has(a.author_id) ? 20 : 0);
          const scoreB = (b.engagement_score || 0) + (b.author_id && followingIds.has(b.author_id) ? 20 : 0);
          return scoreB - scoreA;
        });
      }
      case "following": {
        // Only posts from followed users, chronological
        return allPosts.filter(p => p.author_id && followingIds.has(p.author_id));
      }
      case "trending": {
        // Trending: high engagement velocity — posts from last 48h sorted by engagement per hour
        const now = Date.now();
        const cutoff = now - 48 * 60 * 60 * 1000;
        return [...allPosts]
          .filter(p => new Date(p.created_at).getTime() > cutoff)
          .sort((a, b) => {
            const hoursA = Math.max(1, (now - new Date(a.created_at).getTime()) / 3600000);
            const hoursB = Math.max(1, (now - new Date(b.created_at).getTime()) / 3600000);
            const velocityA = ((a.likes_count * 3) + (a.comments_count * 4) + (a.shares_count * 5)) / hoursA;
            const velocityB = ((b.likes_count * 3) + (b.comments_count * 4) + (b.shares_count * 5)) / hoursB;
            return velocityB - velocityA;
          });
      }
      default:
        return allPosts;
    }
  }, [allPosts, activeTab, followingIds]);

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 10000) setNewPost(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  };

  const addPost = async () => {
    if (!newPost.trim() || posting) return;
    setPosting(true);
    const insertData: any = {
      content: newPost.trim().slice(0, 10000),
      anonymous_name: postAnonymously ? sessionId : (currentUser?.displayName || sessionId),
      is_anonymous: postAnonymously,
    };
    if (!postAnonymously && currentUser) {
      insertData.author_id = currentUser.id;
    }
    const { error } = await supabase.from("community_posts").insert(insertData);
    if (error) {
      toast({ title: "Error", description: "Could not post. Try again.", variant: "destructive" });
    } else {
      setNewPost("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
    setPosting(false);
  };

  const toggleLike = async (postId: string) => {
    const isLiked = likedPosts.has(postId);
    const post = allPosts.find(p => p.id === postId);
    if (isLiked) {
      setLikedPosts((prev) => { const n = new Set(prev); n.delete(postId); return n; });
      setAllPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p));
      await supabase.from("community_likes").delete().eq("post_id", postId).eq("session_id", sessionId);
      await supabase.rpc("decrement_likes", { post_id_input: postId });
    } else {
      setLikedPosts((prev) => new Set(prev).add(postId));
      setAllPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p));
      await supabase.from("community_likes").insert({ post_id: postId, session_id: sessionId });
      await supabase.rpc("increment_likes", { post_id_input: postId });
      if (currentUser && post?.author_id && post.author_id !== currentUser.id) {
        createNotification(post.author_id, currentUser.id, "like", "liked your post", postId);
      }
    }
  };

  const toggleReaction = async (postId: string, emoji: string) => {
    const key = `${postId}:${emoji}`;
    const hasReacted = myReactions.has(key);
    if (hasReacted) {
      setMyReactions((prev) => { const n = new Set(prev); n.delete(key); return n; });
      setReactions((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((r) => !(r.session_id === sessionId && r.emoji === emoji)),
      }));
      await supabase.from("community_reactions").delete().eq("post_id", postId).eq("session_id", sessionId).eq("emoji", emoji);
    } else {
      setMyReactions((prev) => new Set(prev).add(key));
      const newReaction = { id: crypto.randomUUID(), post_id: postId, session_id: sessionId, emoji };
      setReactions((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newReaction],
      }));
      await supabase.from("community_reactions").insert({ post_id: postId, session_id: sessionId, emoji });
    }
  };

  const toggleComments = async (postId: string) => {
    const isExpanded = expandedComments.has(postId);
    if (isExpanded) {
      setExpandedComments((prev) => { const n = new Set(prev); n.delete(postId); return n; });
    } else {
      setExpandedComments((prev) => new Set(prev).add(postId));
      if (!comments[postId]) {
        const { data } = await supabase
          .from("community_comments")
          .select("*")
          .eq("post_id", postId)
          .order("created_at", { ascending: true });
        if (data) setComments((prev) => ({ ...prev, [postId]: data as Comment[] }));
      }
    }
  };

  const addComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    const commentName = currentUser ? currentUser.displayName : sessionId;
    const post = allPosts.find(p => p.id === postId);
    const insertData: any = {
      post_id: postId,
      content: text.slice(0, 5000),
      anonymous_name: commentName,
    };
    if (currentUser) {
      insertData.author_id = currentUser.id;
    }
    const { error } = await supabase.from("community_comments").insert(insertData);
    if (!error) {
      await supabase.rpc("increment_comments", { post_id_input: postId });
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      setAllPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
      if (currentUser && post?.author_id && post.author_id !== currentUser.id) {
        createNotification(post.author_id, currentUser.id, "comment", "commented on your post", postId);
      }
    }
  };

  const addReply = async (postId: string, content: string, parentCommentId: string, parentAuthorId?: string | null) => {
    if (!content.trim()) return;
    const commentName = currentUser ? currentUser.displayName : sessionId;
    const insertData: any = {
      post_id: postId,
      content: content.slice(0, 5000),
      anonymous_name: commentName,
      parent_comment_id: parentCommentId,
    };
    if (currentUser) {
      insertData.author_id = currentUser.id;
    }
    const { error } = await supabase.from("community_comments").insert(insertData);
    if (!error) {
      await supabase.rpc("increment_comments", { post_id_input: postId });
      setAllPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
      // Re-fetch comments for this post to get the new reply
      const { data } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (data) setComments((prev) => ({ ...prev, [postId]: data as Comment[] }));
      // Notify parent comment author
      if (currentUser && parentAuthorId && parentAuthorId !== currentUser.id) {
        createNotification(parentAuthorId, currentUser.id, "reply", "replied to your comment", postId);
      }
    }

  const handleCommentDelete = (postId: string, commentId: string) => {
    setComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).filter(c => c.id !== commentId),
    }));
    setAllPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p));
  };

  const handleCommentUpdate = (postId: string, commentId: string, newContent: string) => {
    setComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).map(c => c.id === commentId ? { ...c, content: newContent } : c),
    }));
  };

  const reportPost = async (postId: string) => {
    await supabase.from("reported_content").insert({
      content_id: postId,
      content_type: "post",
      reporter_session_id: sessionId,
      reason: "Reported by user",
    });
    toast({ title: "Post reported", description: "Thank you for keeping the community safe." });
    setReportMenuPost(null);
  };

  const sharePost = async (post: Post) => {
    const text = `"${post.content}" — ${post.anonymous_name} on The Uprising`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard!" });
    }
  };

  const getReactionCounts = (postId: string) => {
    const postReactions = reactions[postId] || [];
    const counts: Record<string, number> = {};
    for (const r of postReactions) {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    }
    return counts;
  };

  return (
    <div className="min-h-screen py-12 pb-24">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center mb-5">
            <img src={uprisingLogo} alt="The Uprising" className="w-16 h-16 rounded-2xl object-cover shadow-xl" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            The Uprising Community
          </motion.h1>
          <p className="text-muted-foreground text-sm">Share, support, and uplift each other.</p>
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-muted-foreground text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            Positive energy only · Anonymous
          </div>
        </div>

        {!communityOpen && (
          <div className="p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 backdrop-blur-xl mb-6 text-center">
            <p className="text-yellow-300 text-sm font-medium">🔒 Community posting is currently closed by the admin.</p>
          </div>
        )}

        {/* Composer */}
        <div className={`p-5 rounded-2xl backdrop-blur-xl border border-white/15 shadow-lg mb-6 ${!communityOpen ? "opacity-50 pointer-events-none" : ""}`} style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}>
          <div className="flex gap-3">
            <UserAvatar displayName={postAnonymously ? sessionId : currentUser?.displayName} size="sm" />
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={newPost}
                onChange={handlePostChange}
                placeholder={communityOpen ? "What's on your mind?" : "Community posting is currently closed."}
                rows={2}
                disabled={!communityOpen}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none overflow-hidden disabled:cursor-not-allowed"
                style={{ minHeight: "60px" }}
              />
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2">
                  <EmojiPicker onSelect={(emoji) => { setNewPost((prev) => prev + emoji); textareaRef.current?.focus(); }} />
                  {currentUser && (
                    <button
                      onClick={() => setPostAnonymously(!postAnonymously)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        postAnonymously
                          ? "bg-white/5 border-white/15 text-muted-foreground"
                          : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      {postAnonymously ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {postAnonymously ? "Anonymous" : currentUser.displayName}
                    </button>
                  )}
                </div>
                <button
                  onClick={addPost}
                  disabled={!newPost.trim() || posting || !communityOpen}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-semibold disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
                >
                  {posting ? "Posting..." : "Share"} <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feed Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-2xl backdrop-blur-xl border border-white/10" style={{ background: "rgba(255,255,255,0.04)" }}>
          {FEED_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-2xl border border-white/10 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : displayPosts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {activeTab === "following" ? (
              <>
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg mb-1">No posts from people you follow</p>
                <p className="text-sm">Follow users to see their posts here</p>
              </>
            ) : activeTab === "trending" ? (
              <>
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg mb-1">Nothing trending yet</p>
                <p className="text-sm">Posts with fast-growing engagement will appear here</p>
              </>
            ) : (
              <>
                <p className="text-lg mb-1">No posts yet</p>
                <p className="text-sm">Be the first to share something 💚</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isLiked={likedPosts.has(post.id)}
                  isExpanded={expandedComments.has(post.id)}
                  postComments={comments[post.id] || []}
                  reactionCounts={getReactionCounts(post.id)}
                  myReactions={myReactions}
                  commentInput={commentInputs[post.id] || ""}
                  currentUserId={currentUser?.id}
                  currentUserName={currentUser?.displayName}
                  communityOpen={communityOpen}
                  reportMenuPost={reportMenuPost}
                  onToggleLike={toggleLike}
                  onToggleReaction={toggleReaction}
                  onToggleComments={toggleComments}
                  onShare={sharePost}
                  onReport={reportPost}
                  onSetReportMenu={setReportMenuPost}
                  onCommentInputChange={(pid, val) => setCommentInputs(prev => ({ ...prev, [pid]: val }))}
                  onAddComment={addComment}
                  onAddReply={addReply}
                  onCommentDelete={handleCommentDelete}
                  onCommentUpdate={handleCommentUpdate}
                  onNavigate={navigate}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;
