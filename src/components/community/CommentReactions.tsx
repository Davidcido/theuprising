import { motion } from "framer-motion";

const COMMENT_REACTION_EMOJIS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "😮", label: "Wow" },
];

interface CommentReactionsProps {
  commentId: string;
  reactionCounts: Record<string, number>;
  myReactions: Set<string>;
  onToggle: (commentId: string, emoji: string) => void;
}

const CommentReactions = ({ commentId, reactionCounts, myReactions, onToggle }: CommentReactionsProps) => {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {COMMENT_REACTION_EMOJIS.map(({ emoji, label }) => {
        const count = reactionCounts[emoji] || 0;
        const isMine = myReactions.has(`${commentId}:${emoji}`);
        return (
          <motion.button
            key={emoji}
            onClick={() => onToggle(commentId, emoji)}
            title={label}
            whileTap={{ scale: 0.85 }}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] transition-all border ${
              isMine
                ? "bg-emerald-500/20 border-emerald-500/40 text-foreground"
                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </motion.button>
        );
      })}
    </div>
  );
};

export default CommentReactions;
export { COMMENT_REACTION_EMOJIS };
