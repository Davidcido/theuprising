import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Check, X, Flag } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type Comment = {
  id: string;
  post_id: string;
  content: string;
  anonymous_name: string;
  author_id?: string | null;
  created_at: string;
};

interface CommentCardProps {
  comment: Comment;
  currentUserId?: string;
  onDelete: (commentId: string) => void;
  onUpdate: (commentId: string, newContent: string) => void;
}

const CommentCard = ({ comment, currentUserId, onDelete, onUpdate }: CommentCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [reporting, setReporting] = useState(false);
  const navigate = useNavigate();

  const isOwner = currentUserId && comment.author_id === currentUserId;

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
    setReporting(false);
    setMenuOpen(false);
  };

  const formatTime = (ts: string) => {
    try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ts; }
  };

  return (
    <div className="flex gap-2.5 pl-2 group relative">
      <UserAvatar
        displayName={comment.anonymous_name}
        size="xs"
        onClick={comment.author_id ? () => navigate(`/profile/${comment.author_id}`) : undefined}
      />
      <div
        className="flex-1 px-3 py-2.5 rounded-xl"
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

          {/* 3-dot menu */}
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
                <div className="absolute right-0 top-6 z-50 bg-[#0F5132] border border-white/15 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
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
          <p className="text-xs text-white/85 mt-1 break-words leading-relaxed">{comment.content}</p>
        )}
      </div>
    </div>
  );
};

export default CommentCard;
