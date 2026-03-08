import { X, CornerDownRight } from "lucide-react";
import type { DirectMessage } from "@/hooks/useConversations";

type Props = {
  message: DirectMessage;
  onCancel: () => void;
};

const ReplyPreview = ({ message, onCancel }: Props) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-l-2 border-emerald-400 rounded-lg mx-1 mb-2">
    <CornerDownRight className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
    <div className="flex-1 min-w-0">
      <span className="text-[10px] text-emerald-400/70 font-medium">Replying to</span>
      <p className="text-xs text-white/60 truncate">{message.content}</p>
    </div>
    <button onClick={onCancel} className="p-1 rounded-full hover:bg-white/10">
      <X className="w-3.5 h-3.5 text-white/40" />
    </button>
  </div>
);

export default ReplyPreview;
