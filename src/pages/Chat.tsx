import { useState, useCallback, useEffect } from "react";
import { Brain } from "lucide-react";
import { toast } from "sonner";
import uprisingLogo from "@/assets/uprising-logo.jpeg";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessages, { type ChatMessage } from "@/components/chat/ChatMessages";
import { type ChatMode } from "@/components/chat/FeatureMenu";
import { type ChatAttachment } from "@/components/chat/FilePreview";
import { useAIMemory } from "@/hooks/useAIMemory";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

// Convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Read text file content
function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

type APIMessage = {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

async function streamChat({
  messages,
  mode,
  memories,
  userId,
  memoryEnabled,
  realName,
  onDelta,
  onDone,
}: {
  messages: APIMessage[];
  mode?: string;
  memories?: string[];
  userId?: string | null;
  memoryEnabled?: boolean;
  realName?: string | null;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, mode, memories, userId, memoryEnabled, realName }),
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
      if (jsonStr === "[DONE]") { streamDone = true; break; }

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

// Proactive greetings for returning users
const PROACTIVE_GREETINGS = [
  "Hey, welcome back 💚 How have you been?",
  "Hi again 🙂 I was thinking about you. How are you doing today?",
  "Hey there 💚 Good to see you! What's been on your mind?",
  "Welcome back! How's your day going so far?",
  "Hey! 🌱 I'm here whenever you want to talk. How are you feeling?",
];

const LAST_VISIT_KEY = "uprising_last_chat_visit";

function getProactiveGreeting(): string {
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  const now = Date.now();
  localStorage.setItem(LAST_VISIT_KEY, String(now));

  if (lastVisit) {
    const hoursAway = (now - Number(lastVisit)) / (1000 * 60 * 60);
    if (hoursAway > 4) {
      return PROACTIVE_GREETINGS[Math.floor(Math.random() * PROACTIVE_GREETINGS.length)];
    }
  }

  return "Hey there 💚 I'm your Uprising Companion. This is a safe space — no judgment, just support. How are you feeling right now?";
}

const Chat = () => {
  const { userId, memoryEnabled, memories, realName, loading: memLoading, setPreference, refetchMemories } = useAIMemory();

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: getProactiveGreeting() },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<ChatMode>("companion");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

  const showMemoryChoice = !memLoading && !!userId && memoryEnabled === null;

  const handleMemoryChoice = useCallback(async (enabled: boolean) => {
    try {
      await setPreference(enabled);
      toast.success(enabled ? "Memory enabled! I'll remember helpful details 💚" : "Got it — every chat starts fresh 🤝");
    } catch (e) {
      console.error("[Chat] Memory choice error:", e);
      toast.error("Could not save preference, but you can still chat!");
    }
  }, [setPreference]);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0) || isTyping) return;

    // Build user message for display
    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim(),
      attachments: attachments.map(a => ({
        type: a.type,
        name: a.file.name,
        preview: a.preview,
      })),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    const currentInput = input.trim();
    const currentAttachments = [...attachments];
    setInput("");
    setAttachments([]);
    setIsTyping(true);

    let assistantSoFar = "";

    try {
      // Build API messages with multimodal content
      const apiMessages: APIMessage[] = [];
      
      for (const msg of newMessages.slice(-20)) {
        if (msg.role === "assistant") {
          apiMessages.push({ role: "assistant", content: msg.content });
        } else if (msg === userMsg && currentAttachments.length > 0) {
          // Build multimodal content for the current message
          const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
          
          for (const att of currentAttachments) {
            if (att.type === "image") {
              const base64 = att.preview || await fileToBase64(att.file);
              contentParts.push({ type: "image_url", image_url: { url: base64 } });
            } else {
              // Text/document files - read and include as text
              try {
                const textContent = await readTextFile(att.file);
                contentParts.push({ type: "text", text: `[File: ${att.file.name}]\n${textContent}` });
              } catch {
                contentParts.push({ type: "text", text: `[File: ${att.file.name} - could not read]` });
              }
            }
          }
          
          if (currentInput) {
            contentParts.push({ type: "text", text: currentInput });
          } else if (contentParts.every(p => p.type === "image_url")) {
            contentParts.push({ type: "text", text: "What do you see in this image?" });
          }
          
          apiMessages.push({ role: "user", content: contentParts });
        } else {
          apiMessages.push({ role: "user", content: msg.content });
        }
      }

      const memoryTexts = memoryEnabled ? memories.map((m) => m.memory_text) : undefined;

      await streamChat({
        messages: apiMessages,
        mode,
        memories: memoryTexts,
        userId,
        memoryEnabled: memoryEnabled === true,
        onDelta: (chunk) => {
          if (assistantSoFar === "") {
            setMessages((prev) => [...prev, { role: "assistant", content: chunk }]);
            assistantSoFar = chunk;
          } else {
            assistantSoFar += chunk;
            setMessages((prev) => {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
              );
            });
          }
        },
        onDone: () => {
          setIsTyping(false);
          if (memoryEnabled) setTimeout(() => refetchMemories(), 1500);
        },
      });
    } catch (e: any) {
      console.error(e);
      setIsTyping(false);
      toast.error(e.message || "Something went wrong. Please try again.");
    }
  }, [input, isTyping, messages, memoryEnabled, memories, userId, refetchMemories, mode, attachments]);

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
              <span className="text-xs text-primary font-medium">Memory</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ChatMessages
        messages={messages}
        isTyping={isTyping}
        showMemoryChoice={showMemoryChoice}
        onMemoryChoice={handleMemoryChoice}
      />

      {/* Privacy notice */}
      <div className="px-4 py-1">
        <p className="text-center text-xs text-muted-foreground/50">
          {memoryEnabled
            ? "💚 Memory is on — I'll remember helpful details to support you better."
            : "🔒 Your conversation is private. No personal data is stored."}
        </p>
      </div>

      {/* Input */}
      <ChatInput
        input={input}
        setInput={setInput}
        isTyping={isTyping}
        onSend={handleSend}
        mode={mode}
        onModeChange={setMode}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
      />
    </div>
  );
};

export default Chat;
