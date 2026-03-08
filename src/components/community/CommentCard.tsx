import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Check, X, Flag, Reply, ChevronDown, ChevronUp, Send } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import EmojiPicker from "@/components/EmojiPicker";
import CommentReactions from "@/components/community/CommentReactions";
import MediaGallery from "@/components/community/MediaGallery";

export type Comment = {
  id: string;
  post_id: string;
  content: string;
  anonymous_name: string;
  author_id?: string | null;
  parent_comment_id?: string | null;
  created_at: string;
  media_url?: string | null;
};

interface CommentCardProps {
  comment: Comment;
  replies: Comment[];
  currentUserId?: string;
  currentUserName?: string;
  communityOpen: boolean;
  depth?: number;
  onDelete: (commentId: string) => void;
  onUpdate: (commentId: string, newContent: string) => void;
  onReply: (postId: string, content: string, parentCommentId: string, parentAuthorId?: string | null) => void;
  allComments: Comment[];
  commentReactionCounts: Record<string, Record<string, number>>;
  myCommentReactions: Set<string>;
  onToggleCommentReaction: (commentId: string, emoji: string) => void;
}

const formatTime = (ts: string) => {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ts; }
};

const CommentCard = ({
  comment, replies, currentUserId, currentUserName, communityOpen, depth = 0,
  onDelete, onUpdate, onReply, allComments,
  commentReactionCounts, myCommentReactions, onToggleCommentReaction,
}: CommentCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [showReplies, setShowReplies] = useState(depth < 2);
  const navigate = useNavigate();

  const isOwner = currentUserId && comment.author_id === currentUserId;
  const maxDepthIndent = Math.min(depth, 3);

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    const { error } = await supabase
      .from("community_comments")
      .update({ content: editContent.trim() })
      .eq("id", comment.id);
    if (error) {
      toast({ title: "Error", description: "Could not update comment", variant: "destructive" });
    } else {
      onUpdate(comment.id, editContent.trim());
      setEditing(false);
    }
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("community_comments")
      .delete()
      .eq("id", comment.id);
    if (!error) {
      onDelete(comment.id);
      toast({ title: "Comment deleted" });
    }
    setMenuOpen(false);
  };

  const handleReport = async () => {
    const sessionId = localStorage.getItem("uprising_session_id") || "anon";
    await supabase.from("reported_content").insert({
      content_id: comment.id,
      content_type: "comment",
      reporter_session_id: sessionId,
      reason: "Reported by user",
    });
    toast({ title: "Comment reported", description: "Thank you for keeping the community safe." });
    setMenuOpen(false);
  };

  const handleReplySubmit = () => {
    if (!replyContent.trim()) return;
    onReply(comment.post_id, replyContent.trim(), comment.id, comment.author_id);
    setReplyContent("");
    setReplying(false);
    setShowReplies(true);
  };

  const startReply = () => {
    setReplying(true);
    setReplyContent(`@${comment.anonymous_name} `);
  };

  const directReplies = allComments.filter(c => c.parent_comment_id === comment.id);

  return (
    <div style={{ marginLeft: maxDepthIndent > 0 ? `${maxDepthIndent * 16}px` : undefined }}>
      <div className="flex gap-2.5 group relative">
        {depth > 0 && (
          <div className="absolute -left-3 top-0 bottom-0 w-px bg-white/10" />
        )}

        <UserAvatar
          displayName={comment.anonymous_name}
          size="xs"
          onClick={comment.author_id ? () => navigate(`/profile/${comment.author_id}`) : undefined}
        />
        <div className="flex-1">
          <div
            className="px-3 py-2.5 rounded-xl"
            style={{ background: "#1F6B45", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold text-white ${comment.author_id ? "cursor-pointer hover:underline" : ""}`}
                  onClick={() => { if (comment.author_id) navigate(`/profile/${comment.author_id}`); }}
                >
                  {comment.anonymous_name}
                </span>
                <span className="text-[10px] text-white/40">{formatTime(comment.created_at)}</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="w-3.5 h-3.5 text-white/50" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-6 z-50 bg-card border border-white/15 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                      {isOwner && (
                        <>
                          <button
                            onClick={() => { setEditing(true); setMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-white hover:bg-white/10 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit Comment
                          </button>
                          <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-red-400 hover:bg-white/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Comment
                          </button>
                        </>
                      )}
                      {currentUserId && (
                        <button
                          onClick={handleReport}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-yellow-400 hover:bg-white/10 transition-colors"
                        >
                          <Flag className="w-3.5 h-3.5" /> Report Comment
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {editing ? (
              <div className="mt-1.5">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full text-xs text-white bg-white/10 border border-white/15 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none"
                  rows={2}
                />
                <div className="flex gap-2 mt-1.5">
                  <button onClick={handleSaveEdit} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30">
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button onClick={() => { setEditing(false); setEditContent(comment.content); }} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/10 text-white/60 text-xs hover:bg-white/15">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-white/85 mt-1 break-words leading-relaxed">{comment.content}</p>
                {comment.media_url && (
                  <div className="mt-2">
                    <MediaGallery mediaUrls={[comment.media_url]} compact />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Comment Reactions */}
          <CommentReactions
            commentId={comment.id}
            reactionCounts={commentReactionCounts[comment.id] || {}}
            myReactions={myCommentReactions}
            onToggle={onToggleCommentReaction}
          />

          {/* Reply button */}
          {communityOpen && !editing && (
            <div className="flex items-center gap-3 mt-1 ml-1">
              <button
                onClick={startReply}
                className="flex items-center gap-1 text-[10px] text-white/40 hover:text-emerald-400 transition-colors"
              >
                <Reply className="w-3 h-3" /> Reply
              </button>
              {directReplies.length > 0 && (
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/60 transition-colors"
                >
                  {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {directReplies.length} {directReplies.length === 1 ? "reply" : "replies"}
                </button>
              )}
            </div>
          )}

          {/* Reply input */}
          {replying && (
            <div className="flex gap-2 mt-2 items-end ml-1">
              <EmojiPicker
                onSelect={(emoji) => setReplyContent(prev => prev + emoji)}
                className="p-1 shrink-0"
              />
              <textarea
                value={replyContent}
                onChange={(e) => {
                  if (e.target.value.length <= 5000) setReplyContent(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReplySubmit();
                  }
                }}
                autoFocus
                placeholder="Write a reply..."
                rows={1}
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none overflow-hidden"
                style={{ minHeight: "28px" }}
              />
              <button
                onClick={handleReplySubmit}
                disabled={!replyContent.trim()}
                className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 transition-colors shrink-0"
              >
                <Send className="w-3 h-3" />
              </button>
              <button
                onClick={() => { setReplying(false); setReplyContent(""); }}
                className="p-1.5 rounded-full bg-white/10 text-white/40 hover:bg-white/15 transition-colors shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Nested replies */}
          {showReplies && directReplies.length > 0 && (
            <div className="mt-2 space-y-2">
              {directReplies.map(reply => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  replies={allComments.filter(c => c.parent_comment_id === reply.id)}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  communityOpen={communityOpen}
                  depth={depth + 1}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onReply={onReply}
                  allComments={allComments}
                  commentReactionCounts={commentReactionCounts}
                  myCommentReactions={myCommentReactions}
                  onToggleCommentReaction={onToggleCommentReaction}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentCard;
