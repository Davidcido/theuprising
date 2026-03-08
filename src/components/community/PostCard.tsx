import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, Send, ChevronDown, ChevronUp, Flag, MoreHorizontal } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import EmojiPicker from "@/components/EmojiPicker";
import CommentCard from "@/components/community/CommentCard";

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
  created_at: string;
  author_id?: string | null;
  is_anonymous?: boolean;
  engagement_score?: number;
  author_profile?: { display_name: string | null; avatar_url: string } | null;
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
  communityOpen: boolean;
  reportMenuPost: string | null;
  onToggleLike: (postId: string) => void;
  onToggleReaction: (postId: string, emoji: string) => void;
  onToggleComments: (postId: string) => void;
  onShare: (post: Post) => void;
  onReport: (postId: string) => void;
  onSetReportMenu: (postId: string | null) => void;
  onCommentInputChange: (postId: string, value: string) => void;
  onAddComment: (postId: string) => void;
  onCommentDelete: (postId: string, commentId: string) => void;
  onCommentUpdate: (postId: string, commentId: string, content: string) => void;
  onNavigate: (path: string) => void;
}

const formatTime = (ts: string) => {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ts; }
};

const PostCard = ({
  post, isLiked, isExpanded, postComments, reactionCounts, myReactions,
  commentInput, currentUserId, communityOpen, reportMenuPost,
  onToggleLike, onToggleReaction, onToggleComments, onShare, onReport,
  onSetReportMenu, onCommentInputChange, onAddComment, onCommentDelete,
  onCommentUpdate, onNavigate,
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

      {/* Emoji Reactions */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {REACTION_EMOJIS.map(({ emoji, label }) => {
          const count = reactionCounts[emoji] || 0;
          const isMine = myReactions.has(`${post.id}:${emoji}`);
          return (
            <button
              key={emoji}
              onClick={() => onToggleReaction(post.id, emoji)}
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
          onClick={() => onToggleLike(post.id)}
          className={`inline-flex items-center gap-1.5 text-sm transition-all hover:scale-105 ${isLiked ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
        >
          <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
          <span>{post.likes_count}</span>
        </button>
        <button
          onClick={() => onToggleComments(post.id)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-blue-400 transition-all hover:scale-105"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.comments_count}</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <button
          onClick={() => onShare(post)}
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
            <div className="mt-4 pt-3 border-t border-white/5 space-y-2.5">
              {postComments.map((c) => (
                <CommentCard
                  key={c.id}
                  comment={c}
                  currentUserId={currentUserId}
                  onDelete={(commentId) => onCommentDelete(post.id, commentId)}
                  onUpdate={(commentId, newContent) => onCommentUpdate(post.id, commentId, newContent)}
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
