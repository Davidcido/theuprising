import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Shield, Eye, EyeOff, Sparkles, Users, TrendingUp, RefreshCw, Bookmark, FileText, AlertCircle, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import { toast } from "@/hooks/use-toast";
import uprisingLogo from "@/assets/uprising-logo.jpeg";
import EmojiPicker from "@/components/EmojiPicker";
import { useNavigate } from "react-router-dom";
import { createNotification } from "@/lib/notifications";
import PostCard, { Post, Comment, Reaction, PendingMedia } from "@/components/community/PostCard";
import { compressVideoFile, shouldCompress } from "@/lib/videoCompression";
import { uploadFileWithProgress, UploadController } from "@/lib/chunkedUpload";
import PostSkeleton from "@/components/community/PostSkeleton";
import RepostDialog from "@/components/community/RepostDialog";
import MediaUploader from "@/components/community/MediaUploader";
import SuggestedUsers from "@/components/community/SuggestedUsers";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useDrafts } from "@/hooks/useDrafts";
import WelcomePrompt from "@/components/community/WelcomePrompt";
import ActivityBanner from "@/components/community/ActivityBanner";
import AuthModal from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import CompanionStoryBar from "@/components/community/CompanionStoryBar";

import { usePostViewTracker } from "@/hooks/usePostViewTracker";
import PostViewObserver from "@/components/community/PostViewObserver";
import FirstPostCelebration from "@/components/community/FirstPostCelebration";
import { extractMentions } from "@/components/community/HashtagText";
import MentionDropdown from "@/components/community/MentionDropdown";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useFeedCache } from "@/hooks/useFeedCache";
import { useVirtualFeed } from "@/hooks/useVirtualFeed";
import PullToRefresh from "@/components/community/PullToRefresh";

type FeedTab = "foryou" | "following" | "trending";

const FEED_TABS: { key: FeedTab; label: string; icon: typeof Sparkles }[] = [
  { key: "foryou", label: "For You", icon: Sparkles },
  { key: "following", label: "Following", icon: Users },
  { key: "trending", label: "Trending", icon: TrendingUp },
];

const POSTS_PER_PAGE = 10;
const SCROLL_DEBOUNCE_MS = 300;

type PaginationCursor = {
  createdAt: string;
  id: string;
};

const getSessionId = () => {
  let id = localStorage.getItem("uprising_session_id");
  if (!id) {
    id = "User" + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem("uprising_session_id", id);
  }
  return id;
};

let communityControllerMounts = 0;

