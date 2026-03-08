import { useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Play, Pause, CornerDownRight } from "lucide-react";
import type { DirectMessage } from "@/hooks/useConversations";

type Props = {
  msg: DirectMessage;
  isMine: boolean;
  replyMessage?: DirectMessage | null;
  onSwipeReply: (msg: DirectMessage) => void;
  onScrollToMessage?: (id: string) => void;
};

const ChatBubble = ({ msg, isMine, replyMessage, onSwipeReply, onScrollToMessage }: Props) => {
  const msgAny = msg as any;
  const touchStartX = useRef(0);
  const dragStartX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement>(null);

  // Touch handlers for swipe-to-reply
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff > 0) setOffsetX(Math.min(diff, 80));
  };
  const handleTouchEnd = () => {
    if (offsetX > 50) onSwipeReply(msg);
    setOffsetX(0);
  };

  // Mouse drag for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    const onMove = (ev: MouseEvent) => {
      const diff = ev.clientX - dragStartX.current;
      if (diff > 0) setOffsetX(Math.min(diff, 80));
    };
    const onUp = () => {
      if (offsetX > 50) onSwipeReply(msg);
      setOffsetX(0);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioLoaded = () => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      const secs = Math.round(audioRef.current.duration);
      setAudioDuration(`${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`);
    }
  };

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} select-none`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      style={{ transform: `translateX(${offsetX}px)`, transition: offsetX === 0 ? "transform 0.2s" : "none" }}
      id={`msg-${msg.id}`}
    >
      {offsetX > 20 && (
        <div className="flex items-center mr-2 text-emerald-400/60">
          <CornerDownRight className="w-4 h-4" />
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
          isMine
            ? "bg-emerald-600/40 text-white rounded-br-md"
            : "bg-white/10 text-foreground rounded-bl-md"
        }`}
      >
        {/* Reply preview */}
        {replyMessage && (
          <button
            onClick={() => onScrollToMessage?.(replyMessage.id)}
            className="flex items-start gap-1.5 mb-2 p-2 rounded-lg bg-white/5 border-l-2 border-emerald-400/60 text-left w-full"
          >
            <CornerDownRight className="w-3 h-3 mt-0.5 text-emerald-400/60 shrink-0" />
            <span className="text-xs text-white/50 line-clamp-2">{replyMessage.content}</span>
          </button>
        )}

        {/* Image attachment */}
        {msgAny.attachment_url && msgAny.attachment_type === "image" && (
          <img
            src={msgAny.attachment_url}
            alt="Shared image"
            className="rounded-xl max-w-full mb-2 cursor-pointer hover:opacity-90"
            onClick={() => window.open(msgAny.attachment_url, "_blank")}
          />
        )}

        {/* Audio attachment */}
        {msgAny.attachment_url && msgAny.attachment_type === "audio" && (
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={toggleAudio}
              className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
            </button>
            <div className="flex-1">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full w-0" />
              </div>
              <span className="text-[10px] text-white/40 mt-0.5 block">
                🎤 Voice message {audioDuration ? `(${audioDuration})` : ""}
              </span>
            </div>
            <audio
              ref={audioRef}
              src={msgAny.attachment_url}
              onLoadedMetadata={handleAudioLoaded}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )}

        {/* Text content */}
        {!(msgAny.attachment_url && (msg.content === "📷 Image" || msg.content === "🎤 Voice note")) && (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        )}
        <p className={`text-[10px] mt-1 ${isMine ? "text-white/40" : "text-muted-foreground/60"}`}>
          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};

export default ChatBubble;
