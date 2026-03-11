import { useState, useRef, useEffect } from "react";
import { Copy, Pencil, Trash2, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type MessageActionsProps = {
  content: string;
  isUser: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

const MessageActions = ({ content, isUser, onEdit, onDelete }: MessageActionsProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-white/10"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute ${isUser ? "right-0" : "left-0"} bottom-full mb-1 bg-card/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-xl overflow-hidden z-20 min-w-[130px]`}
          >
            <button onClick={handleCopy} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground/80 hover:bg-white/10 transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
            {isUser && onEdit && (
              <button onClick={() => { onEdit(); setOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground/80 hover:bg-white/10 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {onDelete && (
              <button onClick={() => { onDelete(); setOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageActions;
