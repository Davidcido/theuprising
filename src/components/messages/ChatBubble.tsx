import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Play, Pause, CornerDownRight, Pencil, Trash2, EyeOff } from "lucide-react";
import type { DirectMessage } from "@/hooks/useConversations";

type Props = {
  msg: DirectMessage;
  isMine: boolean;
  replyMessage?: DirectMessage | null;
  onSwipeReply: (msg: DirectMessage) => void;
  onScrollToMessage?: (id: string) => void;
  onEditMessage?: (msg: DirectMessage) => void;
  onDeleteForMe?: (msg: DirectMessage) => void;
  onDeleteForEveryone?: (msg: DirectMessage) => void;
};

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const ChatBubble = ({ msg, isMine, replyMessage, onSwipeReply, onScrollToMessage, onEditMessage, onDeleteForMe, onDeleteForEveryone }: Props) => {
  const msgAny = msg as any;
  const touchStartX = useRef(0);
  const dragStartX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<string>("");
  const [audioProgress, setAudioProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animRef = useRef<number>(0);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDeletedForEveryone = msgAny.deleted_for_everyone === true;
  const isEdited = !!msgAny.edited_at;
  const canEdit = isMine && !isDeletedForEveryone && !msgAny.attachment_url && (Date.now() - new Date(msg.created_at).getTime()) < EDIT_WINDOW_MS;

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  // Touch handlers for swipe-to-reply
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    if (isMine && !isDeletedForEveryone) {
      longPressRef.current = setTimeout(() => setShowMenu(true), 500);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff > 0) setOffsetX(Math.min(diff, 80));
  };
  const handleTouchEnd = () => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
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

  // Right-click context menu for own messages
  const handleContextMenu = (e: React.MouseEvent) => {
    if (isMine && !isDeletedForEveryone) {
      e.preventDefault();
      setShowMenu(true);
    }
  };

  const updateProgress = () => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
    if (isPlaying) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleAudioLoaded = () => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      const secs = Math.round(audioRef.current.duration);
      setAudioDuration(`${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(0);
  };

  // Deleted for everyone placeholder
  if (isDeletedForEveryone) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`} id={`msg-${msg.id}`}>
        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm italic ${
          isMine ? "bg-emerald-600/20 text-white/40 rounded-br-md" : "bg-white/5 text-white/40 rounded-bl-md"
        }`}>
          <p>🚫 This message was deleted</p>
          <p className={`text-[10px] mt-1 ${isMine ? "text-white/20" : "text-muted-foreground/40"}`}>
            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} select-none relative`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      style={{ transform: `translateX(${offsetX}px)`, transition: offsetX === 0 ? "transform 0.2s" : "none" }}
      id={`msg-${msg.id}`}
    >
      {offsetX > 20 && (
        <div className="flex items-center mr-2 text-emerald-400/60">
          <CornerDownRight className="w-4 h-4" />
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm relative ${
          isMine
            ? "bg-emerald-600/40 text-white rounded-br-md"
            : "bg-white/10 text-foreground rounded-bl-md"
        }`}
      >
        {/* Context menu */}
        {showMenu && (
          <div
            ref={menuRef}
            className="absolute z-50 bottom-full mb-1 right-0 bg-[#0F5132] border border-white/15 rounded-xl shadow-xl overflow-hidden min-w-[170px]"
          >
            {canEdit && (
              <button
                onClick={() => { setShowMenu(false); onEditMessage?.(msg); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-white/80 hover:bg-white/10 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit message
              </button>
            )}
            <button
              onClick={() => { setShowMenu(false); onDeleteForMe?.(msg); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-yellow-400 hover:bg-white/10 transition-colors"
            >
              <EyeOff className="w-3.5 h-3.5" /> Delete for me
            </button>
            {isMine && (
              <button
                onClick={() => { setShowMenu(false); onDeleteForEveryone?.(msg); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-red-400 hover:bg-white/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete for everyone
              </button>
            )}
          </div>
        )}

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
          <div className="flex items-center gap-2 mb-1 min-w-[180px]">
            <button
              onClick={toggleAudio}
              className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
            </button>
            <div className="flex-1">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-[width] duration-100"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-white/40 mt-0.5 block">
                🎤 {audioDuration || "0:00"}
              </span>
            </div>
            <audio
              ref={audioRef}
              src={msgAny.attachment_url}
              preload="metadata"
              onLoadedMetadata={handleAudioLoaded}
              onEnded={handleAudioEnded}
              className="hidden"
            />
          </div>
        )}

        {/* Text content */}
        {!(msgAny.attachment_url && (msg.content === "📷 Image" || msg.content === "🎤 Voice note")) && (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        )}
        <div className={`flex items-center gap-1.5 mt-1`}>
          {isEdited && (
            <span className={`text-[10px] italic ${isMine ? "text-white/30" : "text-muted-foreground/50"}`}>(edited)</span>
          )}
          <p className={`text-[10px] ${isMine ? "text-white/40" : "text-muted-foreground/60"}`}>
            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
