import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

const VentMode = () => {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    { role: "ai", text: "This is your safe space. Say whatever you need to — I'm here to listen. 💚" },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setInput("");
    // Simulated empathetic listener response
    setTimeout(() => {
      const responses = [
        "I hear you. Thank you for sharing that with me.",
        "That sounds really heavy. I'm glad you're letting it out.",
        "You're not alone in feeling this way. Keep going, I'm listening.",
        "It takes courage to say what you're feeling. I'm right here.",
        "Let it all out. There's no judgment here, only support.",
      ];
      setMessages((m) => [...m, { role: "ai", text: responses[Math.floor(Math.random() * responses.length)] }]);
    }, 1200);
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
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
            {m.text}
          </motion.div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Let it out..."
          className="flex-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={send}
          className="p-3 rounded-xl"
          style={{ background: "linear-gradient(135deg, #0F5132, #2E8B57)" }}
        >
          <Send className="w-4 h-4 text-white" />
        </motion.button>
      </div>
    </div>
  );
};

export default VentMode;
