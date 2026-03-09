import { useState, useRef, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Volume2, VolumeX, Maximize } from "lucide-react";
import { Play, Pause, CornerDownRight, Pencil, Trash2, EyeOff, SmilePlus, Check, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker as FrimoussePicker } from "frimousse";
import type { DirectMessage } from "@/hooks/useConversations";
import type { GroupedReaction } from "@/hooks/useMessageReactions";

type Props = {
  msg: DirectMessage;
  isMine: boolean;
  replyMessage?: DirectMessage | null;
  onSwipeReply: (msg: DirectMessage) => void;
  onScrollToMessage?: (id: string) => void;
  onEditMessage?: (msg: DirectMessage) => void;
  onDeleteForMe?: (msg: DirectMessage) => void;
  onDeleteForEveryone?: (msg: DirectMessage) => void;
  onReact?: (messageId: string, emoji: string) => void;
  reactions?: GroupedReaction[];
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onLongPressSelect?: () => void;
};

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const ChatVideoPlayer = ({ url }: { url: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [thumbnail, setThumbnail] = useState("");

  // Generate thumbnail
  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => { video.currentTime = 1; };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (ctx) { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); setThumbnail(canvas.toDataURL("image/jpeg", 0.7)); }
      } catch {}
    };
    video.onerror = () => {};
    video.src = url;
  }, [url]);

  // Lazy load + auto-pause on scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        } else if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().then(() => setPlaying(true)).catch(() => {}); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) { videoRef.current.muted = !videoRef.current.muted; setMuted(videoRef.current.muted); }
  };

  return (
    <div ref={containerRef} className="relative rounded-xl overflow-hidden mb-2 max-w-[280px]">
      {visible ? (
        <>
          <video
            ref={videoRef}
            src={url}
            className="w-full rounded-xl cursor-pointer"
            playsInline
            muted={muted}
            preload="metadata"
            onClick={togglePlay}
            onEnded={() => setPlaying(false)}
          />
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer" onClick={togglePlay}>
              <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
              </div>
            </div>
          )}
          {playing && (
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <button onClick={toggleMute} className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
                {muted ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="w-full aspect-video bg-white/5 flex items-center justify-center rounded-xl">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full rounded-xl" />
          ) : (
            <Play className="w-8 h-8 text-white/30" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ChatBubble = ({ msg, isMine, replyMessage, onSwipeReply, onScrollToMessage, onEditMessage, onDeleteForMe, onDeleteForEveryone, onReact, reactions = [], selectionMode, isSelected, onSelect, onLongPressSelect }: Props) => {
  const msgAny = msg as any;
  const touchStartX = useRef(0);
  const dragStartX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<string>("");
  const [audioProgress, setAudioProgress] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showMenu, setShowMenu] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
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
    if (selectionMode) return;
    if (!isDeletedForEveryone) {
      longPressRef.current = setTimeout(() => {
        onLongPressSelect ? onLongPressSelect() : setShowMenu(true);
      }, 500);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
    if (selectionMode) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff > 0) setOffsetX(Math.min(diff, 80));
  };
  const handleTouchEnd = () => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
    if (selectionMode) return;
    if (offsetX > 50) onSwipeReply(msg);
    setOffsetX(0);
  };

  // Mouse drag for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectionMode) return;
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

  // Right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    if (selectionMode) return;
    if (!isDeletedForEveryone) {
      e.preventDefault();
      setShowMenu(true);
    }
  };

  // Click handler for selection mode
  const handleClick = () => {
    if (selectionMode && onSelect) {
      onSelect();
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

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
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

  const handleQuickReact = (emoji: string) => {
    onReact?.(msg.id, emoji);
    setShowMenu(false);
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
      className={`flex ${isMine ? "justify-end" : "justify-start"} select-none relative ${selectionMode ? "cursor-pointer" : ""} ${isSelected ? "bg-emerald-500/10 rounded-xl -mx-2 px-2 py-1" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      style={{ transform: `translateX(${offsetX}px)`, transition: offsetX === 0 ? "transform 0.2s" : "none" }}
      id={`msg-${msg.id}`}
    >
      {offsetX > 20 && (
        <div className="flex items-center mr-2 text-emerald-400/60">
          <CornerDownRight className="w-4 h-4" />
        </div>
      )}
      <div className="flex flex-col">
        <div
          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm relative ${
            isMine
              ? "bg-emerald-600/40 text-white rounded-br-md ml-auto"
              : "bg-white/10 text-foreground rounded-bl-md"
          }`}
        >
          {/* Context menu with quick reactions */}
          {showMenu && (
            <div
              ref={menuRef}
              className="absolute z-50 bottom-full mb-1 right-0 bg-[#0F5132] border border-white/15 rounded-xl shadow-xl overflow-hidden min-w-[200px]"
            >
              {/* Quick reaction bar */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleQuickReact(emoji)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
                <Popover open={showFullPicker} onOpenChange={setShowFullPicker}>
                  <PopoverTrigger asChild>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors">
                      <SmilePlus className="w-4 h-4 text-white/50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[300px] p-0 bg-background/95 backdrop-blur-xl border-white/15 overflow-hidden"
                    side="top"
                    align="end"
                  >
                    <FrimoussePicker.Root
                      className="flex flex-col h-[300px]"
                      onEmojiSelect={(emoji) => {
                        handleQuickReact(emoji.emoji);
                        setShowFullPicker(false);
                      }}
                    >
                      <FrimoussePicker.Search
                        className="w-full px-3 py-2 text-sm bg-transparent border-b border-white/10 text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                        placeholder="Search emojis..."
                      />
                      <FrimoussePicker.Viewport className="flex-1 overflow-y-auto p-1">
                        <FrimoussePicker.Loading className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          Loading…
                        </FrimoussePicker.Loading>
                        <FrimoussePicker.Empty className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          No emoji found
                        </FrimoussePicker.Empty>
                        <FrimoussePicker.List
                          className="select-none"
                          components={{
                            CategoryHeader: ({ category, ...props }) => (
                              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur-sm" {...props}>
                                {category.label}
                              </div>
                            ),
                            Row: (props) => <div className="flex gap-0.5" {...props} />,
                            Emoji: ({ emoji, ...props }) => (
                              <button className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/10 transition-colors text-lg cursor-pointer" {...props}>
                                {emoji.emoji}
                              </button>
                            ),
                          }}
                        />
                      </FrimoussePicker.Viewport>
                    </FrimoussePicker.Root>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Action items */}
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

          {/* Video attachment */}
          {msgAny.attachment_url && msgAny.attachment_type === "video" && (
            <ChatVideoPlayer url={msgAny.attachment_url} />
          )}

          {/* Audio attachment */}
          {msgAny.attachment_url && msgAny.attachment_type === "audio" && (
            <div className="flex items-center gap-2 mb-1 min-w-[200px]">
              <button
                onClick={toggleAudio}
                className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-foreground" /> : <Play className="w-3.5 h-3.5 text-foreground ml-0.5" />}
              </button>
              <div className="flex-1">
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-[width] duration-100"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  🎤 {audioDuration || "0:00"}
                </span>
              </div>
              <button
                onClick={cyclePlaybackRate}
                className="px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-[10px] font-semibold text-muted-foreground shrink-0"
              >
                {playbackRate}x
              </button>
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
          <div className="flex items-center gap-1.5 mt-1 justify-end">
            {isEdited && (
              <span className={`text-[10px] italic ${isMine ? "text-white/30" : "text-muted-foreground/50"}`}>(edited)</span>
            )}
            <p className={`text-[10px] ${isMine ? "text-white/40" : "text-muted-foreground/60"}`}>
              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
            </p>
            {isMine && (
              msg.read
                ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                : <Check className="w-3.5 h-3.5 text-white/30" />
            )}
          </div>
        </div>

        {/* Reactions display */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact?.(msg.id, r.emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                  r.userReacted
                    ? "bg-emerald-500/30 border border-emerald-500/40"
                    : "bg-white/10 border border-white/10 hover:bg-white/15"
                }`}
              >
                <span className="text-sm">{r.emoji}</span>
                {r.count > 1 && <span className="text-[10px] text-white/60">{r.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
