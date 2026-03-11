import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import MemoryChoicePrompt from "./MemoryChoicePrompt";
import { FileText, Image as ImageIcon } from "lucide-react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: { type: "image" | "document"; name: string; preview?: string }[];
};

type ChatMessagesProps = {
  messages: ChatMessage[];
  isTyping: boolean;
  showMemoryChoice: boolean;
  onMemoryChoice: (enabled: boolean) => void;
};

const ChatMessages = ({ messages, isTyping, showMemoryChoice, onMemoryChoice }: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="container mx-auto max-w-2xl space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed backdrop-blur-md ${
                msg.role === "user"
                  ? "bg-white/15 text-foreground border border-white/20 rounded-br-md"
                  : "bg-white/10 text-foreground/90 border border-white/10 rounded-bl-md"
              }`}
            >
              {/* Attachment previews */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {msg.attachments.map((att, j) => (
                    att.type === "image" && att.preview ? (
                      <img key={j} src={att.preview} alt="Uploaded" className="w-32 h-32 object-cover rounded-lg" />
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
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </motion.div>
        ))}

        {showMemoryChoice && (
          <MemoryChoicePrompt onChoose={onMemoryChoice} />
        )}

        {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground border border-white/10">
              <span className="animate-pulse">typing...</span>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default ChatMessages;
