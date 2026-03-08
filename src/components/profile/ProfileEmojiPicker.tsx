import { useState } from "react";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

const EMOJI_CATEGORIES = [
  {
    label: "Nature",
    emojis: ["🌱", "🌿", "🍀", "🌳", "🌻", "🌼", "🌸", "🍃", "🌴", "🌾", "🌺"],
  },
  {
    label: "Animals",
    emojis: ["🐶", "🐱", "🐻", "🦊", "🐼", "🐯", "🦁", "🐨", "🐸", "🐵", "🐧", "🦋", "🐬"],
  },
  {
    label: "Positive Energy",
    emojis: ["⭐", "✨", "🌟", "💫", "⚡", "🔥", "💎"],
  },
  {
    label: "Peace & Healing",
    emojis: ["🕊️", "🌙", "☀️", "🌈", "💧", "🌊", "🍃", "🌼"],
  },
  {
    label: "Hearts",
    emojis: ["❤️", "💙", "💚", "💜", "🧡", "💛", "🤍", "🖤", "💖", "💗", "💓"],
  },
  {
    label: "Achievement",
    emojis: ["🏆", "🎯", "🚀", "👑", "💡", "🛡️"],
  },
];

interface ProfileEmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onUploadClick: () => void;
}

const ProfileEmojiPicker = ({ onSelectEmoji, onUploadClick }: ProfileEmojiPickerProps) => {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-4 rounded-2xl border border-white/15 backdrop-blur-xl"
      style={{ background: "rgba(15, 81, 50, 0.9)" }}
    >
      {/* Category tabs - horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveCategory(i)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              activeCategory === i
                ? "bg-primary text-primary-foreground"
                : "bg-white/10 text-muted-foreground hover:bg-white/20"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Emoji grid - horizontal scroll on mobile */}
      <div className="flex flex-wrap gap-2 mb-3 max-h-32 overflow-y-auto overflow-x-auto scrollbar-hide">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            onClick={() => onSelectEmoji(emoji)}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl transition-colors shrink-0"
          >
            {emoji}
          </button>
        ))}
      </div>

      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onUploadClick}>
        <Camera className="w-4 h-4 mr-1" /> Upload Image
      </Button>
    </motion.div>
  );
};

export default ProfileEmojiPicker;
