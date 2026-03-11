import { useRef, useCallback } from "react";
import { Send, Paperclip } from "lucide-react";
import EmojiPicker from "@/components/EmojiPicker";
import FeatureMenu, { type ChatMode } from "./FeatureMenu";
import FilePreview, { type ChatAttachment } from "./FilePreview";

type ChatInputProps = {
  input: string;
  setInput: (v: string) => void;
  isTyping: boolean;
  onSend: () => void;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  attachments: ChatAttachment[];
  onAttachmentsChange: (atts: ChatAttachment[]) => void;
};

const ACCEPTED_TYPES = "image/jpeg,image/png,image/gif,image/webp,.txt,.pdf,.md";

const ChatInput = ({
  input, setInput, isTyping, onSend,
  mode, onModeChange,
  attachments, onAttachmentsChange,
}: ChatInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newAtts: ChatAttachment[] = [];
    
    Array.from(files).slice(0, 4).forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          onAttachmentsChange([...attachments, ...newAtts, {
            file,
            preview: reader.result as string,
            type: "image",
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        newAtts.push({ file, type: "document" });
        onAttachmentsChange([...attachments, ...newAtts]);
      }
    });
  }, [attachments, onAttachmentsChange]);

  return (
    <div
      className="shrink-0 py-3 backdrop-blur-xl border-t border-white/10"
      style={{
        background: "rgba(15, 81, 50, 0.4)",
        paddingLeft: "8px",
        paddingRight: "12px",
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="w-full max-w-2xl mx-auto">
        <FilePreview
          attachments={attachments}
          onRemove={(i) => onAttachmentsChange(attachments.filter((_, idx) => idx !== i))}
        />
        <form
          onSubmit={(e) => { e.preventDefault(); onSend(); }}
          className="flex items-center gap-2"
        >
          <FeatureMenu currentMode={mode} onModeChange={onModeChange} />
          
          <EmojiPicker onSelect={(emoji) => {
            setInput(input + emoji);
            inputRef.current?.focus();
          }} />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share what's on your mind..."
            className="flex-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            style={{ fontSize: "16px" }}
          />
          <button
            type="submit"
            disabled={(!input.trim() && attachments.length === 0) || isTyping}
            className="rounded-2xl px-4 py-3 text-white hover:opacity-90 transition-opacity disabled:opacity-40 shadow-lg"
            style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInput;
