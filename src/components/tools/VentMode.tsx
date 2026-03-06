import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

type Msg = { role: "user" | "assistant"; text: string };

async function streamVent({
  messages,
  onDelta,
  onDone,
}: {
  messages: { role: string; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, mode: "vent" }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Connection failed" }));
    throw new Error(err.error || "Failed to connect");
  }

  if (!resp.body) throw new Error("No stream");
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const c = JSON.parse(json).choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  onDone();
}

const VentMode = () => {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "This is your safe space. Say whatever you need to — I'm here to listen. 💚" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    if (!input.trim() || isTyping) return;
    const userText = input.trim();
    const newMessages = [...messages, { role: "user" as const, text: userText }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    let aiSoFar = "";

    // Convert to API format (last 16 messages)
    const apiMessages = newMessages.slice(-16).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.text,
    }));

    try {
      await streamVent({
        messages: apiMessages,
        onDelta: (chunk) => {
          aiSoFar += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && prev.length > newMessages.length) {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, text: aiSoFar } : m);
            }
            return [...prev, { role: "assistant", text: aiSoFar }];
          });
        },
        onDone: () => setIsTyping(false),
      });
    } catch (e: any) {
      setIsTyping(false);
      toast.error(e.message || "Something went wrong");
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div ref={scrollRef} className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-2xl text-sm max-w-[85%] ${
              m.role === "user"
                ? "ml-auto bg-white/15 text-white border border-white/20"
                : "bg-white/10 text-white/90 border border-white/10"
            }`}
          >
            {m.role === "assistant" ? (
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{m.text}</ReactMarkdown>
              </div>
            ) : (
              m.text
            )}
          </motion.div>
        ))}
        {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-2xl text-sm max-w-[85%] bg-white/10 text-white/50 border border-white/10"
          >
            typing...
          </motion.div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Let it out..."
          disabled={isTyping}
          className="flex-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={send}
          disabled={isTyping || !input.trim()}
          className="p-3 rounded-xl disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #0F5132, #2E8B57)" }}
        >
          <Send className="w-4 h-4 text-white" />
        </motion.button>
      </div>
    </div>
  );
};

export default VentMode;
