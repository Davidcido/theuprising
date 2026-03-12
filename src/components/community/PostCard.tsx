import { useState, memo, useCallback } from "react";
import MediaUploader from "@/components/community/MediaUploader";
import { uploadFileWithProgress } from "@/lib/chunkedUpload";
import { motion, AnimatePresence } from "framer-motion";
import LikesModal from "@/components/community/LikesModal";
import { Heart, MessageCircle, Repeat2, Send, ChevronDown, ChevronUp, Flag, MoreHorizontal, Eye, Share2, Bookmark, Pin, Trash2, Pencil } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { isAICompanion, getCompanionAvatar } from "@/lib/companionAvatars";
import { formatDistanceToNow } from "date-fns";
import EmojiPicker from "@/components/EmojiPicker";
import CommentCard from "@/components/community/CommentCard";
import MediaGallery from "@/components/community/MediaGallery";
import HashtagText from "@/components/community/HashtagText";
import CompanionInteractionMenu from "@/components/community/CompanionInteractionMenu";
import NewMemberBadge from "@/components/community/NewMemberBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const REACTION_EMOJIS = [
  { emoji: "❤️", label: "Love" },
  { emoji: "🙏", label: "Support" },
  { emoji: "💪", label: "Strength" },
  { emoji: "😊", label: "Encouragement" },
  { emoji: "🔥", label: "Inspiration" },
];

export type Comment = {
  id: string;
  post_id: string;
  content: string;
  anonymous_name: string;
  author_id?: string | null;
  parent_comment_id?: string | null;
  created_at: string;
};

export type PendingMedia = {
  id: string;
  type: "image" | "video";
  previewUrl: string; // local blob URL
  progress: number; // 0-100
  status: "compressing" | "uploading" | "done" | "error";
  message: string;
  finalUrl?: string;
};

export type Post = {
  id: string;
  content: string;
  anonymous_name: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count?: number;
  created_at: string;
  author_id?: string | null;
  is_anonymous?: boolean;
  engagement_score?: number;
  author_profile?: { display_name: string | null; avatar_url: string; created_at?: string } | null;
  original_post_id?: string | null;
  reposted_by_name?: string | null;
  original_post?: Post | null;
  media_urls?: string[];
  _optimistic?: boolean;
  _pendingMedia?: PendingMedia[];
  _onCancelUpload?: (mediaId: string) => void;
  _onRetryUpload?: (mediaId: string) => void;
};

export type Reaction = {
  id: string;
  post_id: string;
  session_id: string;
  emoji: string;
};

interface PostCardProps {
  post: Post;
  isLiked: boolean;
  isExpanded: boolean;
  postComments: Comment[];
  reactionCounts: Record<string, number>;
  myReactions: Set<string>;
  commentInput: string;
  currentUserId?: string;
  currentUserName?: string;
  communityOpen: boolean;
  reportMenuPost: string | null;
  commentReactionCounts: Record<string, Record<string, number>>;
  myCommentReactions: Set<string>;
  isBookmarked?: boolean;
  isPinned?: boolean;
  isOwnPost?: boolean;
  onToggleLike: (postId: string) => void;
  onToggleReaction: (postId: string, emoji: string) => void;
  onToggleComments: (postId: string) => void;
  onShare: (post: Post) => void;
  onRepost: (post: Post) => void;
  onReport: (postId: string) => void;
  onSetReportMenu: (postId: string | null) => void;
  onCommentInputChange: (postId: string, value: string) => void;
  onAddComment: (postId: string) => void;
  onAddReply: (postId: string, content: string, parentCommentId: string, parentAuthorId?: string | null) => void;
  onCommentDelete: (postId: string, commentId: string) => void;
  onCommentUpdate: (postId: string, commentId: string, content: string) => void;
  onNavigate: (path: string) => void;
  onToggleCommentReaction: (commentId: string, emoji: string) => void;
  onToggleBookmark?: (postId: string) => void;
  onPinPost?: (postId: string) => void;
  onUnpinPost?: () => void;
  onDeletePost?: (postId: string) => void;
  onEditPost?: (postId: string, newContent: string, newMediaUrls?: string[]) => void;
}

