import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, Send, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import uprisingLogo from "@/assets/uprising-logo.jpeg";
import { formatDistanceToNow } from "date-fns";

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

  const sessionId = getSessionId();

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setPosts(data);
    setLoading(false);
  }, []);

  const fetchLikedPosts = useCallback(async () => {
    const { data } = await supabase
      .from("community_likes")
      .select("post_id")
      .eq("session_id", sessionId);
    if (data) setLikedPosts(new Set(data.map((l) => l.post_id)));
  }, [sessionId]);

  useEffect(() => {
    fetchPosts();
    fetchLikedPosts();

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

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [fetchPosts, fetchLikedPosts]);

  const addPost = async () => {
    if (!newPost.trim() || posting) return;
    setPosting(true);
    const { error } = await supabase.from("community_posts").insert({
      content: newPost.trim().slice(0, 500),
      anonymous_name: sessionId,
    });
    if (error) {
      toast({ title: "Error", description: "Could not post. Try again.", variant: "destructive" });
    } else {
      setNewPost("");
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
      content: text.slice(0, 300),
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

        {/* Composer */}
        <div className="p-5 rounded-2xl backdrop-blur-xl border border-white/15 shadow-lg mb-6" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
              {sessionId.slice(0, 2)}
            </div>
            <div className="flex-1">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value.slice(0, 500))}
                placeholder="What's on your mind?"
                rows={3}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">{newPost.length}/500</span>
                <button
                  onClick={addPost}
                  disabled={!newPost.trim() || posting}
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
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
                        {post.anonymous_name.slice(0, 2)}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-foreground">{post.anonymous_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">· {formatTime(post.created_at)}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-foreground/90 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

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
                                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-muted-foreground text-[10px] font-bold shrink-0">
                                  {c.anonymous_name.slice(0, 2)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">{c.anonymous_name}</span>
                                    <span className="text-[10px] text-muted-foreground">{formatTime(c.created_at)}</span>
                                  </div>
                                  <p className="text-xs text-foreground/80 mt-0.5">{c.content}</p>
                                </div>
                              </div>
                            ))}
                            {postComments.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <input
                                value={commentInputs[post.id] || ""}
                                onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value.slice(0, 300) }))}
                                onKeyDown={(e) => e.key === "Enter" && addComment(post.id)}
                                placeholder="Write a comment..."
                                className="flex-1 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                              />
                              <button
                                onClick={() => addComment(post.id)}
                                disabled={!commentInputs[post.id]?.trim()}
                                className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
