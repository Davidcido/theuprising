import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Brain } from "lucide-react";
import EmojiPicker from "@/components/EmojiPicker";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import uprisingLogo from "@/assets/uprising-logo.jpeg";
import MemoryChoicePrompt from "@/components/chat/MemoryChoicePrompt";
import { useAIMemory } from "@/hooks/useAIMemory";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function streamChat({
  messages,
  mode,
  memories,
  userId,
  memoryEnabled,
  onDelta,
  onDone,
}: {
  messages: Message[];
  mode?: string;
  memories?: string[];
  userId?: string | null;
  memoryEnabled?: boolean;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, mode, memories, userId, memoryEnabled }),
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ error: "Connection failed" }));
    throw new Error(errorData.error || "Failed to connect");
  }

  if (!resp.body) throw new Error("No response stream");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

const Chat = () => {
  const { userId, memoryEnabled, memories, loading: memLoading, setPreference, refetchMemories } = useAIMemory();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey there 💚 I'm your Uprising Companion. This is a safe space — no judgment, just support. How are you feeling right now?",
    },
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Show memory choice for logged-in users who haven't chosen yet
  const showMemoryChoice = !memLoading && userId && memoryEnabled === null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleMemoryChoice = async (enabled: boolean) => {
    await setPreference(enabled);
    toast.success(enabled ? "Memory enabled! I'll remember helpful details 💚" : "Got it — every chat starts fresh 🤝");
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    let assistantSoFar = "";

    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > messages.length + 1) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev.slice(0, -1), { role: "assistant" as const, content: assistantSoFar }];
      });
    };

    try {
      const contextMessages = newMessages.slice(-20);
      const memoryTexts = memoryEnabled ? memories.map((m) => m.memory_text) : undefined;

      await streamChat({
        messages: contextMessages,
        memories: memoryTexts,
        userId,
        memoryEnabled: memoryEnabled === true,
        onDelta: (chunk) => {
          if (assistantSoFar === "") {
            setMessages((prev) => [...prev, { role: "assistant", content: chunk }]);
            assistantSoFar = chunk;
          } else {
            upsertAssistant(chunk);
          }
        },
        onDone: () => {
          setIsTyping(false);
          // Refetch memories in case the AI stored new ones
          if (memoryEnabled) setTimeout(() => refetchMemories(), 1500);
        },
      });
    } catch (e: any) {
      console.error(e);
      setIsTyping(false);
      toast.error(e.message || "Something went wrong. Please try again.");
    }
  }, [input, isTyping, messages, memoryEnabled, memories, userId, refetchMemories]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-4 py-3 backdrop-blur-xl border-b border-white/10"
        style={{ background: "rgba(15, 81, 50, 0.4)" }}
      >
        <div className="container mx-auto flex items-center gap-3">
          <img src={uprisingLogo} alt="Uprising" className="w-10 h-10 rounded-xl object-cover shadow-md" />
          <div>
            <h2 className="font-display font-semibold text-foreground">Uprising Companion</h2>
            <p className="text-xs text-muted-foreground">
              {isTyping ? "typing..." : "Your safe space to talk"}
            </p>
          </div>
          {memoryEnabled && (
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/30">
              <Brain className="w-3 h-3 text-primary" />
              <span className="text-xs text-primary font-medium">Memory Enabled</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
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

          {/* Memory choice prompt */}
          {showMemoryChoice && (
            <MemoryChoicePrompt onChoose={handleMemoryChoice} />
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

      {/* Privacy notice */}
      <div className="px-4 py-1">
        <p className="text-center text-xs text-muted-foreground/50">
          {memoryEnabled
            ? "💚 Memory is on — I'll remember helpful details to support you better."
            : "🔒 Your conversation is private. No personal data is stored."}
        </p>
      </div>

      {/* Input */}
      <div className="px-4 py-4 backdrop-blur-xl border-t border-white/10"
        style={{ background: "rgba(15, 81, 50, 0.4)" }}
      >
        <div className="container mx-auto max-w-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <EmojiPicker onSelect={(emoji) => {
              setInput((prev) => prev + emoji);
              inputRef.current?.focus();
            }} />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Share what's on your mind..."
              className="flex-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="rounded-2xl px-4 py-3 text-white hover:opacity-90 transition-opacity disabled:opacity-40 shadow-lg"
              style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
