import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Repeat2, Send, ChevronDown, ChevronUp, Flag, MoreHorizontal, Eye, Share2 } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import EmojiPicker from "@/components/EmojiPicker";
import CommentCard from "@/components/community/CommentCard";
import MediaGallery from "@/components/community/MediaGallery";

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
  author_profile?: { display_name: string | null; avatar_url: string } | null;
  original_post_id?: string | null;
  reposted_by_name?: string | null;
  original_post?: Post | null;
  media_urls?: string[];
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
  commentReactionCounts, myCommentReactions,
  onToggleLike, onToggleReaction, onToggleComments, onShare, onRepost, onReport,
  onSetReportMenu, onCommentInputChange, onAddComment, onAddReply, onCommentDelete,
  onCommentUpdate, onNavigate, onToggleCommentReaction,
}: PostCardProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-5 rounded-2xl backdrop-blur-xl border border-white/10 transition-colors hover:border-white/20"
      style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
    >
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
          <UserAvatar
            avatarUrl={post.author_profile?.avatar_url}
            displayName={!post.is_anonymous && post.author_profile?.display_name ? post.author_profile.display_name : post.anonymous_name}
            size="sm"
            onClick={!post.is_anonymous && post.author_id ? () => onNavigate(`/profile/${post.author_id}`) : undefined}
          />
          <div>
            <span
              className={`text-sm font-semibold text-foreground ${!post.is_anonymous && post.author_id ? "cursor-pointer hover:underline" : ""}`}
              onClick={() => { if (!post.is_anonymous && post.author_id) onNavigate(`/profile/${post.author_id}`); }}
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
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-foreground/90 text-sm leading-relaxed mb-3 whitespace-pre-wrap break-words">{post.content}</p>

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
      <div className="flex flex-wrap gap-1.5 mb-3">
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
        <span>❤️ {formatCount(post.likes_count)} likes</span>
        {(post.views_count ?? 0) > 0 && <span>👁 {formatCount(post.views_count!)} views</span>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-white/5 pt-3">
        <motion.button
          onClick={() => onToggleLike(post.id)}
          whileTap={{ scale: 1.3 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm transition-all ${isLiked ? "text-red-400" : "text-muted-foreground hover:text-red-400 hover:bg-white/5"}`}
        >
          <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
          <span className="text-xs">{post.likes_count}</span>
        </motion.button>
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
  );
};

export default PostCard;
