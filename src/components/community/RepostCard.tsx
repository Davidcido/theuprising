import { motion } from "framer-motion";
import { Repeat2 } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import type { Post } from "./PostCard";

interface RepostCardProps {
  reposterName: string;
  reposterAvatarUrl?: string;
  quoteContent?: string | null;
  originalPost: Post;
  createdAt: string;
  onNavigate: (path: string) => void;
}

const formatTime = (ts: string) => {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ts; }
};

const RepostCard = ({ reposterName, quoteContent, originalPost, createdAt, onNavigate }: RepostCardProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-5 rounded-2xl backdrop-blur-xl border border-white/10 transition-colors hover:border-white/20"
      style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
    >
      {/* Repost header */}
      <div className="flex items-center gap-2 mb-3 text-emerald-400/70 text-xs">
        <Repeat2 className="w-3.5 h-3.5" />
        <span className="font-medium">{reposterName} reposted</span>
        <span className="text-muted-foreground">· {formatTime(createdAt)}</span>
      </div>

      {/* Quote content */}
      {quoteContent && (
        <p className="text-foreground/90 text-sm leading-relaxed mb-3 whitespace-pre-wrap break-words">{quoteContent}</p>
      )}

      {/* Embedded original post */}
      <div
        className="p-4 rounded-xl border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
        style={{ background: "rgba(255,255,255,0.03)" }}
        onClick={() => onNavigate(`/community/post/${originalPost.id}`)}
      >
        <div className="flex items-center gap-2 mb-2">
          <UserAvatar
            avatarUrl={originalPost.author_profile?.avatar_url}
            displayName={!originalPost.is_anonymous && originalPost.author_profile?.display_name ? originalPost.author_profile.display_name : originalPost.anonymous_name}
            size="xs"
          />
          <span className="text-xs font-semibold text-foreground/80">
            {!originalPost.is_anonymous && originalPost.author_profile?.display_name
              ? originalPost.author_profile.display_name
              : originalPost.anonymous_name}
          </span>
          <span className="text-[10px] text-muted-foreground">· {formatTime(originalPost.created_at)}</span>
        </div>
        <p className="text-foreground/70 text-xs leading-relaxed whitespace-pre-wrap break-words line-clamp-4">
          {originalPost.content}
        </p>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground/60">
          <span>❤️ {originalPost.likes_count}</span>
          <span>💬 {originalPost.comments_count}</span>
          <span>🔁 {originalPost.shares_count}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default RepostCard;
