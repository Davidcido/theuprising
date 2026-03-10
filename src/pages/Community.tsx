import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Shield, Eye, EyeOff, Sparkles, Users, TrendingUp, RefreshCw, Bookmark, FileText, AlertCircle } from "lucide-react";
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
import { withTimeout } from "@/lib/apiHelpers";
import { usePostViewTracker } from "@/hooks/usePostViewTracker";
import PostViewObserver from "@/components/community/PostViewObserver";
import FirstPostCelebration from "@/components/community/FirstPostCelebration";
import { extractMentions } from "@/components/community/HashtagText";
import MentionDropdown from "@/components/community/MentionDropdown";
import { useAuthReady } from "@/hooks/useAuthReady";

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

const CACHE_KEY = "uprising_community_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedPosts = (): Post[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { posts, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return posts;
  } catch { return null; }
};

const setCachedPosts = (posts: Post[]) => {
  try {
    // Only cache first page worth of posts (lightweight)
    const toCache = posts.filter(p => !p._optimistic && !p.id.startsWith("repost-")).slice(0, POSTS_PER_PAGE);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ posts: toCache, ts: Date.now() }));
  } catch {}
};

const Community = () => {
  const cachedPosts = useRef(getCachedPosts());
  const [allPosts, setAllPosts] = useState<Post[]>(cachedPosts.current || []);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(!cachedPosts.current);
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
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    if (loadMore) setLoadingMore(true);
    setFetchError(null);
    const from = loadMore ? allPosts.length : 0;
    const to = from + POSTS_PER_PAGE - 1;

    try {
      // Direct query without aggressive timeout — let Supabase handle it
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!data) throw new Error("No data");

      const enriched = await enrichPosts(data);
      if (loadMore) {
        setAllPosts(prev => [...prev, ...enriched]);
      } else {
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
        } catch {
          // Reposts failed — still show main posts
        }
        const merged = [...enriched, ...directRepostPosts];
        setAllPosts(merged);
        setCachedPosts(enriched);
      }
      setHasMore(data.length === POSTS_PER_PAGE);
    } catch (err: any) {
      console.error("[Community] fetchPosts failed:", err?.message);
      // Auto-retry once before showing error
      if (retryCount < 1) {
        console.log("[Community] Retrying fetch...");
        return fetchPosts(loadMore, retryCount + 1);
      }
      // Fall back to cached posts if available
      if (!loadMore && allPosts.length === 0) {
        const cached = getCachedPosts();
        if (cached && cached.length > 0) {
          console.log("[Community] Using cached posts as fallback");
          setAllPosts(cached);
        } else {
          setFetchError("Could not load posts. Tap to retry.");
        }
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [enrichPosts, allPosts.length]);

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
          setAllPosts(prev => {
            // Skip if we already have this post (from instant publish)
            if (prev.some(p => p.id === enriched[0].id)) return prev;
            return [enriched[0], ...prev];
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_posts" }, (payload) => {
        const updated = payload.new as any;
        setAllPosts(prev => prev.map(p => {
          if (p.id !== updated.id) return p;
          // Preserve pending media and callbacks during background uploads
          return { ...p, ...updated, _pendingMedia: p._pendingMedia, _onCancelUpload: p._onCancelUpload, _onRetryUpload: p._onRetryUpload };
        }));
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
        if (authUser) {
          const { data: follows } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", authUser.id);
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
  }, [authReady]);

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
    // Always sort by created_at descending (newest first) as the base
    const chronological = [...allPosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    switch (activeTab) {
      case "foryou":
        return chronological;
      case "following":
        return chronological.filter(p => p.author_id && followingIds.has(p.author_id));
      case "trending": {
        const now = Date.now();
        const cutoff = now - 48 * 60 * 60 * 1000;
        return chronological
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
        return chronological;
    }
  }, [allPosts, activeTab, followingIds]);

  const visiblePosts = displayPosts;

  // View tracking is now handled per-post via PostViewObserver + usePostViewTracker

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

    // Compress video if needed
    if (type === "video" && shouldCompress(file)) {
      updatePendingMedia(postId, mediaId, { status: "compressing", message: "Optimizing video...", progress: 0 });
      try {
        uploadFile = await compressVideoFile(file, {
          maxDimension: 1920,
          onProgress: (p) => updatePendingMedia(postId, mediaId, { progress: p, message: `Optimizing video... ${p}%` }),
        });
      } catch {
        // use original on failure
      }
    }

    updatePendingMedia(postId, mediaId, { status: "uploading", message: "Uploading video...", progress: 0 });

    const controller = uploadFileWithProgress("community-media", uploadFile, (state) => {
      if (state.status === "uploading") {
        updatePendingMedia(postId, mediaId, { progress: state.progress, message: `Uploading... ${state.progress}%` });
      } else if (state.status === "done" && state.publicUrl) {
        setAllPosts(prev => prev.map(p => {
          if (p.id !== postId) return p;
          const newMediaUrls = [...(p.media_urls || []), state.publicUrl!];
          const remaining = (p._pendingMedia || []).filter(pm => pm.id !== mediaId);
          const updated = {
            ...p,
            media_urls: newMediaUrls,
            _pendingMedia: remaining.length > 0 ? remaining : undefined,
          };
          // Await the DB update to ensure URL persists
          supabase.from("community_posts").update({ media_urls: newMediaUrls }).eq("id", postId).then(({ error }) => {
            if (error) console.error("[Community] Failed to persist media URL:", error.message);
          });
          return updated;
        }));
        bgUploadControllersRef.current.delete(mediaId);
      } else if (state.status === "error") {
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

  const uploadVideoFile = async (file: File): Promise<string | null> => {
    // Enforce 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Video too large", description: "Please upload a file under 50MB.", variant: "destructive" });
      return null;
    }

    let uploadFile = file;
    if (shouldCompress(file)) {
      try {
        uploadFile = await compressVideoFile(file, { maxDimension: 1920 });
      } catch { /* use original */ }
    }

    // Upload with 90-second timeout
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
          toast({ title: "Upload timed out", description: "Video upload took too long. Please try a smaller file.", variant: "destructive" });
        }
      }, 90_000);

      uploadFileWithProgress("community-media", uploadFile, (state) => {
        if (resolved) return;
        if (state.status === "done" && state.publicUrl) {
          resolved = true;
          clearTimeout(timeout);
          console.log("[Community] Video uploaded successfully:", state.publicUrl);
          resolve(state.publicUrl);
        } else if (state.status === "error" || state.status === "cancelled") {
          resolved = true;
          clearTimeout(timeout);
          resolve(null);
        }
      });
    });
  };

  const addPost = async () => {
    if ((!newPost.trim() && mediaFiles.length === 0) || posting) return;
    setPosting(true);

    const savedContent = newPost;
    const savedMedia = [...mediaFiles];
    setNewPost("");
    setMediaFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Separate already-uploaded images (have public URLs) from local video files
    const readyUrls: string[] = [];
    const videoFilesToUpload: { file: File; previewUrl: string }[] = [];

    for (const m of savedMedia) {
      if (m.type === "video" && m.file) {
        // Enforce 50MB limit
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

    // Insert the post immediately with only the ready image URLs
    const insertData: any = {
      content: savedContent.trim().slice(0, 10000) || "",
      anonymous_name: postAnonymously ? sessionId : (currentUser?.displayName || sessionId),
      is_anonymous: postAnonymously,
      media_urls: readyUrls,
    };
    if (!postAnonymously && currentUser) {
      insertData.author_id = currentUser.id;
    }

    console.log("[Community] Inserting post:", JSON.stringify(insertData));
    const { data: insertedPost, error } = await supabase
      .from("community_posts")
      .insert(insertData)
      .select()
      .single();

    if (error || !insertedPost) {
      console.error("[Community] Post creation failed:", error?.message, error?.details, error?.hint);
      setNewPost(savedContent);
      setMediaFiles(savedMedia);
      toast({ title: "Post failed to publish", description: error?.message || "Could not post. Try again.", variant: "destructive" });
      setPosting(false);
      return;
    }

    console.log("[Community] Post created successfully:", insertedPost.id);
    const postId = insertedPost.id;

    // Build pending media entries for videos
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

    const newPostObj: Post = {
      id: postId,
      content: insertedPost.content,
      anonymous_name: insertedPost.anonymous_name,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      views_count: 0,
      created_at: insertedPost.created_at,
      author_id: insertedPost.author_id,
      is_anonymous: insertedPost.is_anonymous,
      media_urls: readyUrls,
      author_profile: currentUser && !postAnonymously ? { display_name: currentUser.displayName, avatar_url: "" } : null,
      _pendingMedia: pendingMedia.length > 0 ? pendingMedia : undefined,
      _onCancelUpload: pendingMedia.length > 0 ? (mediaId: string) => cancelPendingUpload(postId, mediaId) : undefined,
      _onRetryUpload: pendingMedia.length > 0 ? (mediaId: string) => retryPendingUpload(postId, mediaId) : undefined,
    };

    const isFirstPost = !allPosts.some(p => p.author_id === currentUser?.id && p.id !== postId);

    setAllPosts(prev => [newPostObj, ...prev.filter(p => p.id !== postId)]);
    toast({ title: videoFilesToUpload.length > 0 ? "Post published! Video uploading..." : "Post published successfully! 🎉" });
    setPosting(false);

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

    // Send mention notifications
    if (currentUser) {
      const mentions = extractMentions(savedContent);
      if (mentions.length > 0) {
        const { data: mentionedProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("display_name", mentions);
        if (mentionedProfiles) {
          for (const mp of mentionedProfiles) {
            if (mp.user_id !== currentUser.id) {
              createNotification(mp.user_id, currentUser.id, "mention", "mentioned you in a post", postId);
            }
          }
        }
      }
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
        <WelcomePrompt
          isLoggedIn={!!authUser}
          hasPosted={allPosts.some(p => p.author_id === (currentUser?.id || authUser?.id))}
          onOpenAuth={() => setAuthOpen(true)}
        />

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
        {fetchError && allPosts.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-foreground mb-2">{fetchError}</p>
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); setFetchError(null); fetchPosts(false); }}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
            </Button>
          </div>
        ) : loading ? (
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
                    isOwnPost={post.author_id === currentUser?.id}
                    onDeletePost={handleDeletePost}
                    onEditPost={handleEditPost}
                  />
                </PostViewObserver>
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
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
};

export default Community;