const formatTime = (ts: string) => {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ts; }
};

const formatCount = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
};

const PostCard = ({
  post, isLiked, isExpanded, postComments, reactionCounts, myReactions,
  commentInput, currentUserId, currentUserName, communityOpen, reportMenuPost,
  commentReactionCounts, myCommentReactions, isBookmarked, isPinned, isOwnPost,
  onToggleLike, onToggleReaction, onToggleComments, onShare, onRepost, onReport,
  onSetReportMenu, onCommentInputChange, onAddComment, onAddReply, onCommentDelete,
  onCommentUpdate, onNavigate, onToggleCommentReaction, onToggleBookmark, onPinPost, onUnpinPost,
  onDeletePost, onEditPost,
}: PostCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editMediaFiles, setEditMediaFiles] = useState<{ url: string; type: "image" | "video"; file?: File }[]>([]);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const handleDelete = () => {
    onDeletePost?.(post.id);
    setShowDeleteDialog(false);
  };

  const startEditing = () => {
    setEditing(true);
    setEditContent(post.content);
    // Convert existing media_urls to editMediaFiles
    const existing = (post.media_urls || []).map(url => ({
      url,
      type: (/\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url) ? "video" : "image") as "image" | "video",
    }));
    setEditMediaFiles(existing);
  };

  const hasMedia = (post.media_urls && post.media_urls.length > 0) || (post._pendingMedia && post._pendingMedia.length > 0);

  const handleSaveEdit = async () => {
    const contentChanged = editContent.trim() !== post.content;
    const existingUrls = post.media_urls || [];
    const newUrls = editMediaFiles.filter(m => !m.file).map(m => m.url);
    setEditSaving(true);
    try {
      const uploadedUrls = [...newUrls];
      for (const m of editMediaFiles) {
        if (m.file && m.type === "video") {
          const url = await Promise.race([
            new Promise<string | null>((resolve) => {
              uploadFileWithProgress("community-media", m.file!, (state) => {
                if (state.status === "done" && state.publicUrl) resolve(state.publicUrl);
                else if (state.status === "error" || state.status === "cancelled") resolve(null);
              });
            }),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Upload timed out")), 30000)),
          ]);
          if (url) uploadedUrls.push(url);
        }
      }
      const mediaChanged = JSON.stringify(uploadedUrls) !== JSON.stringify(existingUrls);
      if (contentChanged || mediaChanged) {
        await onEditPost?.(post.id, editContent.trim(), mediaChanged ? uploadedUrls : undefined);
      }
      setEditing(false);
    } catch {
      // error handled by parent or timeout
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: post._optimistic ? 0.7 : 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`rounded-2xl overflow-hidden backdrop-blur-xl border border-white/8 transition-all hover:border-white/15 shadow-lg shadow-black/10 ${post._optimistic ? "animate-pulse" : ""} ${hasMedia ? "" : "p-5"}`}
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)" }}
      >
        {/* Optimistic indicator */}
        {post._optimistic && (
          <div className="text-[10px] text-muted-foreground mb-2">Publishing...</div>
        )}

        {/* Pinned label */}
        {isPinned && (
          <div className="flex items-center gap-1.5 mb-2 text-amber-400/70 text-xs">
            <Pin className="w-3.5 h-3.5" />
            <span className="font-medium">Pinned post</span>
          </div>
        )}

        {/* Repost label */}
        {post.reposted_by_name && (
          <div className="flex items-center gap-1.5 mb-2 text-emerald-400/70 text-xs">
            <Repeat2 className="w-3.5 h-3.5" />
            <span className="font-medium">{post.reposted_by_name} reposted</span>
          </div>
        )}

        {/* Post header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {(() => {
              const displayName = !post.is_anonymous && post.author_profile?.display_name ? post.author_profile.display_name : post.anonymous_name;
              const companionData = isAICompanion(displayName) ? getCompanionAvatar(displayName) : null;
              const avatar = (
                <UserAvatar
                  avatarUrl={companionData?.avatarUrl || post.author_profile?.avatar_url}
                  displayName={displayName}
                  size="sm"
                  onClick={!companionData && !post.is_anonymous && post.author_id ? () => onNavigate(`/profile/${post.author_id}`) : undefined}
                />
              );
              if (companionData) {
                return <CompanionInteractionMenu companionName={displayName}>{avatar}</CompanionInteractionMenu>;
              }
              return avatar;
            })()}
            <div>
              <span
                className={`text-sm font-semibold text-foreground ${!post.is_anonymous && post.author_id ? "cursor-pointer hover:underline" : ""}`}
                onClick={() => { if (!post.is_anonymous && post.author_id) onNavigate(`/profile/${post.author_id}`); }}
              >
                {!post.is_anonymous && post.author_profile?.display_name
                  ? post.author_profile.display_name
                  : post.anonymous_name}
              </span>
              {!post.is_anonymous && post.author_profile?.created_at && (
                <NewMemberBadge createdAt={post.author_profile.created_at} />
              )}
              {post.is_anonymous && (
                <span className="ml-1.5 text-[10px] text-muted-foreground/60 bg-white/5 px-1.5 py-0.5 rounded-full">anon</span>
              )}
              <span className="text-xs text-muted-foreground ml-2">· {formatTime(post.created_at)}</span>
            </div>
          </div>

          {/* Post menu */}
          <div className="relative">
            <button onClick={() => onSetReportMenu(reportMenuPost === post.id ? null : post.id)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
            {reportMenuPost === post.id && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => onSetReportMenu(null)} />
                <div className="absolute right-0 top-8 z-50 bg-card border border-white/15 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                  <button
                    onClick={() => onReport(post.id)}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-yellow-400 hover:bg-white/10 transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5" /> Report Post
                  </button>
                  {onToggleBookmark && (
                    <button
                      onClick={() => { onToggleBookmark(post.id); onSetReportMenu(null); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-foreground hover:bg-white/10 transition-colors"
                    >
                      <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? "currentColor" : "none"} />
                      {isBookmarked ? "Remove Bookmark" : "Bookmark"}
                    </button>
                  )}
                  {isOwnPost && onEditPost && (
                    <button
                      onClick={() => { startEditing(); onSetReportMenu(null); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-foreground hover:bg-white/10 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit Post
                    </button>
                  )}
                  {isOwnPost && onDeletePost && (
                    <button
                      onClick={() => { setShowDeleteDialog(true); onSetReportMenu(null); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-red-400 hover:bg-white/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Post
                    </button>
                  )}
                  {isOwnPost && onPinPost && !isPinned && (
                    <button
                      onClick={() => { onPinPost(post.id); onSetReportMenu(null); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-amber-400 hover:bg-white/10 transition-colors"
                    >
                      <Pin className="w-3.5 h-3.5" /> Pin to Profile
                    </button>
                  )}
                  {isOwnPost && isPinned && onUnpinPost && (
                    <button
                      onClick={() => { onUnpinPost(); onSetReportMenu(null); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-muted-foreground hover:bg-white/10 transition-colors"
                    >
                      <Pin className="w-3.5 h-3.5" /> Unpin
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Media-first: show media above text for visual posts */}
        {!editing && post.media_urls && post.media_urls.length > 0 && (
          <div className={hasMedia ? "-mx-0 -mt-0" : ""}>
            <MediaGallery
              mediaUrls={post.media_urls}
              postData={{
                likesCount: post.likes_count,
                commentsCount: post.comments_count,
                sharesCount: post.shares_count,
                viewsCount: post.views_count || 0,
                isLiked: isLiked,
                onToggleLike: () => onToggleLike(post.id),
                onToggleComments: () => onToggleComments(post.id),
                onShare: () => onShare(post),
                onRepost: () => onRepost(post),
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className={hasMedia ? "px-5 pt-3" : ""}>
        {editing ? (
          <div className="mb-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value.slice(0, 10000))}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none"
              rows={3}
            />
            <div className="mt-2">
              <MediaUploader
                mediaFiles={editMediaFiles}
                onMediaChange={setEditMediaFiles}
                maxFiles={4}
                disabled={editSaving}
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleSaveEdit} disabled={editSaving} className="px-3 py-1.5 rounded-full text-xs text-white font-medium disabled:opacity-50" style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}>
                {editSaving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditing(false)} disabled={editSaving} className="px-3 py-1.5 rounded-full text-xs text-muted-foreground bg-white/5 hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-foreground/90 text-sm leading-relaxed mb-3 whitespace-pre-wrap break-words"><HashtagText content={post.content} /></div>
        )}
        </div>

        {/* Pending media uploads */}
        {post._pendingMedia && post._pendingMedia.length > 0 && (
          <div className="grid gap-1.5 mb-3 grid-cols-1">
            {post._pendingMedia.map((pm) => (
              <div key={pm.id} className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5">
                {pm.type === "video" ? (
                  <video src={pm.previewUrl} className="w-full h-48 object-cover opacity-50" muted playsInline preload="metadata" />
                ) : (
                  <img src={pm.previewUrl} alt="" className="w-full h-48 object-cover opacity-50" />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 gap-2">
                  {pm.status === "error" ? (
                    <>
                      <p className="text-red-400 text-xs font-medium">Video upload failed</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => post._onRetryUpload?.(pm.id)}
                          className="px-3 py-1 rounded-full bg-white/10 text-white text-xs hover:bg-white/20 transition-colors"
                        >
                          Retry
                        </button>
                        <button
                          onClick={() => post._onCancelUpload?.(pm.id)}
                          className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs hover:bg-red-500/30 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <p className="text-white/80 text-xs font-medium">{pm.message}</p>
                      <div className="w-32">
                        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                            style={{ width: `${pm.progress}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => post._onCancelUpload?.(pm.id)}
                        className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-[10px] hover:bg-white/20 transition-colors mt-1"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Embedded original post (for quote reposts) */}
        {post.original_post && (
          <div
            className="p-4 rounded-xl border border-white/10 mb-3 cursor-pointer hover:border-white/20 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)" }}
            onClick={() => onNavigate(`/community`)}
          >
            <div className="flex items-center gap-2 mb-2">
              <UserAvatar
                avatarUrl={post.original_post.author_profile?.avatar_url}
                displayName={!post.original_post.is_anonymous && post.original_post.author_profile?.display_name ? post.original_post.author_profile.display_name : post.original_post.anonymous_name}
                size="xs"
              />
              <span className="text-xs font-semibold text-foreground/80">
                {!post.original_post.is_anonymous && post.original_post.author_profile?.display_name
                  ? post.original_post.author_profile.display_name
                  : post.original_post.anonymous_name}
              </span>
              <span className="text-[10px] text-muted-foreground">· {formatTime(post.original_post.created_at)}</span>
            </div>
            <p className="text-foreground/70 text-xs leading-relaxed whitespace-pre-wrap break-words line-clamp-4">
              {post.original_post.content}
            </p>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground/60">
              <span>❤️ {post.original_post.likes_count}</span>
              <span>💬 {post.original_post.comments_count}</span>
              <span>🔁 {post.original_post.shares_count}</span>
            </div>
          </div>
        )}

        {/* Emoji Reactions */}
        <div className={`flex flex-wrap gap-1.5 mb-3 ${hasMedia ? "px-5" : ""}`}>
          {REACTION_EMOJIS.map(({ emoji, label }) => {
            const count = reactionCounts[emoji] || 0;
            const isMine = myReactions.has(`${post.id}:${emoji}`);
            return (
              <motion.button
                key={emoji}
                onClick={() => onToggleReaction(post.id, emoji)}
                title={label}
                whileTap={{ scale: 0.9 }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all border ${
                  isMine
                    ? "bg-emerald-500/20 border-emerald-500/40 text-foreground"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                }`}
              >
                <span className="text-sm">{emoji}</span>
                {count > 0 && <span>{count}</span>}
              </motion.button>
            );
          })}
        </div>

        {/* Engagement metrics bar */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground/50 mb-2 px-1">
          <span>💬 {formatCount(post.comments_count)} comments</span>
          <span>🔁 {formatCount(post.shares_count)} reposts</span>
          <button
            onClick={() => post.likes_count > 0 && setShowLikesModal(true)}
            className={`hover:text-red-400 transition-colors ${post.likes_count > 0 ? "cursor-pointer hover:underline" : ""}`}
          >
            ❤️ {formatCount(post.likes_count)} likes
          </button>
          {(post.views_count ?? 0) > 0 && <span>👁 {formatCount(post.views_count!)} views</span>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 border-t border-white/5 pt-3">
          <div className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm">
            <motion.button
              onClick={() => onToggleLike(post.id)}
              whileTap={{ scale: 1.3 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className={`inline-flex items-center gap-1 transition-all ${isLiked ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
            >
              <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
            </motion.button>
            <button
              onClick={() => post.likes_count > 0 && setShowLikesModal(true)}
              className={`text-xs transition-colors ${isLiked ? "text-red-400" : "text-muted-foreground"} ${post.likes_count > 0 ? "hover:underline cursor-pointer" : ""}`}
            >
              {post.likes_count}
            </button>
          </div>
          <button
            onClick={() => onToggleComments(post.id)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-blue-400 hover:bg-white/5 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">{post.comments_count}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <motion.button
            onClick={() => onRepost(post)}
            whileTap={{ scale: 1.2, rotate: 15 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-emerald-400 hover:bg-white/5 transition-all"
          >
            <Repeat2 className="w-4 h-4" />
            <span className="text-xs">{post.shares_count}</span>
          </motion.button>
          <div className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span className="text-xs">{formatCount(post.views_count ?? 0)}</span>
          </div>
          <button
            onClick={() => onShare(post)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
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
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-3 border-t border-white/5 space-y-2.5">
                {postComments.filter(c => !c.parent_comment_id).map((c) => (
                  <CommentCard
                    key={c.id}
                    comment={c}
                    replies={postComments.filter(r => r.parent_comment_id === c.id)}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    communityOpen={communityOpen}
                    depth={0}
                    onDelete={(commentId) => onCommentDelete(post.id, commentId)}
                    onUpdate={(commentId, newContent) => onCommentUpdate(post.id, commentId, newContent)}
                    onReply={onAddReply}
                    allComments={postComments}
                    commentReactionCounts={commentReactionCounts}
                    myCommentReactions={myCommentReactions}
                    onToggleCommentReaction={onToggleCommentReaction}
                  />
                ))}
                {postComments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                )}
                {communityOpen ? (
                  <div className="flex gap-2 mt-2 items-end">
                    <EmojiPicker
                      onSelect={(emoji) => onCommentInputChange(post.id, (commentInput || "") + emoji)}
                      className="p-1.5 shrink-0"
                    />
                    <textarea
                      value={commentInput || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 5000) onCommentInputChange(post.id, val);
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          onAddComment(post.id);
                        }
                      }}
                      placeholder="Write a comment..."
                      rows={1}
                      className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none overflow-hidden"
                      style={{ minHeight: "32px" }}
                    />
                    <button
                      onClick={() => onAddComment(post.id)}
                      disabled={!commentInput?.trim()}
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

      {/* Likes modal */}
      <LikesModal
        open={showLikesModal}
        onOpenChange={setShowLikesModal}
        postId={post.id}
        likesCount={post.likes_count}
        onNavigate={onNavigate}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-white/15">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Post</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-foreground hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30">
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default memo(PostCard);
