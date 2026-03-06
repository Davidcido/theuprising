import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Heart, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CRISIS_KEYWORDS = [
  "kill myself", "suicide", "end my life", "want to die", "self harm",
  "hurt myself", "don't want to live", "no reason to live",
];

const CRISIS_RESPONSE = `I'm really glad you told me how you're feeling. You deserve support through this, and you don't have to face it alone.

**Please reach out to someone who can help right now:**
- 🇺🇸 **988 Suicide & Crisis Lifeline**: Call or text **988**
- 🌍 **Crisis Text Line**: Text **HELLO** to **741741**
- 🌐 **International Association for Suicide Prevention**: [https://www.iasp.info/resources/Crisis_Centres/](https://www.iasp.info/resources/Crisis_Centres/)

Is there someone you trust — a friend, family member, or counselor — that you could reach out to right now? 💚`;

const MOOD_RESPONSES: Record<string, string> = {
  happy: "That's amazing! I'd love to hear what's making you feel good. 😊",
  stressed: "Stress can feel overwhelming. Let's slow down together. What's weighing on you the most right now?",
  sad: "I'm here with you. It's okay to feel sad. Do you want to share what's going on?",
  anxious: "Anxiety can feel really intense. Let's try to ground ourselves. What's one thing you can see right now?",
  overwhelmed: "That's a lot to carry. You don't have to figure it all out at once. What feels most urgent?",
};

function detectMood(text: string): string | null {
  const lower = text.toLowerCase();
  if (/happy|great|amazing|wonderful|excited|good/.test(lower)) return "happy";
  if (/stress|pressure|busy|too much|overwhelm/.test(lower)) return "stressed";
  if (/sad|down|depress|cry|tears|miserable|hopeless/.test(lower)) return "sad";
  if (/anxi|nervous|worry|scared|fear|panic/.test(lower)) return "anxious";
  if (/overwhelm|can't cope|falling apart|breaking/.test(lower)) return "overwhelmed";
  return null;
}

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

function generateResponse(userMessage: string): string {
  if (detectCrisis(userMessage)) return CRISIS_RESPONSE;

  const mood = detectMood(userMessage);
  if (mood && MOOD_RESPONSES[mood]) return MOOD_RESPONSES[mood];

  const responses = [
    "I'm really glad you shared that with me. Can you tell me more about what you're feeling?",
    "That sounds really important. How long have you been feeling this way?",
    "Thank you for trusting me with this. What would feel most helpful right now — talking it through, or trying a calming exercise?",
    "I hear you. Sometimes just putting feelings into words can help. What else is on your mind?",
    "You're doing something brave by expressing yourself. What do you think triggered these feelings?",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey there 💚 I'm your Uprising Companion. This is a safe space — no judgment, just support. How are you feeling right now?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const isCrisis = detectCrisis(input);

    setTimeout(() => {
      const response = generateResponse(userMsg.content);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 bg-card">
        <div className="container mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary-foreground" fill="currentColor" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-foreground">Uprising Companion</h2>
            <p className="text-xs text-muted-foreground">Your safe space to talk</p>
          </div>
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
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none text-secondary-foreground">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground">
                <span className="animate-pulse-soft">typing...</span>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Privacy notice */}
      <div className="px-4 py-1">
        <p className="text-center text-xs text-muted-foreground">
          🔒 Your conversation is private and anonymous. No personal data is stored.
        </p>
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-4 bg-card">
        <div className="container mx-auto max-w-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Share what's on your mind..."
              className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-xl bg-gradient-hero px-4 py-3 text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
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
