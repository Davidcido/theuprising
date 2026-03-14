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
};

const ChatMessages = ({ messages, isTyping, showMemoryChoice, onMemoryChoice, onEditMessage, onDeleteMessage, userAvatarUrl, userDisplayName, companionAvatarImage, companionEmoji, companionColor }: ChatMessagesProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [viewerImages, setViewerImages] = useState<string[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    // Use rAF to ensure DOM has updated
    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }, []);

  // Scroll on new messages or typing state change
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, isTyping, scrollToBottom]);

  // Handle iOS keyboard open/close via visualViewport API
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      // When keyboard opens/closes, scroll to bottom to keep latest message visible
      scrollToBottom("smooth");
    };

    vv.addEventListener("resize", handleResize);
    vv.addEventListener("scroll", handleResize);
    return () => {
      vv.removeEventListener("resize", handleResize);
      vv.removeEventListener("scroll", handleResize);
    };
  }, [scrollToBottom]);

  const openImage = useCallback((images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
  }, []);

  const extractContentImages = (content: string): string[] => {
    const regex = /!\[.*?\]\((.*?)\)/g;
    const urls: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) urls.push(match[1]);
    return urls;
  };

  return (
    <>
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto overscroll-contain touch-pan-y px-3 sm:px-4 py-6"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="container mx-auto max-w-2xl flex flex-col gap-3.5">
          {messages.map((msg, i) => {
            const attachmentImages = msg.attachments?.filter(a => a.type === "image" && a.preview).map(a => a.preview!) || [];
            const contentImages = msg.role === "assistant" ? extractContentImages(msg.content) : [];

            const isUser = msg.role === "user";
            const userInitial = (userDisplayName || "Y")[0]?.toUpperCase() || "Y";

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`group/msg flex items-end ${isUser ? "justify-end" : "justify-start"}`}
              >
                {/* AI avatar on left — tight gap */}
                {!isUser && (
                  <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden shadow-md mr-1.5 mb-0.5" style={{ background: companionColor ? `${companionColor}33` : "rgba(255,255,255,0.1)" }}>
                    {companionAvatarImage ? (
                      <img src={companionAvatarImage} alt="AI" className="w-full h-full object-cover" />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-xs">{companionEmoji || "🌿"}</span>
                    )}
                  </div>
                )}

                {/* Bubble + actions wrapper */}
                <div className={`relative max-w-[80%] sm:max-w-[72%] ${isUser ? "flex flex-row-reverse items-end" : "flex flex-row items-end"}`}>
                  <div
                    className={`rounded-[18px] text-[15px] font-medium leading-[1.6] px-[14px] py-[10px] ${
                      isUser
                        ? "bg-emerald-600/80 text-white border border-emerald-500/30 rounded-br-[4px] shadow-lg shadow-emerald-900/20"
                        : "bg-[rgba(20,20,20,0.65)] backdrop-blur-md text-white/90 border border-white/10 rounded-bl-[4px] shadow-lg shadow-black/20"
                    }`}
                    style={{ textShadow: "0px 1px 2px rgba(0,0,0,0.35)" }}
                  >
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex gap-2 mb-2 flex-wrap">
                        {msg.attachments.map((att, j) => (
                          att.type === "image" && att.preview ? (
                            <img
                              key={j}
                              src={att.preview}
                              alt="Uploaded"
                              className="w-36 h-36 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openImage(attachmentImages, attachmentImages.indexOf(att.preview!))}
                            />
                          ) : (
                            <div key={j} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 text-xs text-muted-foreground">
                              <FileText className="w-3 h-3" />
                              {att.name}
                            </div>
                          )
                        ))}
                      </div>
                    )}

                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:max-h-64 [&_img]:hover:opacity-90 [&_img]:transition-opacity">
                        <ReactMarkdown
                          components={{
                            img: ({ src, alt }) => (
                              <img
                                src={src}
                                alt={alt || "Generated image"}
                                className="rounded-lg cursor-pointer max-h-64 hover:opacity-90 transition-opacity"
                                onClick={() => src && openImage([src], 0)}
                              />
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span>{msg.content}</span>
                    )}

                    {msg.edited && (
                      <span className="text-[10px] text-white/40 ml-1">(edited)</span>
                    )}
                  </div>

                  {/* Actions — positioned outside bubble, hidden until hover/long-press */}
                  <div className={`shrink-0 opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity duration-150 ${isUser ? "mr-1" : "ml-1"}`}>
                    {isUser ? (
                      <MessageActions
                        content={msg.content}
                        isUser={true}
                        onEdit={() => onEditMessage?.(i)}
                        onDelete={() => onDeleteMessage?.(i)}
                      />
                    ) : (
                      <MessageActions content={msg.content} isUser={false} />
                    )}
                  </div>
                </div>

                {/* User avatar on right — tight gap */}
                {isUser && (
                  <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden shadow-md ml-1.5 mb-0.5 bg-emerald-500 flex items-center justify-center">
                    {userAvatarUrl ? (
                      <img src={userAvatarUrl} alt="You" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-bold">{userInitial}</span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}

          {showMemoryChoice && (
            <MemoryChoicePrompt onChoose={onMemoryChoice} />
          )}

          {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start items-end gap-2">
              <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden shadow-md mb-0.5" style={{ background: companionColor ? `${companionColor}33` : "rgba(255,255,255,0.1)" }}>
                {companionAvatarImage ? (
                  <img src={companionAvatarImage} alt="AI" className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-sm">{companionEmoji || "🌿"}</span>
                )}
              </div>
              <div className="bg-[rgba(20,20,20,0.65)] backdrop-blur-md rounded-[18px] rounded-bl-md px-[16px] py-[12px] text-sm text-muted-foreground border border-white/10 shadow-lg shadow-black/20">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} className="h-px w-full" aria-hidden="true" />
        </div>
      </div>

      {viewerImages && (
        <ImageViewer
          images={viewerImages}
          initialIndex={viewerIndex}
          onClose={() => setViewerImages(null)}
        />
      )}
    </>
  );
};

export default ChatMessages;
