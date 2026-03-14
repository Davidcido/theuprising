import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import MemoryChoicePrompt from "./MemoryChoicePrompt";
import MessageActions from "./MessageActions";
import ImageViewer from "./ImageViewer";
import { FileText } from "lucide-react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: { type: "image" | "document"; name: string; preview?: string }[];
  edited?: boolean;
  timestamp?: number;
};

type ChatMessagesProps = {
  messages: ChatMessage[];
  isTyping: boolean;
  showMemoryChoice: boolean;
  onMemoryChoice: (enabled: boolean) => void;
  onEditMessage?: (index: number) => void;
  onDeleteMessage?: (index: number) => void;
  userAvatarUrl?: string | null;
  userDisplayName?: string | null;
  companionAvatarImage?: string;
  companionEmoji?: string;
  companionColor?: string;
  companionName?: string;
};

/* ── helpers ── */
function formatTime(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function isGrouped(messages: ChatMessage[], index: number): { isFirst: boolean; isLast: boolean; isSingle: boolean } {
  const curr = messages[index];
  const prev = index > 0 ? messages[index - 1] : null;
  const next = index < messages.length - 1 ? messages[index + 1] : null;
  const samePrev = prev?.role === curr.role;
  const sameNext = next?.role === curr.role;
  return {
    isFirst: !samePrev,
    isLast: !sameNext,
    isSingle: !samePrev && !sameNext,
  };
}

/* ── sub-components ── */
const CompanionAvatar = ({ image, emoji, color, visible }: { image?: string; emoji?: string; color?: string; visible: boolean }) => (
  <div
    className={`shrink-0 w-7 h-7 rounded-full overflow-hidden shadow-md ${visible ? "opacity-100" : "opacity-0"}`}
    style={{ background: color ? `${color}33` : "rgba(255,255,255,0.1)" }}
  >
    {image ? (
      <img src={image} alt="AI" className="w-full h-full object-cover" />
    ) : (
      <span className="flex items-center justify-center w-full h-full text-xs">{emoji || "🌿"}</span>
    )}
  </div>
);

const UserAvatar = ({ url, initial, visible }: { url?: string | null; initial: string; visible: boolean }) => (
  <div className={`shrink-0 w-7 h-7 rounded-full overflow-hidden shadow-md bg-emerald-500 flex items-center justify-center ${visible ? "opacity-100" : "opacity-0"}`}>
    {url ? (
      <img src={url} alt="You" className="w-full h-full object-cover" />
    ) : (
      <span className="text-white text-xs font-bold">{initial}</span>
    )}
  </div>
);

const Timestamp = ({ time }: { time: string }) =>
  time ? <span className="block text-[10px] text-white/30 mt-0.5 select-none">{time}</span> : null;

/* ── main component ── */
const ChatMessages = ({
  messages, isTyping, showMemoryChoice, onMemoryChoice,
  onEditMessage, onDeleteMessage,
  userAvatarUrl, userDisplayName,
  companionAvatarImage, companionEmoji, companionColor, companionName,
}: ChatMessagesProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [viewerImages, setViewerImages] = useState<string[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const c = scrollContainerRef.current;
      if (c) c.scrollTop = c.scrollHeight;
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const h = () => scrollToBottom();
    vv.addEventListener("resize", h);
    vv.addEventListener("scroll", h);
    return () => { vv.removeEventListener("resize", h); vv.removeEventListener("scroll", h); };
  }, [scrollToBottom]);

  const openImage = useCallback((imgs: string[], idx: number) => {
    setViewerImages(imgs);
    setViewerIndex(idx);
  }, []);

  const extractContentImages = (content: string): string[] => {
    const regex = /!\[.*?\]\((.*?)\)/g;
    const urls: string[] = [];
    let m;
    while ((m = regex.exec(content)) !== null) urls.push(m[1]);
    return urls;
  };

  const userInitial = (userDisplayName || "Y")[0]?.toUpperCase() || "Y";

  return (
    <>
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto overscroll-contain touch-pan-y px-3 sm:px-4 py-6"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="container mx-auto max-w-2xl flex flex-col">
          {messages.map((msg, i) => {
            const { isFirst, isLast } = isGrouped(messages, i);
            const isUser = msg.role === "user";
            const attachmentImages = msg.attachments?.filter(a => a.type === "image" && a.preview).map(a => a.preview!) || [];
            const time = isLast ? formatTime(msg.timestamp) : "";

            /* Bubble corner radii: tail on first message of group */
            const cornerClass = isUser
              ? `rounded-[18px] ${isLast ? "rounded-br-[4px]" : ""}`
              : `rounded-[18px] ${isLast ? "rounded-bl-[4px]" : ""}`;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`group/msg flex items-end ${isUser ? "justify-end" : "justify-start"} ${isFirst && i > 0 ? "mt-4" : "mt-1"}`}
              >
                {/* AI avatar — visible only on first in group */}
                {!isUser && (
                  <div className="mr-1.5 mb-0.5">
                    <CompanionAvatar image={companionAvatarImage} emoji={companionEmoji} color={companionColor} visible={isFirst} />
                  </div>
                )}

                {/* Bubble + actions */}
                <div className={`relative max-w-[70%] ${isUser ? "flex flex-row-reverse items-end" : "flex flex-row items-end"}`}>
                  <div>
                    <div
                      className={`${cornerClass} text-[15px] font-medium leading-[1.55] px-3.5 py-2.5 ${
                        isUser
                          ? "bg-emerald-600/80 text-white border border-emerald-500/30 shadow-lg shadow-emerald-900/20"
                          : "bg-[rgba(20,20,20,0.65)] backdrop-blur-md text-white/90 border border-white/10 shadow-lg shadow-black/20"
                      }`}
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                    >
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {msg.attachments.map((att, j) =>
                            att.type === "image" && att.preview ? (
                              <img
                                key={j} src={att.preview} alt="Uploaded"
                                className="w-36 h-36 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImage(attachmentImages, attachmentImages.indexOf(att.preview!))}
                              />
                            ) : (
                              <div key={j} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 text-xs text-muted-foreground">
                                <FileText className="w-3 h-3" />{att.name}
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* Content */}
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:max-h-64 [&_img]:hover:opacity-90 [&_img]:transition-opacity">
                          <ReactMarkdown
                            components={{
                              img: ({ src, alt }) => (
                                <img src={src} alt={alt || "Generated image"} className="rounded-lg cursor-pointer max-h-64 hover:opacity-90 transition-opacity" onClick={() => src && openImage([src], 0)} />
                              ),
                            }}
                          >{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span>{msg.content}</span>
                      )}

                      {msg.edited && <span className="text-[10px] text-white/40 ml-1">(edited)</span>}
                    </div>

                    {/* Timestamp — shown on last message of group */}
                    {time && (
                      <div className={isUser ? "text-right pr-1" : "text-left pl-1"}>
                        <Timestamp time={time} />
                      </div>
                    )}
                  </div>

                  {/* Actions — hover/focus only */}
                  <div className={`shrink-0 opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity duration-150 ${isUser ? "mr-1" : "ml-1"}`}>
                    {isUser ? (
                      <MessageActions content={msg.content} isUser onEdit={() => onEditMessage?.(i)} onDelete={() => onDeleteMessage?.(i)} />
                    ) : (
                      <MessageActions content={msg.content} isUser={false} />
                    )}
                  </div>
                </div>

                {/* User avatar — visible only on first in group */}
                {isUser && (
                  <div className="ml-1.5 mb-0.5">
                    <UserAvatar url={userAvatarUrl} initial={userInitial} visible={isFirst} />
                  </div>
                )}
              </motion.div>
            );
          })}

          {showMemoryChoice && <MemoryChoicePrompt onChoose={onMemoryChoice} />}

          {/* Typing indicator */}
          {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end mt-4">
              <div className="mr-1.5 mb-0.5">
                <CompanionAvatar image={companionAvatarImage} emoji={companionEmoji} color={companionColor} visible />
              </div>
              <div>
                <div className="bg-[rgba(20,20,20,0.65)] backdrop-blur-md rounded-[18px] rounded-bl-[4px] px-3.5 py-2.5 border border-white/10 shadow-lg shadow-black/20">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                    </span>
                  </span>
                </div>
                <span className="block text-[10px] text-white/30 mt-0.5 pl-1 select-none">
                  {companionName || "AI"} is typing...
                </span>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} className="h-px w-full" aria-hidden="true" />
        </div>
      </div>

      {viewerImages && (
        <ImageViewer images={viewerImages} initialIndex={viewerIndex} onClose={() => setViewerImages(null)} />
      )}
    </>
  );
};

export default ChatMessages;
