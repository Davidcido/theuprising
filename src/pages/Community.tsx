import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Shield, Eye, EyeOff, Sparkles, Users, TrendingUp, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import { toast } from "@/hooks/use-toast";
import uprisingLogo from "@/assets/uprising-logo.jpeg";
import EmojiPicker from "@/components/EmojiPicker";
import { useNavigate } from "react-router-dom";
import { createNotification } from "@/lib/notifications";
import PostCard, { Post, Comment, Reaction } from "@/components/community/PostCard";
import PostSkeleton from "@/components/community/PostSkeleton";
import RepostDialog from "@/components/community/RepostDialog";
import MediaUploader from "@/components/community/MediaUploader";

type FeedTab = "foryou" | "following" | "trending";

const FEED_TABS: { key: FeedTab; label: string; icon: typeof Sparkles }[] = [
  { key: "foryou", label: "For You", icon: Sparkles },
  { key: "following", label: "Following", icon: Users },
  { key: "trending", label: "Trending", icon: TrendingUp },
];

const POSTS_PER_PAGE = 10;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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
  const [refreshing, setRefreshing] = useState(false);
  const [repostDialogPost, setRepostDialogPost] = useState<Post | null>(null);
  const [mediaFiles, setMediaFiles] = useState<{ url: string; type: "image" | "video" }[]>([]);
  const [commentReactions, setCommentReactions] = useState<Record<string, { emoji: string; session_id: string }[]>>({});
  const [myCommentReactions, setMyCommentReactions] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
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

  const enrichPosts = useCallback(async (data: any[]): Promise<Post[]> => {
    const authorIds = [...new Set(data.filter((p: any) => p.author_id).map((p: any) => p.author_id))];
    let profilesMap: Record<string, { display_name: string | null; avatar_url: string }> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", authorIds);
      if (profiles) {
        for (const p of profiles) {
          profilesMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url ?? "" };
        }
      }
    }
    const postsMap: Record<string, any> = {};
    const mappedPosts = data.map((p: any) => {
      const mapped = {
        ...p,
        author_profile: p.author_id ? profilesMap[p.author_id] || null : null,
        media_urls: p.media_urls || [],
      };
      postsMap[p.id] = mapped;
      return mapped;
    });
    for (const p of mappedPosts) {
      if (p.original_post_id && postsMap[p.original_post_id]) {
        p.original_post = postsMap[p.original_post_id];
      }
    }
    return mappedPosts;
  }, []);

  const fetchPosts = useCallback(async (loadMore = false) => {
    if (loadMore) setLoadingMore(true);
    const from = loadMore ? allPosts.length : 0;
    const to = from + POSTS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error && data) {
      const enriched = await enrichPosts(data);
      if (loadMore) {
        setAllPosts(prev => [...prev, ...enriched]);
      } else {
        const { data: reposts } = await supabase
          .from("community_reposts")
          .select("*")
          .is("quote_content", null)
          .order("created_at", { ascending: false })
          .limit(50);

        const directRepostPosts: Post[] = [];
        if (reposts && reposts.length > 0) {
          const postsMap: Record<string, any> = {};
          for (const p of enriched) postsMap[p.id] = p;
          const reposterIds = [...new Set(reposts.map(r => r.user_id))];
          let reposterProfiles: Record<string, string> = {};
          if (reposterIds.length > 0) {
            const { data: rProfiles } = await supabase
              .from("profiles")
              .select("user_id, display_name")
              .in("user_id", reposterIds);
            if (rProfiles) {
              for (const rp of rProfiles) reposterProfiles[rp.user_id] = rp.display_name || "Someone";
            }
          }
          for (const r of reposts) {
            const original = postsMap[r.original_post_id];
            if (original) {
              directRepostPosts.push({
                ...original,
                id: `repost-${r.id}`,
                created_at: r.created_at,
                reposted_by_name: reposterProfiles[r.user_id] || "Someone",
              });
            }
          }
        }
        setAllPosts([...enriched, ...directRepostPosts]);
      }
      setHasMore(data.length === POSTS_PER_PAGE);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [enrichPosts, allPosts.length]);

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

  const fetchCommentReactions = useCallback(async () => {
    const { data } = await supabase.from("comment_reactions").select("*");
    if (data) {
      const grouped: Record<string, { emoji: string; session_id: string }[]> = {};
      const mine = new Set<string>();
      for (const r of data) {
        if (!grouped[r.comment_id]) grouped[r.comment_id] = [];
        grouped[r.comment_id].push({ emoji: r.emoji, session_id: r.session_id });
        if (r.session_id === sessionId) mine.add(`${r.comment_id}:${r.emoji}`);
      }
      setCommentReactions(grouped);
      setMyCommentReactions(mine);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchPosts(false);
    fetchLikedPosts();
    fetchReactions();
    fetchCommentReactions();

    supabase.from("community_settings").select("value").eq("key", "community_status").single()
      .then(({ data }) => { if (data) setCommunityOpen(data.value === "open"); });

    const postsChannel = supabase
      .channel("community-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, async (payload) => {
        const newPost = payload.new as any;
        const enriched = await enrichPosts([newPost]);
        if (enriched.length > 0) {
          setAllPosts(prev => [enriched[0], ...prev]);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_posts" }, (payload) => {
        const updated = payload.new as any;
        setAllPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_posts" }, (payload) => {
        const deleted = payload.old as { id: string };
        setAllPosts(prev => prev.filter(p => p.id !== deleted.id));
      })
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

    const commentReactionsChannel = supabase
      .channel("comment-reactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "comment_reactions" }, () => fetchCommentReactions())
      .subscribe();

    const settingsChannel = supabase
      .channel("community-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_settings" }, (payload) => {
        const row = payload.new as { key: string; value: string };
        if (row.key === "community_status") setCommunityOpen(row.value === "open");
      })
      .subscribe();

    const followsChannel = supabase
      .channel("community-follows")
      .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: follows } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", session.user.id);
          if (follows) setFollowingIds(new Set(follows.map(f => f.following_id)));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(commentReactionsChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(followsChannel);
    };
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && activeTab === "foryou") {
          fetchPosts(true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, fetchPosts, activeTab]);

  useEffect(() => {
    if (activeTab !== "foryou") return;
  }, [activeTab]);

  const displayPosts = useMemo(() => {
    let sorted: Post[];
    switch (activeTab) {
      case "foryou":
        sorted = [...allPosts].sort((a, b) => {
          const scoreA = (a.engagement_score || 0) + (a.author_id && followingIds.has(a.author_id) ? 20 : 0);
          const scoreB = (b.engagement_score || 0) + (b.author_id && followingIds.has(b.author_id) ? 20 : 0);
          return scoreB - scoreA;
        });
        break;
      case "following":
        sorted = allPosts.filter(p => p.author_id && followingIds.has(p.author_id));
        break;
      case "trending": {
        const now = Date.now();
        const cutoff = now - 48 * 60 * 60 * 1000;
        sorted = [...allPosts]
          .filter(p => new Date(p.created_at).getTime() > cutoff)
          .sort((a, b) => {
            const hoursA = Math.max(1, (now - new Date(a.created_at).getTime()) / 3600000);
            const hoursB = Math.max(1, (now - new Date(b.created_at).getTime()) / 3600000);
            const velocityA = ((a.likes_count * 3) + (a.comments_count * 4) + (a.shares_count * 5)) / hoursA;
            const velocityB = ((b.likes_count * 3) + (b.comments_count * 4) + (b.shares_count * 5)) / hoursB;
            return velocityB - velocityA;
          });
        break;
      }
      default:
        sorted = allPosts;
    }
    return sorted;
  }, [allPosts, activeTab, followingIds]);

  const visiblePosts = displayPosts;

  const viewedPostsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const newPostIds = visiblePosts
      .map(p => p.id)
      .filter(id => !id.startsWith("repost-") && !viewedPostsRef.current.has(id));
    if (newPostIds.length === 0) return;
    newPostIds.forEach(id => viewedPostsRef.current.add(id));
    newPostIds.forEach(id => {
      supabase.rpc("increment_views", { post_id_input: id });
    });
  }, [visiblePosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setHasMore(true);
    await fetchPosts(false);
    setRefreshing(false);
  };

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 10000) setNewPost(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  };

  const addPost = async () => {
    if ((!newPost.trim() && mediaFiles.length === 0) || posting) return;
    setPosting(true);
    const insertData: any = {
      content: newPost.trim().slice(0, 10000) || (mediaFiles.length > 0 ? "" : ""),
      anonymous_name: postAnonymously ? sessionId : (currentUser?.displayName || sessionId),
      is_anonymous: postAnonymously,
      media_urls: mediaFiles.map(m => m.url),
    };
    if (!postAnonymously && currentUser) {
      insertData.author_id = currentUser.id;
    }
    const { error } = await supabase.from("community_posts").insert(insertData);
    if (error) {
      toast({ title: "Error", description: "Could not post. Try again.", variant: "destructive" });
    } else {
      setNewPost("");
      setMediaFiles([]);
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

  const toggleCommentReaction = async (commentId: string, emoji: string) => {
    const key = `${commentId}:${emoji}`;
    const hasReacted = myCommentReactions.has(key);
    if (hasReacted) {
      setMyCommentReactions((prev) => { const n = new Set(prev); n.delete(key); return n; });
      setCommentReactions((prev) => ({
        ...prev,
        [commentId]: (prev[commentId] || []).filter((r) => !(r.session_id === sessionId && r.emoji === emoji)),
      }));
      await supabase.from("comment_reactions").delete().eq("comment_id", commentId).eq("session_id", sessionId).eq("emoji", emoji);
    } else {
      setMyCommentReactions((prev) => new Set(prev).add(key));
      setCommentReactions((prev) => ({
        ...prev,
        [commentId]: [...(prev[commentId] || []), { emoji, session_id: sessionId }],
      }));
      await supabase.from("comment_reactions").insert({ comment_id: commentId, session_id: sessionId, emoji });
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
      const { data } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (data) setComments((prev) => ({ ...prev, [postId]: data as Comment[] }));
      if (currentUser && parentAuthorId && parentAuthorId !== currentUser.id) {
        createNotification(parentAuthorId, currentUser.id, "reply", "replied to your comment", postId);
      }
    }
  };

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

  const handleRepost = async (post: Post, quoteContent?: string) => {
    if (!currentUser) {
      toast({ title: "Sign in required", description: "Please sign in to repost.", variant: "destructive" });
      return;
    }
    if (quoteContent) {
      const { error } = await supabase.from("community_posts").insert({
        content: quoteContent,
        anonymous_name: currentUser.displayName,
        is_anonymous: false,
        author_id: currentUser.id,
        original_post_id: post.id,
      });
      if (error) {
        toast({ title: "Error", description: "Could not repost. Try again.", variant: "destructive" });
        return;
      }
      await supabase.from("community_reposts").insert({
        user_id: currentUser.id,
        original_post_id: post.id,
        quote_content: quoteContent,
      });
    } else {
      const { error } = await supabase.from("community_reposts").insert({
        user_id: currentUser.id,
        original_post_id: post.id,
      });
      if (error) {
        toast({ title: "Error", description: "Could not repost. Try again.", variant: "destructive" });
        return;
      }
    }

    await supabase.from("community_posts").update({ shares_count: post.shares_count + 1 }).eq("id", post.id);
    setAllPosts(prev => prev.map(p => p.id === post.id ? { ...p, shares_count: p.shares_count + 1 } : p));
    toast({ title: quoteContent ? "Quote reposted!" : "Reposted!" });
    if (post.author_id && post.author_id !== currentUser.id) {
      createNotification(post.author_id, currentUser.id, "repost", "reposted your post", post.id);
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

  const getCommentReactionCounts = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    for (const [commentId, rxns] of Object.entries(commentReactions)) {
      result[commentId] = {};
      for (const r of rxns) {
        result[commentId][r.emoji] = (result[commentId][r.emoji] || 0) + 1;
      }
    }
    return result;
  }, [commentReactions]);

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

              {/* Media uploader */}
              <MediaUploader
                mediaFiles={mediaFiles}
                onMediaChange={setMediaFiles}
                disabled={!communityOpen}
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
                  disabled={(!newPost.trim() && mediaFiles.length === 0) || posting || !communityOpen}
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

        {/* Pull to refresh button */}
        <div className="flex justify-center mb-3">
          <motion.button
            onClick={handleRefresh}
            disabled={refreshing}
            whileTap={{ scale: 0.9, rotate: 180 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh feed"}
          </motion.button>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <PostSkeleton key={i} />)}
          </div>
        ) : visiblePosts.length === 0 ? (
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
              {visiblePosts.map((post) => (
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
                  commentReactionCounts={getCommentReactionCounts}
                  myCommentReactions={myCommentReactions}
                  onToggleLike={toggleLike}
                  onToggleReaction={toggleReaction}
                  onToggleComments={toggleComments}
                  onShare={sharePost}
                  onRepost={(p) => setRepostDialogPost(p)}
                  onReport={reportPost}
                  onSetReportMenu={setReportMenuPost}
                  onCommentInputChange={(pid, val) => setCommentInputs(prev => ({ ...prev, [pid]: val }))}
                  onAddComment={addComment}
                  onAddReply={addReply}
                  onCommentDelete={handleCommentDelete}
                  onCommentUpdate={handleCommentUpdate}
                  onNavigate={navigate}
                  onToggleCommentReaction={toggleCommentReaction}
                />
              ))}
            </AnimatePresence>

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="py-4">
                {loadingMore && <PostSkeleton />}
              </div>
            )}

            {!hasMore && displayPosts.length > 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">You've reached the end 🎉</p>
            )}
          </div>
        )}
      </div>

      {/* Repost Dialog */}
      <RepostDialog
        post={repostDialogPost!}
        open={!!repostDialogPost}
        onClose={() => setRepostDialogPost(null)}
        onRepost={(quote) => {
          if (repostDialogPost) handleRepost(repostDialogPost, quote);
        }}
        userName={currentUser?.displayName || sessionId}
      />
    </div>
  );
};

export default Community;
