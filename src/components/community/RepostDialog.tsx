import { useState } from "react";
import { Repeat2, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "@/components/UserAvatar";
import type { Post } from "./PostCard";

interface RepostDialogProps {
  post: Post;
  open: boolean;
  onClose: () => void;
  onRepost: (quoteContent?: string) => void;
  userName: string;
}

const RepostDialog = ({ post, open, onClose, onRepost, userName }: RepostDialogProps) => {
  const [quote, setQuote] = useState("");
  const [mode, setMode] = useState<"choose" | "quote">("choose");

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-white/15 p-5 shadow-2xl"
          style={{ background: "linear-gradient(135deg, rgba(30,30,30,0.98) 0%, rgba(20,20,20,0.98) 100%)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Repeat2 className="w-4 h-4 text-emerald-400" /> Repost
            </h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {mode === "choose" ? (
            <div className="space-y-2">
              <button
                onClick={() => { onRepost(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <Repeat2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">Repost</p>
                  <p className="text-xs text-muted-foreground">Share to your followers instantly</p>
                </div>
              </button>
              <button
                onClick={() => setMode("quote")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <Send className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">Quote Repost</p>
                  <p className="text-xs text-muted-foreground">Add your thoughts before sharing</p>
                </div>
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2 mb-3">
                <UserAvatar displayName={userName} size="sm" />
                <textarea
                  value={quote}
                  onChange={(e) => { if (e.target.value.length <= 5000) setQuote(e.target.value); }}
                  placeholder="Add your thoughts..."
                  rows={3}
                  autoFocus
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none"
                />
              </div>
              {/* Preview of original */}
              <div className="p-3 rounded-xl border border-white/10 mb-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <UserAvatar
                    avatarUrl={post.author_profile?.avatar_url}
                    displayName={post.anonymous_name}
                    size="xs"
                  />
                  <span className="text-xs font-medium text-foreground/70">{post.author_profile?.display_name || post.anonymous_name}</span>
                </div>
                <p className="text-xs text-foreground/60 line-clamp-3">{post.content}</p>
              </div>
              <button
                onClick={() => { onRepost(quote.trim() || undefined); onClose(); }}
                className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
              >
                Repost
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RepostDialog;