const Community = () => {
  const feedCache = useFeedCache<Post>();
  const initialCached = useRef(feedCache.getCached());
  const [allPosts, setAllPosts] = useState<Post[]>(initialCached.current || []);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(!initialCached.current);
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
  const { user: authUser, isReady: authReady } = useAuthReady();
  const [currentUser, setCurrentUser] = useState<{ id: string; displayName: string } | null>(null);
  const [reportMenuPost, setReportMenuPost] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>("foryou");
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [repostDialogPost, setRepostDialogPost] = useState<Post | null>(null);
  const [mediaFiles, setMediaFiles] = useState<{ url: string; type: "image" | "video"; file?: File }[]>([]);
  const bgUploadControllersRef = useRef<Map<string, UploadController>>(new Map());
  const [commentReactions, setCommentReactions] = useState<Record<string, { emoji: string; session_id: string }[]>>({});
  const [myCommentReactions, setMyCommentReactions] = useState<Set<string>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [showFirstPostCelebration, setShowFirstPostCelebration] = useState(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // Cursor for pagination — stores created_at + id of the last loaded post
  const cursorRef = useRef<PaginationCursor | null>(null);
  const fetchingRef = useRef(false);
  const [isFetchingPosts, setIsFetchingPosts] = useState(false);
  const isFetchingPostsRef = useRef(false);
  const allPostsRef = useRef<Post[]>(initialCached.current || []);
  const commentsRef = useRef<Record<string, Comment[]>>({});
  const activeTabRef = useRef<FeedTab>("foryou");
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const subscriptionsReadyRef = useRef(false);
  const sentinelObserverRef = useRef<IntersectionObserver | null>(null);
  const lastCursorLogRef = useRef<string | null>(null);

  const { isBookmarked, toggleBookmark } = useBookmarks(currentUser?.id);
  const { saveDraft } = useDrafts(currentUser?.id);

  const sessionId = getSessionId();
  const { trackView } = usePostViewTracker();

  useEffect(() => {
    if (!authUser) {
      setCurrentUser(null);
      return;
    }
    // Fetch profile and follows in parallel
    Promise.all([
      supabase.from("profiles").select("display_name").eq("user_id", authUser.id).single(),
      supabase.from("follows").select("following_id").eq("follower_id", authUser.id),
    ]).then(([profileRes, followsRes]) => {
      setCurrentUser({
        id: authUser.id,
        displayName: profileRes.data?.display_name || authUser.email?.split("@")[0] || "User",
      });
      if (followsRes.data) {
        setFollowingIds(new Set(followsRes.data.map(f => f.following_id)));
      }
    });
  }, [authUser]);

  useEffect(() => {
    allPostsRef.current = allPosts;
  }, [allPosts]);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    isFetchingPostsRef.current = isFetchingPosts;
  }, [isFetchingPosts]);

  useEffect(() => {
    communityControllerMounts += 1;
    console.log("[Community][controller] mounted", { mounts: communityControllerMounts });
    return () => {
      communityControllerMounts = Math.max(0, communityControllerMounts - 1);
      console.log("[Community][controller] unmounted", { mounts: communityControllerMounts });
    };
  }, []);

  const dedupeCommentsById = useCallback((items: Comment[]) => {
    return Array.from(new Map(items.map((item) => [item.id, item])).values());
  }, []);

  const enrichPosts = useCallback(async (data: any[]): Promise<Post[]> => {
    const authorIds = [...new Set(data.filter((p: any) => p.author_id).map((p: any) => p.author_id))];
    let profilesMap: Record<string, { display_name: string | null; avatar_url: string; created_at?: string }> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, created_at")
        .in("user_id", authorIds);
      if (profiles) {
        for (const p of profiles) {
          profilesMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url ?? "", created_at: p.created_at };
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

  const fetchPosts = useCallback(async (loadMore = false, retryCount = 0) => {
    if (fetchingRef.current) {
      console.log("[Community][feed] fetch skipped (lock active)", { loadMore });
      return;
    }

    fetchingRef.current = true;
    loadingMoreRef.current = loadMore;
    setIsFetchingPosts(true);
    if (loadMore) setLoadingMore(true);
    setFetchError(null);

    console.log("[Community][feed] fetch start", {
      mode: loadMore ? "scroll" : "initial",
      cursor: cursorRef.current,
    });

    try {
      let query = supabase
        .from("community_posts")
        .select("id, content, anonymous_name, author_id, is_anonymous, likes_count, comments_count, shares_count, views_count, created_at, media_urls, original_post_id, reposted_by_name, engagement_score")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(POSTS_PER_PAGE);

      if (loadMore && cursorRef.current) {
        const { createdAt, id } = cursorRef.current;
        query = query.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data || [];
      console.log("[Community][feed] fetch end", {
        mode: loadMore ? "scroll" : "initial",
        count: rows.length,
      });

      if (rows.length === 0) {
        setHasMore(false);
        hasMoreRef.current = false;
        return;
      }

      // Only mark as having more if we got a full page
      const moreAvailable = rows.length >= POSTS_PER_PAGE;
      setHasMore(moreAvailable);
      hasMoreRef.current = moreAvailable;

      const last = rows[rows.length - 1] as { created_at: string; id: string };
      const nextCursor: PaginationCursor = {
        createdAt: new Date(last.created_at).toISOString(),
        id: String(last.id),
      };
      cursorRef.current = nextCursor;
      console.log("[Community][feed] cursor updated", nextCursor);

      const enriched = await enrichPosts(rows);

      if (loadMore) {
        setAllPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = enriched.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
        return;
      }

      let directRepostPosts: Post[] = [];
      try {
        const { data: reposts } = await supabase
          .from("community_reposts")
          .select("*")
          .is("quote_content", null)
          .order("created_at", { ascending: false })
          .limit(50);

        if (reposts && reposts.length > 0) {
          const postsMap: Record<string, any> = {};
          for (const p of enriched) postsMap[p.id] = p;
          const reposterIds = [...new Set(reposts.map((r) => r.user_id))];
          const reposterProfiles: Record<string, string> = {};
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
                original_post: original,
                source_post_id: original.id,
              } as Post);
            }
          }
        }
      } catch {
        // Reposts failed — still show main posts
      }

      const merged = [...enriched, ...directRepostPosts];
      setAllPosts((prev) => {
        const pendingPosts = prev.filter((p) => p._pendingMedia && p._pendingMedia.length > 0);
        const mergedIds = new Set(merged.map((p) => p.id));
        const result = merged.map((p) => {
          const pending = pendingPosts.find((pp) => pp.id === p.id);
          if (pending) {
            return { ...p, _pendingMedia: pending._pendingMedia, _onCancelUpload: pending._onCancelUpload, _onRetryUpload: pending._onRetryUpload };
          }
          return p;
        });
        for (const pp of pendingPosts) {
          if (!mergedIds.has(pp.id)) result.unshift(pp);
        }
        return result;
      });

      feedCache.updateCache(enriched);
    } catch (err: any) {
      console.error("[Community][feed] fetch failed", err?.message || err);
      if (retryCount < 1) {
        fetchingRef.current = false;
        loadingMoreRef.current = false;
        setIsFetchingPosts(false);
        return fetchPosts(loadMore, retryCount + 1);
      }
      if (!loadMore && allPostsRef.current.length === 0) {
        const cached = feedCache.getCached();
        if (cached && cached.length > 0) {
          setAllPosts(cached);
        } else {
          setFetchError("Could not load posts. Tap to retry.");
        }
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
      loadingMoreRef.current = false;
      setIsFetchingPosts(false);
      console.log("[Community][feed] fetch lock released", {
        mode: loadMore ? "scroll" : "initial",
      });
    }
  }, [enrichPosts, feedCache]);

  const fetchLikedPosts = useCallback(async () => {
    const { data } = await supabase
      .from("community_likes")
      .select("post_id")
      .eq("session_id", sessionId);
    if (data) setLikedPosts(new Set(data.map((l) => l.post_id)));
  }, [sessionId]);

  const fetchReactions = useCallback(async () => {
    // Only fetch reactions for currently loaded posts to reduce payload
    const postIds = allPosts.map(p => p.id).filter(id => !id.startsWith("repost-") && !id.startsWith("optimistic-"));
    if (postIds.length === 0) return;
    const { data } = await supabase.from("community_reactions").select("*").in("post_id", postIds);
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
  }, [sessionId, allPosts]);

  const fetchCommentReactions = useCallback(async () => {
    // Defer comment reactions loading - only fetch when comments are expanded
    const expandedPostIds = [...expandedComments];
    if (expandedPostIds.length === 0) return;
    const commentIds = expandedPostIds.flatMap(pid => (comments[pid] || []).map(c => c.id));
    if (commentIds.length === 0) return;
    const { data } = await supabase.from("comment_reactions").select("*").in("comment_id", commentIds);
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
  }, [sessionId, expandedComments, comments]);

  // Load reactions when posts change
  useEffect(() => {
    if (allPosts.length > 0) fetchReactions();
  }, [allPosts.length]);

  const resolveCommentTargetPostId = useCallback((uiPostId: string) => {
    const post = allPostsRef.current.find((p) => p.id === uiPostId);
    if (!post) return uiPostId;
    if (!uiPostId.startsWith("repost-")) return uiPostId;
    return ((post as Post & { source_post_id?: string }).source_post_id || post.original_post?.id || post.original_post_id || uiPostId);
  }, []);

  const getUiPostIdsForTargetPost = useCallback((targetPostId: string) => {
    const uiIds = new Set<string>();
    for (const post of allPostsRef.current) {
      const resolvedTarget = post.id.startsWith("repost-")
        ? ((post as Post & { source_post_id?: string }).source_post_id || post.original_post?.id || post.original_post_id || post.id)
        : post.id;
      if (resolvedTarget === targetPostId) {
        uiIds.add(post.id);
      }
    }
    if (uiIds.size === 0) uiIds.add(targetPostId);
    return Array.from(uiIds);
  }, []);

  // Lazy comment loading: fetch comments only when a thread is expanded.
  const fetchCommentsForPost = useCallback(async (uiPostId: string, targetPostId?: string) => {
    const queryPostId = targetPostId || uiPostId;
    if (!uiPostId || !queryPostId || uiPostId.startsWith("optimistic-") || queryPostId.startsWith("optimistic-")) return;

    console.log("[Community][comments] fetch start", {
      uiPostId,
      queryPostId,
      cachedCount: (commentsRef.current[uiPostId] || []).length,
    });

    const { data, error } = await supabase
      .from("community_comments")
      .select("*")
      .eq("post_id", queryPostId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("[Community][comments] fetch failed", { uiPostId, queryPostId, error: error.message });
      return;
    }

    const dbComments = (data || []) as Comment[];
    setComments((prev) => {
      const existing = prev[uiPostId] || [];
      const optimistic = existing.filter((c) => c.id.startsWith("optimistic-"));
      const merged = dedupeCommentsById([...dbComments, ...optimistic]);
      return { ...prev, [uiPostId]: merged };
    });

    setAllPosts((prev) => prev.map((p) =>
      p.id === uiPostId || p.id === queryPostId
        ? { ...p, comments_count: Math.max(p.comments_count, dbComments.length) }
        : p
    ));

    console.log("[Community][comments] fetch end", { uiPostId, queryPostId, count: dbComments.length });
  }, [dedupeCommentsById]);

  // Load comment reactions when comments are expanded
  useEffect(() => {
    if (expandedComments.size > 0) fetchCommentReactions();
  }, [expandedComments, comments]);

  // Safety: never stay in loading state longer than 10s
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Gate initial fetch on auth readiness to prevent "No posts yet" on refresh
  useEffect(() => {
    if (!authReady) return;
    if (subscriptionsReadyRef.current) {
      console.log("[Community][realtime] duplicate subscription prevented");
      return;
    }

    subscriptionsReadyRef.current = true;
    console.log("[Community][realtime] subscribe start");

    fetchPosts(false);
    fetchLikedPosts();

    supabase.from("community_settings").select("value").eq("key", "community_status").single()
      .then(({ data }) => { if (data) setCommunityOpen(data.value === "open"); });

    const postsChannel = supabase
      .channel("community-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, async (payload) => {
        const newPost = payload.new as any;
        const enriched = await enrichPosts([newPost]);
        if (enriched.length > 0) {
          setAllPosts((prev) => {
            if (prev.some((p) => p.id === enriched[0].id)) return prev;
            const matchIdx = prev.findIndex((p) =>
              p._optimistic &&
              p.content === enriched[0].content &&
              p.anonymous_name === enriched[0].anonymous_name
            );
            if (matchIdx >= 0) {
              const updated = [...prev];
              updated[matchIdx] = { ...enriched[0], _pendingMedia: prev[matchIdx]._pendingMedia, _onCancelUpload: prev[matchIdx]._onCancelUpload, _onRetryUpload: prev[matchIdx]._onRetryUpload };
              return updated;
            }
            const scrolledDown = window.scrollY > 400;
            if (scrolledDown) {
              setNewPostsAvailable((c) => c + 1);
            }
            return [enriched[0], ...prev];
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_posts" }, (payload) => {
        const updated = payload.new as any;
        setAllPosts((prev) => prev.map((p) => {
          if (p.id !== updated.id) return p;
          return { ...p, ...updated, _pendingMedia: p._pendingMedia, _onCancelUpload: p._onCancelUpload, _onRetryUpload: p._onRetryUpload };
        }));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_posts" }, (payload) => {
        const deleted = payload.old as { id: string };
        setAllPosts((prev) => prev.filter((p) => p.id !== deleted.id));
      })
      .subscribe();

    const commentsChannel = supabase
      .channel("community-comments")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_comments" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newComment = payload.new as Comment;
          const uiPostIds = getUiPostIdsForTargetPost(newComment.post_id);
          setComments((prev) => {
            let changed = false;
            const next: Record<string, Comment[]> = { ...prev };

            for (const uiPostId of uiPostIds) {
              const existing = next[uiPostId] || [];
              if (existing.some((c) => c.id === newComment.id)) continue;

              const optimisticIdx = existing.findIndex((c) =>
                c.id.startsWith("optimistic") &&
                c.content === newComment.content &&
                c.anonymous_name === newComment.anonymous_name &&
                c.parent_comment_id === newComment.parent_comment_id
              );

              if (optimisticIdx >= 0) {
                const updated = [...existing];
                updated[optimisticIdx] = newComment;
                next[uiPostId] = dedupeCommentsById(updated);
                changed = true;
              } else {
                next[uiPostId] = dedupeCommentsById([...existing, newComment]);
                changed = true;
              }
            }

            return changed ? next : prev;
          });
        } else if (payload.eventType === "UPDATE") {
          const updatedComment = payload.new as Comment;
          const uiPostIds = getUiPostIdsForTargetPost(updatedComment.post_id);
          setComments((prev) => {
            let changed = false;
            const next: Record<string, Comment[]> = { ...prev };

            for (const uiPostId of uiPostIds) {
              const existing = next[uiPostId] || [];
              if (!existing.some((c) => c.id === updatedComment.id)) continue;
              next[uiPostId] = existing.map((c) => (c.id === updatedComment.id ? updatedComment : c));
              changed = true;
            }

            return changed ? next : prev;
          });
        } else if (payload.eventType === "DELETE") {
          const oldComment = payload.old as { id: string; post_id: string };
          const uiPostIds = getUiPostIdsForTargetPost(oldComment.post_id);
          setComments((prev) => {
            let changed = false;
            const next: Record<string, Comment[]> = { ...prev };

            for (const uiPostId of uiPostIds) {
              const existing = next[uiPostId] || [];
              const filtered = existing.filter((c) => c.id !== oldComment.id);
              if (filtered.length !== existing.length) {
                next[uiPostId] = filtered;
                changed = true;
              }
            }

            return changed ? next : prev;
          });
        }
      })
      .subscribe();

    const likesChannel = supabase
      .channel("community-likes-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_likes" }, (payload) => {
        const like = payload.new as { post_id: string; session_id: string };
        if (like.session_id !== sessionId) {
          setAllPosts((prev) => prev.map((p) => (p.id === like.post_id ? { ...p, likes_count: p.likes_count + 1 } : p)));
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_likes" }, (payload) => {
        const like = payload.old as { post_id: string };
        setAllPosts((prev) => prev.map((p) => (p.id === like.post_id ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p)));
      })
      .subscribe();

    return () => {
      console.log("[Community][realtime] subscribe cleanup");
      subscriptionsReadyRef.current = false;
      fetchingRef.current = false; // Reset so re-mount can fetch
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [authReady, dedupeCommentsById, enrichPosts, fetchLikedPosts, fetchPosts, getUiPostIdsForTargetPost, sessionId]);

  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollTriggerRef = useRef(0);

  const scheduleLoadMore = useCallback((reason: string) => {
    if (activeTabRef.current !== "foryou" || !hasMoreRef.current) return;
    if (scrollDebounceRef.current) return;

    const elapsed = Date.now() - lastScrollTriggerRef.current;
    const delay = elapsed >= SCROLL_DEBOUNCE_MS ? 0 : SCROLL_DEBOUNCE_MS - elapsed;

    scrollDebounceRef.current = setTimeout(() => {
      scrollDebounceRef.current = null;
      if (activeTabRef.current !== "foryou" || !hasMoreRef.current) return;
      if (fetchingRef.current) {
        console.log("[Community][feed] load-more blocked (fetching)", { reason });
        return;
      }
      lastScrollTriggerRef.current = Date.now();
      console.log("[Community][feed] load-more trigger", { reason, cursor: cursorRef.current });
      fetchPosts(true);
    }, delay);
  }, [fetchPosts]);

  const getScrollRootForSentinel = useCallback((sentinel: HTMLElement) => {
    let parent = sentinel.parentElement;

    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      const isScrollable = /(auto|scroll|overlay)/.test(overflowY);

      if (isScrollable && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }

      parent = parent.parentElement;
    }

    return null;
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (sentinelObserverRef.current) {
      sentinelObserverRef.current.disconnect();
      sentinelObserverRef.current = null;
    }

    if (!sentinel || loading || activeTab !== "foryou" || !hasMore) return;

    const root = getScrollRootForSentinel(sentinel);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          scheduleLoadMore("sentinel-intersect");
        }
      },
      {
        root,
        rootMargin: "600px 0px 600px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(sentinel);
    sentinelObserverRef.current = observer;

    console.log("[Community][feed] sentinel observer attached", {
      root: root ? "container" : "viewport",
    });

    return () => {
      observer.disconnect();
      if (sentinelObserverRef.current === observer) {
        sentinelObserverRef.current = null;
      }
      console.log("[Community][feed] sentinel observer detached");
    };
  }, [activeTab, hasMore, loading, allPosts.length, scheduleLoadMore, getScrollRootForSentinel]);

  useEffect(() => {
    if (loading || activeTab !== "foryou" || !hasMore) return;
    if (fetchingRef.current) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const root = getScrollRootForSentinel(sentinel);
    const sentinelRect = sentinel.getBoundingClientRect();

    const shouldAutoFill = (() => {
      if (root instanceof HTMLElement) {
        const rootRect = root.getBoundingClientRect();
        const containerNotScrollable = root.scrollHeight <= root.clientHeight + 8;
        const sentinelNearBottom = sentinelRect.top <= rootRect.bottom + 120;
        return containerNotScrollable || sentinelNearBottom;
      }

      const pageNotScrollable = document.documentElement.scrollHeight <= window.innerHeight + 8;
      const sentinelNearViewport = sentinelRect.top <= window.innerHeight + 120;
      return pageNotScrollable || sentinelNearViewport;
    })();

    if (shouldAutoFill) {
      console.log("[Community][feed] auto-fill trigger", {
        root: root ? "container" : "viewport",
      });
      scheduleLoadMore("auto-fill");
    }
  }, [allPosts.length, activeTab, hasMore, loading, scheduleLoadMore, getScrollRootForSentinel]);

  useEffect(() => {
    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
        scrollDebounceRef.current = null;
      }
      if (sentinelObserverRef.current) {
        sentinelObserverRef.current.disconnect();
        sentinelObserverRef.current = null;
      }
    };
  }, []);

  // Update cache whenever posts change
  useEffect(() => {
    if (allPosts.length > 0) feedCache.updateCache(allPosts);
  }, [allPosts.length]);

  const displayPosts = useMemo(() => {
    const chronological = [...allPosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    switch (activeTab) {
      case "foryou":
        return chronological;
      case "following":
        return chronological.filter(p => p.author_id && followingIds.has(p.author_id));
      case "trending": {
        const now = Date.now();
        const cutoff = now - 24 * 60 * 60 * 1000;
        return chronological
          .filter(p => new Date(p.created_at).getTime() > cutoff)
          .sort((a, b) => {
            const hoursA = Math.max(1, (now - new Date(a.created_at).getTime()) / 3600000);
            const hoursB = Math.max(1, (now - new Date(b.created_at).getTime()) / 3600000);
            const velocityA = ((a.likes_count * 3) + (a.comments_count * 4) + (a.shares_count * 5) + ((a.views_count || 0) * 0.5)) / hoursA;
            const velocityB = ((b.likes_count * 3) + (b.comments_count * 4) + (b.shares_count * 5) + ((b.views_count || 0) * 0.5)) / hoursB;
            return velocityB - velocityA;
          });
      }
      default:
        return chronological;
    }
  }, [allPosts, activeTab, followingIds]);

  // Virtual feed — only render posts near viewport
  const { virtualItems: visiblePosts, topSpacer, bottomSpacer } = useVirtualFeed(displayPosts, {
    estimatedItemHeight: 350,
    overscan: 8,
    enabled: displayPosts.length > 30,
  });

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setNewPostsAvailable(0);
  }, []);


  const handleRefresh = useCallback(async () => {
    // Force-reset fetch lock so refresh always works (even in PWA)
    fetchingRef.current = false;
    setRefreshing(true);
    setHasMore(true);
    hasMoreRef.current = true;
    setNewPostsAvailable(0);
    cursorRef.current = null;
    lastCursorLogRef.current = null;
    feedCache.clearCache();
    console.log("[Community][feed] manual refresh (cache cleared)");
    await fetchPosts(false);
    setRefreshing(false);
  }, [fetchPosts, feedCache]);

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 10000) setNewPost(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
    // Check for @mention
    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
      setMentionQuery("");
    }
  };

  const pendingFilesRef = useRef<Map<string, { file: File; type: "image" | "video" }>>(new Map());

  const updatePendingMedia = useCallback((postId: string, mediaId: string, update: Partial<PendingMedia>) => {
    setAllPosts(prev => prev.map(p => {
      if (p.id !== postId || !p._pendingMedia) return p;
      return { ...p, _pendingMedia: p._pendingMedia.map(pm => pm.id === mediaId ? { ...pm, ...update } : pm) };
    }));
  }, []);

  const cancelPendingUpload = useCallback((postId: string, mediaId: string) => {
    const ctrl = bgUploadControllersRef.current.get(mediaId);
    if (ctrl) { ctrl.abort(); bgUploadControllersRef.current.delete(mediaId); }
    setAllPosts(prev => prev.map(p => {
      if (p.id !== postId || !p._pendingMedia) return p;
      const remaining = p._pendingMedia.filter(pm => pm.id !== mediaId);
      return { ...p, _pendingMedia: remaining.length > 0 ? remaining : undefined };
    }));
  }, []);

  const startBackgroundUpload = useCallback(async (postId: string, mediaId: string, file: File, type: "image" | "video", previewUrl: string) => {
    let uploadFile = file;

    console.log("[VideoUpload] Starting pipeline for post:", postId, "file:", file.name, "size:", file.size, "type:", file.type);

    // Compress video if needed
    if (type === "video" && shouldCompress(file)) {
      updatePendingMedia(postId, mediaId, { status: "compressing", message: "Optimizing video...", progress: 0 });
      try {
        uploadFile = await compressVideoFile(file, {
          maxDimension: 1920,
          onProgress: (p) => updatePendingMedia(postId, mediaId, { progress: p, message: `Optimizing video... ${p}%` }),
        });
        console.log("[VideoUpload] Compression done:", uploadFile.name, "size:", uploadFile.size, "type:", uploadFile.type);
      } catch (err) {
        console.warn("[VideoUpload] Compression failed, using original:", err);
      }
    }

    updatePendingMedia(postId, mediaId, { status: "uploading", message: "Uploading video...", progress: 0 });

    const controller = uploadFileWithProgress("community-media", uploadFile, async (state) => {
      if (state.status === "uploading") {
        updatePendingMedia(postId, mediaId, { progress: state.progress, message: `Uploading... ${state.progress}%` });
      } else if (state.status === "done" && state.publicUrl) {
        const publicUrl = state.publicUrl;
        console.log("[VideoUpload] Upload complete. Public URL:", publicUrl);

        // Verify the URL is a valid public storage URL (not blob:)
        if (!publicUrl.startsWith("http") || publicUrl.startsWith("blob:")) {
          console.error("[VideoUpload] Invalid public URL generated:", publicUrl);
          updatePendingMedia(postId, mediaId, { status: "error", message: "Upload produced invalid URL. Tap to retry.", progress: 0 });
          bgUploadControllersRef.current.delete(mediaId);
          return;
        }

        // Verify file is accessible before persisting
        try {
          const headRes = await fetch(publicUrl, { method: "HEAD" });
          if (!headRes.ok) {
            console.error("[VideoUpload] URL not accessible:", headRes.status, publicUrl);
            updatePendingMedia(postId, mediaId, { status: "error", message: "Video not accessible. Tap to retry.", progress: 0 });
            bgUploadControllersRef.current.delete(mediaId);
            return;
          }
          console.log("[VideoUpload] URL verified accessible:", headRes.status);
        } catch (headErr) {
          console.warn("[VideoUpload] HEAD check failed (CORS?), proceeding anyway:", headErr);
        }

        // Update DB first, then update local state
        const { data: currentPost } = await supabase
          .from("community_posts")
          .select("media_urls")
          .eq("id", postId)
          .single();

        const existingUrls: string[] = currentPost?.media_urls || [];
        const newMediaUrls = [...existingUrls, publicUrl];

        const { error: dbError } = await supabase
          .from("community_posts")
          .update({ media_urls: newMediaUrls })
          .eq("id", postId);

        if (dbError) {
          console.error("[VideoUpload] DB update failed:", dbError.message, dbError.details);
          updatePendingMedia(postId, mediaId, { status: "error", message: "Failed to save video. Tap to retry.", progress: 0 });
          bgUploadControllersRef.current.delete(mediaId);
          return;
        }

        console.log("[VideoUpload] DB updated successfully. media_urls:", newMediaUrls);

        // Now update local state
        setAllPosts(prev => prev.map(p => {
          if (p.id !== postId) return p;
          const remaining = (p._pendingMedia || []).filter(pm => pm.id !== mediaId);
          return {
            ...p,
            media_urls: newMediaUrls,
            _pendingMedia: remaining.length > 0 ? remaining : undefined,
          };
        }));
        bgUploadControllersRef.current.delete(mediaId);
      } else if (state.status === "error") {
        console.error("[VideoUpload] Upload error:", state.error, state.message);
        updatePendingMedia(postId, mediaId, { status: "error", message: "Upload failed. Tap to retry.", progress: 0 });
        bgUploadControllersRef.current.delete(mediaId);
      } else if (state.status === "cancelled") {
        cancelPendingUpload(postId, mediaId);
      }
    });

    bgUploadControllersRef.current.set(mediaId, controller);
  }, [updatePendingMedia, cancelPendingUpload]);

  const retryPendingUpload = useCallback((postId: string, mediaId: string) => {
    const fileEntry = pendingFilesRef.current.get(mediaId);
    if (!fileEntry) return;
    setAllPosts(prev => {
      const post = prev.find(p => p.id === postId);
      const pm = post?._pendingMedia?.find(m => m.id === mediaId);
      if (pm) startBackgroundUpload(postId, mediaId, fileEntry.file, fileEntry.type, pm.previewUrl);
      return prev;
    });
  }, [startBackgroundUpload]);



  const addPost = async () => {
    if ((!newPost.trim() && mediaFiles.length === 0) || posting) return;
    setPosting(true);

    const savedContent = newPost;
    const savedMedia = [...mediaFiles];
    setNewPost("");
    setMediaFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Separate already-uploaded images from local video files
    const readyUrls: string[] = [];
    const videoFilesToUpload: { file: File; previewUrl: string }[] = [];

    for (const m of savedMedia) {
      if (m.type === "video" && m.file) {
        if (m.file.size > 50 * 1024 * 1024) {
          toast({ title: "Video too large", description: "Please upload a file under 50MB.", variant: "destructive" });
          setNewPost(savedContent);
          setMediaFiles(savedMedia);
          setPosting(false);
          return;
        }
        videoFilesToUpload.push({ file: m.file, previewUrl: m.url });
      } else if (m.url && !m.url.startsWith("blob:") && m.url.startsWith("http")) {
        readyUrls.push(m.url);
      }
    }

    // Build optimistic post immediately
    const optimisticId = `optimistic-post-${Date.now()}`;
    const authorId = authUser?.id || currentUser?.id || null;

    const pendingMedia: PendingMedia[] = videoFilesToUpload.map((v) => {
      const mediaId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      pendingFilesRef.current.set(mediaId, { file: v.file, type: "video" });
      return {
        id: mediaId,
        previewUrl: v.previewUrl,
        type: "video" as const,
        status: "compressing" as const,
        progress: 0,
        message: "Preparing video...",
      };
    });

    const optimisticPost: Post = {
      id: optimisticId,
      content: savedContent.trim().slice(0, 10000) || "",
      anonymous_name: postAnonymously ? sessionId : (currentUser?.displayName || sessionId),
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      views_count: 0,
      created_at: new Date().toISOString(),
      author_id: authorId,
      is_anonymous: postAnonymously,
      media_urls: readyUrls,
      author_profile: currentUser && !postAnonymously ? { display_name: currentUser.displayName, avatar_url: "" } : null,
      _optimistic: true,
      _pendingMedia: pendingMedia.length > 0 ? pendingMedia : undefined,
    };

    const isFirstPost = !allPosts.some(p => p.author_id === currentUser?.id);

    // Show post immediately
    setAllPosts(prev => [optimisticPost, ...prev]);
    setPosting(false);

    // 4s failsafe: if DB hasn't responded, keep the optimistic post visible
    const failsafeTimer = setTimeout(() => {
      // Post is already shown — no stuck state possible
    }, 4000);

    // Insert into DB asynchronously
    const insertData: any = {
      content: savedContent.trim().slice(0, 10000) || "",
      anonymous_name: postAnonymously ? sessionId : (currentUser?.displayName || sessionId),
      is_anonymous: postAnonymously,
      media_urls: readyUrls,
    };
    if (authorId) insertData.author_id = authorId;

    try {
      const { data: insertedPost, error } = await supabase
        .from("community_posts")
        .insert(insertData)
        .select("id, content, anonymous_name, author_id, is_anonymous, likes_count, comments_count, shares_count, views_count, created_at, media_urls")
        .single();

      clearTimeout(failsafeTimer);

      if (error || !insertedPost) {
        // Remove optimistic post on failure
        setAllPosts(prev => prev.filter(p => p.id !== optimisticId));
        setNewPost(savedContent);
        setMediaFiles(savedMedia);
        toast({ title: "Post failed to publish", description: error?.message || "Could not post. Try again.", variant: "destructive" });
        return;
      }

      const postId = insertedPost.id;

      // Replace optimistic post with real post
      const realPost: Post = {
        ...optimisticPost,
        id: postId,
        created_at: insertedPost.created_at,
        _optimistic: undefined,
        _onCancelUpload: pendingMedia.length > 0 ? (mediaId: string) => cancelPendingUpload(postId, mediaId) : undefined,
        _onRetryUpload: pendingMedia.length > 0 ? (mediaId: string) => retryPendingUpload(postId, mediaId) : undefined,
      };

      setAllPosts(prev => prev.map(p => p.id === optimisticId ? realPost : p));
      toast({ title: videoFilesToUpload.length > 0 ? "Post published! Video uploading..." : "Post published successfully! 🎉" });

      if (isFirstPost && currentUser) {
        setShowFirstPostCelebration(true);
      }

      // Start background video uploads
      for (const pm of pendingMedia) {
        const fileEntry = pendingFilesRef.current.get(pm.id);
        if (fileEntry) {
          startBackgroundUpload(postId, pm.id, fileEntry.file, "video", pm.previewUrl);
        }
      }

      // Send mention notifications (fire and forget)
      if (currentUser) {
        const mentions = extractMentions(savedContent);
        if (mentions.length > 0) {
          supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("display_name", mentions)
            .then(({ data: mentionedProfiles }) => {
              if (mentionedProfiles) {
                for (const mp of mentionedProfiles) {
                  if (mp.user_id !== currentUser.id) {
                    createNotification(mp.user_id, currentUser.id, "mention", "mentioned you in a post", postId);
                  }
                }
              }
            });
        }
      }
    } catch (err: any) {
      clearTimeout(failsafeTimer);
      // Keep optimistic post visible — user sees their content regardless
      console.error("[Community] Post insert error:", err?.message);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setAllPosts(prev => prev.filter(p => p.id !== postId));
    const { error } = await supabase.from("community_posts").delete().eq("id", postId);
    if (error) {
      toast({ title: "Error", description: "Could not delete post.", variant: "destructive" });
      fetchPosts(false);
    } else {
      toast({ title: "Post deleted" });
    }
  };

  const handleEditPost = async (postId: string, newContent: string, newMediaUrls?: string[]) => {
    const updateData: any = { content: newContent };
    if (newMediaUrls !== undefined) updateData.media_urls = newMediaUrls;
    const previousPost = allPosts.find(p => p.id === postId);
    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newContent, ...(newMediaUrls !== undefined ? { media_urls: newMediaUrls } : {}) } : p));
    try {
      const result = await Promise.race([
        supabase.from("community_posts").update(updateData).eq("id", postId),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), 3000)),
      ]);
      if (result.error) throw new Error(result.error.message);
      toast({ title: "Post updated" });
    } catch (e: any) {
      if (previousPost) {
        setAllPosts(prev => prev.map(p => p.id === postId ? previousPost : p));
      }
      toast({ title: "Error", description: e.message || "Could not edit post.", variant: "destructive" });
    }
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
      await supabase.from("community_likes").insert({ post_id: postId, session_id: sessionId, liker_user_id: currentUser?.id || null } as any);
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
    if (!postId) return;
    const isExpanded = expandedComments.has(postId);
    if (isExpanded) {
      setExpandedComments((prev) => { const n = new Set(prev); n.delete(postId); return n; });
      return;
    }

    setExpandedComments((prev) => new Set(prev).add(postId));
    const targetPostId = resolveCommentTargetPostId(postId);
    console.log("[Community][comments] thread opened", { postId, targetPostId });
    await fetchCommentsForPost(postId, targetPostId);
  };

  const addComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    const targetPostId = resolveCommentTargetPostId(postId);
    if (!targetPostId) return;

    const commentName = currentUser ? currentUser.displayName : sessionId;
    const post = allPosts.find((p) => p.id === postId);
    const insertData: any = {
      post_id: targetPostId,
      content: text.slice(0, 5000),
      anonymous_name: commentName,
    };
    if (currentUser) {
      insertData.author_id = currentUser.id;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticComment: Comment = {
      id: optimisticId,
      post_id: targetPostId,
      content: text.slice(0, 5000),
      anonymous_name: commentName,
      author_id: currentUser?.id || null,
      parent_comment_id: null,
      created_at: new Date().toISOString(),
    };

    setComments((prev) => ({
      ...prev,
      [postId]: dedupeCommentsById([...(prev[postId] || []), optimisticComment]),
    }));
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setAllPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));

    const { data: insertedComment, error } = await supabase.from("community_comments").insert(insertData).select("id").single();
    if (!error && insertedComment) {
      setComments((prev) => ({
        ...prev,
        [postId]: dedupeCommentsById((prev[postId] || []).map((c) =>
          c.id === optimisticId ? { ...c, id: insertedComment.id } : c
        )),
      }));
      await supabase.rpc("increment_comments", { post_id_input: targetPostId });
      if (currentUser && post?.author_id && post.author_id !== currentUser.id) {
        createNotification(post.author_id, currentUser.id, "comment", "commented on your post", targetPostId);
      }
      triggerCompanionReply(targetPostId, insertedComment.id, text);
    } else {
      setComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== optimisticId),
      }));
      setAllPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p));
      toast({ title: "Error", description: "Could not add comment.", variant: "destructive" });
    }
  };

  const AI_COMPANIONS = ["seren", "atlas", "nova", "orion", "kai", "sol", "elias", "leo"];

  const triggerCompanionReply = async (postId: string, commentId: string, commentContent: string, parentCommentId?: string) => {
    // Check if comment mentions an AI companion
    const mentionRegex = /@(seren|atlas|nova|orion|kai|sol|elias|leo)\b/i;
    const match = commentContent.match(mentionRegex);
    if (!match) return;

    const mentionedCompanion = match[1].toLowerCase();

    // Fire and forget - don't block the UI
    supabase.functions.invoke("reply-to-mention", {
      body: {
        post_id: postId,
        comment_id: commentId,
        comment_content: commentContent,
        mentioned_companion: mentionedCompanion,
        parent_comment_id: parentCommentId || null,
      },
    }).then(({ error }) => {
      if (error) console.error("AI reply error:", error);
    }).catch(err => console.error("AI reply failed:", err));
  };

  const addReply = async (postId: string, content: string, parentCommentId: string, parentAuthorId?: string | null) => {
    if (!content.trim()) return;

    const mappedUiPostId = Object.entries(commentsRef.current).find(([, list]) =>
      list.some((comment) => comment.id === parentCommentId)
    )?.[0] || postId;

    const targetPostId = resolveCommentTargetPostId(mappedUiPostId);
    if (!targetPostId) return;

    const commentName = currentUser ? currentUser.displayName : sessionId;
    const optimisticId = `optimistic-reply-${Date.now()}`;
    const optimisticReply: Comment = {
      id: optimisticId,
      post_id: targetPostId,
      content: content.slice(0, 5000),
      anonymous_name: commentName,
      author_id: currentUser?.id || null,
      parent_comment_id: parentCommentId,
      created_at: new Date().toISOString(),
    };

    console.log("[Community][comments] reply optimistic", { mappedUiPostId, targetPostId, parentCommentId });

    setComments((prev) => ({
      ...prev,
      [mappedUiPostId]: dedupeCommentsById([...(prev[mappedUiPostId] || []), optimisticReply]),
    }));
    setAllPosts((prev) => prev.map((p) =>
      p.id === mappedUiPostId || p.id === targetPostId
        ? { ...p, comments_count: p.comments_count + 1 }
        : p
    ));

    const insertData: any = {
      post_id: targetPostId,
      content: content.slice(0, 5000),
      anonymous_name: commentName,
      parent_comment_id: parentCommentId,
    };
    if (currentUser) insertData.author_id = currentUser.id;

    const { data: insertedReply, error } = await supabase.from("community_comments").insert(insertData).select("id").single();
    if (!error && insertedReply) {
      setComments((prev) => ({
        ...prev,
        [mappedUiPostId]: dedupeCommentsById((prev[mappedUiPostId] || []).map((c) =>
          c.id === optimisticId ? { ...c, id: insertedReply.id } : c
        )),
      }));
      supabase.rpc("increment_comments", { post_id_input: targetPostId }).then(() => {});
      if (currentUser && parentAuthorId && parentAuthorId !== currentUser.id) {
        createNotification(parentAuthorId, currentUser.id, "reply", "replied to your comment", targetPostId);
      }
      triggerCompanionReply(targetPostId, insertedReply.id, content, parentCommentId);
    } else {
      setComments((prev) => ({
        ...prev,
        [mappedUiPostId]: (prev[mappedUiPostId] || []).filter((c) => c.id !== optimisticId),
      }));
      setAllPosts((prev) => prev.map((p) =>
        p.id === mappedUiPostId || p.id === targetPostId
          ? { ...p, comments_count: Math.max(0, p.comments_count - 1) }
          : p
      ));
      toast({ title: "Error", description: "Could not add reply.", variant: "destructive" });
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

    // Optimistic UI update immediately
    setAllPosts(prev => prev.map(p => p.id === post.id ? { ...p, shares_count: p.shares_count + 1 } : p));
    toast({ title: quoteContent ? "Quote reposted!" : "Reposted!" });

    // DB operations async — don't block UI
    (async () => {
      try {
        if (quoteContent) {
          await supabase.from("community_posts").insert({
            content: quoteContent,
            anonymous_name: currentUser.displayName,
            is_anonymous: false,
            author_id: currentUser.id,
            original_post_id: post.id,
          });
          await supabase.from("community_reposts").insert({
            user_id: currentUser.id,
            original_post_id: post.id,
            quote_content: quoteContent,
          });
        } else {
          await supabase.from("community_reposts").insert({
            user_id: currentUser.id,
            original_post_id: post.id,
          });
        }
        supabase.from("community_posts").update({ shares_count: post.shares_count + 1 }).eq("id", post.id).then(() => {});
        if (post.author_id && post.author_id !== currentUser.id) {
          createNotification(post.author_id, currentUser.id, "repost", "reposted your post", post.id);
        }
      } catch {
        // Rollback share count on failure
        setAllPosts(prev => prev.map(p => p.id === post.id ? { ...p, shares_count: Math.max(0, p.shares_count - 1) } : p));
        toast({ title: "Error", description: "Could not repost. Try again.", variant: "destructive" });
      }
    })();
  };

  const reactionCountsMap = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    for (const [postId, postReactions] of Object.entries(reactions)) {
      result[postId] = {};
      for (const r of postReactions) {
        result[postId][r.emoji] = (result[postId][r.emoji] || 0) + 1;
      }
    }
    return result;
  }, [reactions]);

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
        <div className="text-center mb-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center mb-4">
            <img src={uprisingLogo} alt="The Uprising" className="w-14 h-14 rounded-2xl object-cover shadow-xl" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-display font-bold text-foreground mb-1.5">
            Welcome to Uprising 🌿
          </motion.h1>
          <p className="text-muted-foreground text-sm">Share, support, and uplift each other.</p>
          <div className="inline-flex items-center gap-2 mt-2.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-muted-foreground text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            Positive energy only · Anonymous
          </div>
        </div>

        {/* AI Companion Stories */}
        <CompanionStoryBar />

        {/* Quick links */}
        {currentUser && (
          <div className="flex gap-2 mb-4 justify-center">
            <button onClick={() => navigate("/bookmarks")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
              <Bookmark className="w-3 h-3" /> Saved
            </button>
            <button onClick={() => navigate("/drafts")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
              <FileText className="w-3 h-3" /> Drafts
            </button>
          </div>
        )}

        {/* Suggested Users */}
        {currentUser && (
          <SuggestedUsers
            currentUserId={currentUser.id}
            followingIds={followingIds}
            onFollow={(userId) => setFollowingIds(prev => new Set(prev).add(userId))}
            compact
          />
        )}
        {/* Activity Banner */}
        <ActivityBanner />

        {/* First Post Celebration */}
        <FirstPostCelebration
          show={showFirstPostCelebration}
          onDismiss={() => setShowFirstPostCelebration(false)}
        />

        {/* Welcome / First Post Prompt */}
        {!loading && (
          <WelcomePrompt
            isLoggedIn={!!authUser}
            hasPosted={allPosts.some(p => p.author_id && (p.author_id === currentUser?.id || p.author_id === authUser?.id))}
            onOpenAuth={() => setAuthOpen(true)}
          />
        )}

        {!communityOpen && (
          <div className="p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 backdrop-blur-xl mb-6 text-center">
            <p className="text-yellow-300 text-sm font-medium">🔒 Community posting is currently closed by the admin.</p>
          </div>
        )}

        {/* Composer */}
        <div className={`p-5 rounded-2xl backdrop-blur-xl border border-white/15 shadow-lg mb-6 ${!communityOpen ? "opacity-50 pointer-events-none" : ""}`} style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}>
          <div className="flex gap-3">
            <UserAvatar displayName={postAnonymously ? sessionId : currentUser?.displayName} size="sm" />
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={newPost}
                onChange={handlePostChange}
                placeholder={communityOpen ? "What's on your mind? Use @ to mention someone" : "Community posting is currently closed."}
                rows={2}
                disabled={!communityOpen}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none overflow-hidden disabled:cursor-not-allowed"
                style={{ minHeight: "60px" }}
                onBlur={() => setTimeout(() => setShowMentionDropdown(false), 200)}
              />
              <MentionDropdown
                query={mentionQuery}
                visible={showMentionDropdown}
                onSelect={(user) => {
                  const cursorPos = textareaRef.current?.selectionStart || newPost.length;
                  const textBefore = newPost.slice(0, cursorPos);
                  const textAfter = newPost.slice(cursorPos);
                  const replaced = textBefore.replace(/@\w*$/, `@${user.display_name || "User"} `);
                  setNewPost(replaced + textAfter);
                  setShowMentionDropdown(false);
                  setMentionQuery("");
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
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
                <div className="flex gap-2">
                  {currentUser && newPost.trim() && (
                    <button
                      onClick={async () => {
                        await saveDraft(newPost, mediaFiles.map(m => m.url), postAnonymously);
                        setNewPost(""); setMediaFiles([]);
                        toast({ title: "Draft saved!" });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    >
                      <FileText className="w-3 h-3" /> Save Draft
                    </button>
                  )}
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

        {/* Pull to refresh + Refresh button */}
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

        <PullToRefresh onRefresh={handleRefresh}>

        {/* Feed */}
        {fetchError && allPosts.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-foreground mb-2">{fetchError}</p>
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); setFetchError(null); fetchPosts(false); }}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
            </Button>
          </div>
        ) : (loading || !authReady) ? (
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
                <p className="text-lg mb-2">Start a conversation with the community</p>
                <div className="flex flex-col items-center gap-1.5 text-sm text-white/50">
                  <span>💚 Share something positive</span>
                  <span>❓ Ask a question</span>
                  <span>📖 Tell your story</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 relative">
            {/* New Posts Available indicator */}
            <AnimatePresence>
              {newPostsAvailable > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="sticky top-16 z-30 flex justify-center"
                >
                  <button
                    onClick={scrollToTop}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    {newPostsAvailable} new {newPostsAvailable === 1 ? "post" : "posts"} available
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Virtual feed spacer top */}
            {topSpacer > 0 && <div style={{ height: topSpacer }} aria-hidden />}

            <AnimatePresence mode="popLayout">
              {visiblePosts.map((post, idx) => (
                <PostViewObserver key={post.id} postId={post.id} onView={trackView}>
                  <PostCard
                    post={post}
                    isLiked={likedPosts.has(post.id)}
                    isExpanded={expandedComments.has(post.id)}
                    postComments={comments[post.id] || []}
                    reactionCounts={reactionCountsMap[post.id] || {}}
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
                    isBookmarked={isBookmarked(post.id)}
                    onToggleBookmark={toggleBookmark}
                    isOwnPost={!!(post.author_id && (post.author_id === currentUser?.id || post.author_id === authUser?.id))}
                    onDeletePost={handleDeletePost}
                    onEditPost={handleEditPost}
                  />
                </PostViewObserver>
              ))}
            </AnimatePresence>

            {/* Virtual feed spacer bottom */}
            {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} aria-hidden />}

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
        </PullToRefresh>
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
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
};

export default Community;
