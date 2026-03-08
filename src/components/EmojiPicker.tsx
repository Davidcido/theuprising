import { useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const EMOJI_CATEGORIES = [
  { label: "Smileys", emojis: ["😊", "😄", "😂", "🥰", "😍", "🤗", "😎", "🥺", "😢", "😭", "😤", "😡", "🤔", "😴", "🤯"] },
  { label: "Gestures", emojis: ["👍", "👎", "👏", "🙌", "🤝", "✊", "💪", "🙏", "✌️", "🤞", "👋", "🫶"] },
  { label: "Hearts", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💕", "💖", "💗", "💝"] },
  { label: "Nature", emojis: ["🌟", "⭐", "🔥", "🌈", "☀️", "🌙", "🌸", "🍀", "🌊", "🦋"] },
  { label: "Symbols", emojis: ["💯", "✨", "🎉", "🎊", "🏆", "🥇", "💎", "🕊️", "🫂", "💐"] },
];

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  className?: string;
};

const EmojiPicker = ({ onSelect, className = "" }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors ${className}`}
        >
          <Smile className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-2 bg-background/95 backdrop-blur-xl border-white/15"
        side="top"
        align="start"
      >
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {EMOJI_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                {cat.label}
              </p>
              <div className="flex flex-wrap gap-0.5">
                {cat.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSelect(emoji);
                      setOpen(false);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
