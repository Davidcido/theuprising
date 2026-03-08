import { useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker as FrimoussePicker } from "frimousse";

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
        className="w-[320px] p-0 bg-background/95 backdrop-blur-xl border-white/15 overflow-hidden"
        side="top"
        align="start"
      >
        <FrimoussePicker.Root
          className="flex flex-col h-[350px]"
          onEmojiSelect={(emoji) => {
            onSelect(emoji.emoji);
            setOpen(false);
          }}
        >
          <FrimoussePicker.Search
            className="w-full px-3 py-2.5 text-sm bg-transparent border-b border-white/10 text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            placeholder="Search emojis..."
          />
          <FrimoussePicker.Viewport className="flex-1 overflow-y-auto p-1">
            <FrimoussePicker.Loading className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Loading emojis…
            </FrimoussePicker.Loading>
            <FrimoussePicker.Empty className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No emoji found
            </FrimoussePicker.Empty>
            <FrimoussePicker.Row className="flex gap-0.5">
              {({ emoji }) => (
                <FrimoussePicker.Emoji
                  emoji={emoji}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition-colors text-xl cursor-pointer"
                >
                  {emoji.emoji}
                </FrimoussePicker.Emoji>
              )}
            </FrimoussePicker.Row>
            <FrimoussePicker.CategoryHeader className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur-sm">
              {({ category }) => <span>{category}</span>}
            </FrimoussePicker.CategoryHeader>
          </FrimoussePicker.Viewport>
        </FrimoussePicker.Root>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
