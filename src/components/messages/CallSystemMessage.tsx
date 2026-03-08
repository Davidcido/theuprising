import { Phone, Video, PhoneOff, PhoneMissed } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Props = {
  content: string;
  createdAt: string;
};

const CallSystemMessage = ({ content, createdAt }: Props) => {
  const isVideo = content.includes("📹") || content.toLowerCase().includes("video");
  const isMissed = content.toLowerCase().includes("missed");
  const isEnded = content.toLowerCase().includes("ended");

  const Icon = isVideo ? Video : isMissed ? PhoneMissed : isEnded ? PhoneOff : Phone;
  const iconColor = isMissed ? "text-red-400" : "text-emerald-400";

  return (
    <div className="flex justify-center my-3">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 max-w-[85%]">
        <Icon className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
        <span className="text-xs text-muted-foreground">{content}</span>
        <span className="text-[10px] text-muted-foreground/50 ml-1">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

export default CallSystemMessage;
