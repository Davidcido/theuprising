import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, Send, Shield, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import { toast } from "@/hooks/use-toast";
import uprisingLogo from "@/assets/uprising-logo.jpeg";
import { formatDistanceToNow } from "date-fns";
import EmojiPicker from "@/components/EmojiPicker";
import { useNavigate } from "react-router-dom";

const REACTION_EMOJIS = [
  { emoji: "❤️", label: "Love" },
  { emoji: "🙏", label: "Support" },
  { emoji: "💪", label: "Strength" },
  { emoji: "😊", label: "Encouragement" },
  { emoji: "🔥", label: "Inspiration" },
];

type Comment = {
  id: string;
  post_id: string;
  content: string;
  anonymous_name: string;
  created_at: string;
};

type Post = {
  id: string;
  content: string;
  anonymous_name: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  author_id?: string | null;
  is_anonymous?: boolean;
  author_profile?: { display_name: string | null; avatar_url: string } | null;
};

type Reaction = {
  id: string;
  post_id: string;
  session_id: string;
  emoji: string;
};

const getSessionId = () => {
  let id = localStorage.getItem("uprising_session_id");
  if (!id) {
    id = "User" + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem("uprising_session_id", id);
  }
  return id;
};

const Community = () => {
  const [posts, setPosts] = useState<Post[]>([]);
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const sessionId = getSessionId();

  // Get current user
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
      }
    });
  }, []);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      // Enrich with author profiles
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
      setPosts(data.map((p: any) => ({
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

    // Fetch community status
    supabase.from("community_settings").select("value").eq("key", "community_status").single()
      .then(({ data }) => { if (data) setCommunityOpen(data.value === "open"); });

    const postsChannel = supabase
      .channel("community-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => {
        fetchPosts();
      })
      .subscribe();

    const commentsChannel = supabase
      .channel("community-comments")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_comments" }, (payload) => {
        const newComment = payload.new as Comment;
        setComments((prev) => ({
          ...prev,
          [newComment.post_id]: [...(prev[newComment.post_id] || []), newComment],
        }));
      })
      .subscribe();

    const reactionsChannel = supabase
      .channel("community-reactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_reactions" }, () => {
        fetchReactions();
      })
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

  // Auto-expand textarea
  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 10000) setNewPost(val);
    // Auto resize
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
    if (isLiked) {
      setLikedPosts((prev) => { const n = new Set(prev); n.delete(postId); return n; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p));
      await supabase.from("community_likes").delete().eq("post_id", postId).eq("session_id", sessionId);
      await supabase.rpc("decrement_likes", { post_id_input: postId });
    } else {
      setLikedPosts((prev) => new Set(prev).add(postId));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p));
      await supabase.from("community_likes").insert({ post_id: postId, session_id: sessionId });
      await supabase.rpc("increment_likes", { post_id_input: postId });
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
        if (data) setComments((prev) => ({ ...prev, [postId]: data }));
      }
    }
  };

  const addComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    const { error } = await supabase.from("community_comments").insert({
      post_id: postId,
      content: text.slice(0, 5000),
      anonymous_name: sessionId,
    });
    if (!error) {
      await supabase.rpc("increment_comments", { post_id_input: postId });
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
    }
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

  const formatTime = (ts: string) => {
    try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ts; }
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

        {/* Community Closed Banner */}
        {!communityOpen && (
          <div className="p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 backdrop-blur-xl mb-6 text-center">
            <p className="text-yellow-300 text-sm font-medium">🔒 Community posting is currently closed by the admin.</p>
          </div>
        )}

        {/* Composer */}
        <div className={`p-5 rounded-2xl backdrop-blur-xl border border-white/15 shadow-lg mb-6 ${!communityOpen ? "opacity-50 pointer-events-none" : ""}`} style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}>
          <div className="flex gap-3">
            <UserAvatar
              displayName={postAnonymously ? sessionId : currentUser?.displayName}
              size="sm"
            />
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
                  <EmojiPicker onSelect={(emoji) => {
                    setNewPost((prev) => prev + emoji);
                    textareaRef.current?.focus();
                  }} />
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
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-1">No posts yet</p>
            <p className="text-sm">Be the first to share something 💚</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {posts.map((post) => {
                const isLiked = likedPosts.has(post.id);
                const isExpanded = expandedComments.has(post.id);
                const postComments = comments[post.id] || [];
                const reactionCounts = getReactionCounts(post.id);
                return (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-5 rounded-2xl backdrop-blur-xl border border-white/10 transition-colors hover:border-white/20"
                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
                  >
                    {/* Post header */}
                    <div className="flex items-center gap-3 mb-3">
                      <UserAvatar
                        avatarUrl={post.author_profile?.avatar_url}
                        displayName={!post.is_anonymous && post.author_profile?.display_name ? post.author_profile.display_name : post.anonymous_name}
                        size="sm"
                        onClick={!post.is_anonymous && post.author_id ? () => navigate(`/profile/${post.author_id}`) : undefined}
                      />
                      <div>
                        <span
                          className={`text-sm font-semibold text-foreground ${!post.is_anonymous && post.author_id ? "cursor-pointer hover:underline" : ""}`}
                          onClick={() => { if (!post.is_anonymous && post.author_id) navigate(`/profile/${post.author_id}`); }}
                        >
                          {!post.is_anonymous && post.author_profile?.display_name
                            ? post.author_profile.display_name
                            : post.anonymous_name}
                        </span>
                        {post.is_anonymous && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground/60 bg-white/5 px-1.5 py-0.5 rounded-full">anon</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-2">· {formatTime(post.created_at)}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-foreground/90 text-sm leading-relaxed mb-3 whitespace-pre-wrap break-words">{post.content}</p>

                    {/* Emoji Reactions */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {REACTION_EMOJIS.map(({ emoji, label }) => {
                        const count = reactionCounts[emoji] || 0;
                        const isMine = myReactions.has(`${post.id}:${emoji}`);
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(post.id, emoji)}
                            title={label}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all hover:scale-105 border ${
                              isMine
                                ? "bg-emerald-500/20 border-emerald-500/40 text-foreground"
                                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                            }`}
                          >
                            <span className="text-sm">{emoji}</span>
                            {count > 0 && <span>{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-6 border-t border-white/5 pt-3">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`inline-flex items-center gap-1.5 text-sm transition-all hover:scale-105 ${isLiked ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
                      >
                        <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
                        <span>{post.likes_count}</span>
                      </button>
                      <button
                        onClick={() => toggleComments(post.id)}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-blue-400 transition-all hover:scale-105"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.comments_count}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => sharePost(post)}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-400 transition-all hover:scale-105"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Comments section */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
                            {postComments.map((c) => (
                              <div key={c.id} className="flex gap-2.5 pl-2">
                              <UserAvatar displayName={c.anonymous_name} size="xs" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">{c.anonymous_name}</span>
                                    <span className="text-[10px] text-muted-foreground">{formatTime(c.created_at)}</span>
                                  </div>
                                  <p className="text-xs text-foreground/80 mt-0.5 break-words">{c.content}</p>
                                </div>
                              </div>
                            ))}
                            {postComments.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                            )}
                            {communityOpen ? (
                              <div className="flex gap-2 mt-2 items-end">
                                <EmojiPicker
                                  onSelect={(emoji) =>
                                    setCommentInputs((prev) => ({ ...prev, [post.id]: (prev[post.id] || "") + emoji }))
                                  }
                                  className="p-1.5 shrink-0"
                                />
                                <textarea
                                  value={commentInputs[post.id] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length <= 5000) setCommentInputs((prev) => ({ ...prev, [post.id]: val }));
                                    e.target.style.height = "auto";
                                    e.target.style.height = e.target.scrollHeight + "px";
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      addComment(post.id);
                                    }
                                  }}
                                  placeholder="Write a comment..."
                                  rows={1}
                                  className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none overflow-hidden"
                                  style={{ minHeight: "32px" }}
                                />
                                <button
                                  onClick={() => addComment(post.id)}
                                  disabled={!commentInputs[post.id]?.trim()}
                                  className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 transition-colors shrink-0"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-yellow-300/70 text-center py-2">Commenting is currently disabled.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;
