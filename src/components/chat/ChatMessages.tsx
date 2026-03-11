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
};

const ChatMessages = ({ messages, isTyping, showMemoryChoice, onMemoryChoice, onEditMessage, onDeleteMessage }: ChatMessagesProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [viewerImages, setViewerImages] = useState<string[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  const openImage = useCallback((images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
  }, []);

  // Collect all images from a message content (markdown image syntax)
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
        className="h-full min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-3 sm:px-4 py-6"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="container mx-auto max-w-2xl space-y-3">
          {messages.map((msg, i) => {
            const attachmentImages = msg.attachments?.filter(a => a.type === "image" && a.preview).map(a => a.preview!) || [];
            const contentImages = msg.role === "assistant" ? extractContentImages(msg.content) : [];
            const allImages = [...attachmentImages, ...contentImages];

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`group flex items-end gap-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Actions for assistant messages */}
                {msg.role === "assistant" && (
                  <MessageActions
                    content={msg.content}
                    isUser={false}
                  />
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-[18px] text-[15px] font-medium leading-[1.6] ${
                    msg.role === "user"
                      ? "bg-[rgba(255,255,255,0.18)] text-white border border-white/15 rounded-br-md px-[18px] py-[14px]"
                      : "bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] text-white border border-[rgba(255,255,255,0.15)] rounded-bl-md px-[18px] py-[14px]"
                  }`}
                  style={{ textShadow: "0px 1px 2px rgba(0,0,0,0.35)" }}
                >
                  {/* Attachment previews */}
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
                    <span className="text-[10px] text-muted-foreground/50 ml-1">(edited)</span>
                  )}
                </div>

                {/* Actions for user messages */}
                {msg.role === "user" && (
                  <MessageActions
                    content={msg.content}
                    isUser={true}
                    onEdit={() => onEditMessage?.(i)}
                    onDelete={() => onDeleteMessage?.(i)}
                  />
                )}
              </motion.div>
            );
          })}

          {showMemoryChoice && (
            <MemoryChoicePrompt onChoose={onMemoryChoice} />
          )}

          {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] rounded-[18px] rounded-bl-md px-[18px] py-[14px] text-sm text-muted-foreground border border-[rgba(255,255,255,0.15)]">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </motion.div>
          )}

          <div className="h-px w-full" aria-hidden="true" />
        </div>
      </div>

      {/* Full-screen Image Viewer */}
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
