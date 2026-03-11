import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Brain, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessages, { type ChatMessage } from "@/components/chat/ChatMessages";
import { type ChatMode } from "@/components/chat/FeatureMenu";
import { useChatHistory } from "@/hooks/useChatHistory";
import chatWallpaper from "@/assets/chat-wallpaper.jpeg";

const PERSONA_MODE_MAP: Record<string, ChatMode> = {
  seren: "companion",
  atlas: "thinking",
  orion: "thinking",
  nova: "creative",
  elias: "study",
  kai: "companion",
  leo: "thinking",
  sol: "companion",
};
import { type ChatAttachment } from "@/components/chat/FilePreview";
import { type PersonaConfig, getSavedCompanionId, saveCompanionId } from "@/components/chat/PersonaSelector";
import { BUILTIN_PERSONAS } from "@/lib/builtinPersonas";
import { useAIMemory } from "@/hooks/useAIMemory";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  messages, mode, memories, lifeEvents, userId, memoryEnabled, realName, persona, onDelta, onDone,
}: {
  messages: APIMessage[];
  mode?: string;
  memories?: string[];
  lifeEvents?: { text: string; category: string; date?: string | null }[];
  userId?: string | null;
  memoryEnabled?: boolean;
  realName?: string | null;
  persona?: { name: string; role: string; personality: string; conversation_style: string; emotional_tone: string; interests: string } | null;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, mode, memories, lifeEvents, userId, memoryEnabled, realName, persona }),
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

const PROACTIVE_GREETINGS_WITH_NAME = [
  "Hey NAME, welcome back 💚 How have you been?",
  "Hi NAME 🙂 I was thinking about you. How are you doing today?",
  "Hey NAME 💚 Good to see you! What's been on your mind?",
  "Welcome back NAME! How's your day going so far?",
  "Hey NAME! 🌱 I'm here whenever you want to talk. How are you feeling?",
];

const PROACTIVE_GREETINGS = [
  "Hey, welcome back 💚 How have you been?",
  "Hi again 🙂 I was thinking about you. How are you doing today?",
  "Hey there 💚 Good to see you! What's been on your mind?",
  "Welcome back! How's your day going so far?",
  "Hey! 🌱 I'm here whenever you want to talk. How are you feeling?",
];

const LAST_VISIT_KEY = "uprising_last_chat_visit";
const DAILY_CHECKIN_KEY = "uprising_daily_checkin";

function getMemoryFollowUp(memories: { memory_text: string; category: string; importance_score?: number | null }[]): string | null {
  if (!memories || memories.length === 0) return null;
  const followable = memories.filter(m => m.category !== "identity" && (m.importance_score ?? 5) >= 6);
  if (followable.length === 0) return null;
  return followable[Math.floor(Math.random() * Math.min(3, followable.length))].memory_text;
}

function getProactiveGreeting(name?: string | null, memories?: { memory_text: string; category: string; importance_score?: number | null }[]): string {
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  const lastCheckin = localStorage.getItem(DAILY_CHECKIN_KEY);
  const now = Date.now();
  const today = new Date().toDateString();
  localStorage.setItem(LAST_VISIT_KEY, String(now));

  if (lastVisit) {
    const hoursAway = (now - Number(lastVisit)) / (1000 * 60 * 60);
    if (hoursAway > 4) {
      if (lastCheckin !== today && memories && memories.length > 0) {
        localStorage.setItem(DAILY_CHECKIN_KEY, today);
        const memText = getMemoryFollowUp(memories);
        if (memText && name) return `Hey ${name} 💚 I was thinking about you. Last time you mentioned: "${memText}" — how's that going?`;
        if (memText) return `Hey 💚 I remembered something from before: "${memText}" — how are things now?`;
      }
      if (name) {
        const g = PROACTIVE_GREETINGS_WITH_NAME[Math.floor(Math.random() * PROACTIVE_GREETINGS_WITH_NAME.length)];
        return g.replace("NAME", name);
      }
      return PROACTIVE_GREETINGS[Math.floor(Math.random() * PROACTIVE_GREETINGS.length)];
    }
  }

  if (name) return `Hey ${name} 💚 I'm your Uprising Companion. This is a safe space — no judgment, just support. How are you feeling right now?`;
  return "Hey there 💚 I'm your Uprising Companion. This is a safe space — no judgment, just support. How are you feeling right now?";
}

function getInitialPersona(): PersonaConfig {
  const savedId = getSavedCompanionId();
  if (savedId) {
    const found = BUILTIN_PERSONAS.find(p => p.id === savedId);
    if (found) return { ...found, is_custom: false };
  }
  return { ...BUILTIN_PERSONAS[0], is_custom: false };
}

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, memoryEnabled, memories, lifeEvents, realName, loading: memLoading, setPreference, refetchMemories } = useAIMemory();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<ChatMode>(() => {
    const initial = getInitialPersona();
    return PERSONA_MODE_MAP[initial.id] || "companion";
  });
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [greetingSet, setGreetingSet] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [persona, setPersona] = useState<PersonaConfig>(getInitialPersona);

  // Persistent chat history
  const { savedMessages, loading: historyLoading, persistMessages, startNewConversation } = useChatHistory(userId, persona.id);

  // Handle companion selection from explorer page
  useEffect(() => {
    const state = location.state as { newCompanionId?: string } | null;
    if (state?.newCompanionId) {
      const found = BUILTIN_PERSONAS.find(p => p.id === state.newCompanionId);
      if (found) {
        const config: PersonaConfig = { ...found, is_custom: false };
        setPersona(config);
        setMode(PERSONA_MODE_MAP[found.id] || "companion");
        setGreetingSet(false);
        setMessages([]);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // When companion changes, reset greeting flag but DON'T clear messages yet —
  // wait for history to load to avoid a flash of empty UI.
  const prevPersonaIdRef = useRef(persona.id);
  useEffect(() => {
    if (prevPersonaIdRef.current !== persona.id) {
      prevPersonaIdRef.current = persona.id;
      setGreetingSet(false);
    }
  }, [persona.id]);

  // Load saved messages or show greeting once auth/history are ready
  useEffect(() => {
    if (memLoading || historyLoading) return;

    if (savedMessages && savedMessages.length > 0) {
      setMessages(savedMessages);
      setGreetingSet(true);
      return;
    }

    if (!greetingSet) {
      const savedId = getSavedCompanionId();
      if (savedId && persona.greeting) {
        const greetingText = realName
          ? persona.greeting.replace(/^Hey /, `Hey ${realName} `)
          : persona.greeting;
        setMessages([{ role: "assistant", content: greetingText }]);
      } else {
        const greeting = getProactiveGreeting(realName, memoryEnabled ? memories : undefined);
        setMessages([{ role: "assistant", content: greeting }]);
      }
      setGreetingSet(true);
    }
  }, [memLoading, historyLoading, savedMessages, realName, memories, memoryEnabled, greetingSet, persona]);

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

  const sendMessage = useCallback(async (messageList: ChatMessage[], currentInput: string, currentAttachments: ChatAttachment[], editIndex?: number | null) => {
    setIsTyping(true);
    let assistantSoFar = "";

    try {
      const apiMessages: APIMessage[] = [];
      const lastUserMsg = messageList[messageList.length - 1];

      for (const msg of messageList.slice(-20)) {
        if (msg.role === "assistant") {
          apiMessages.push({ role: "assistant", content: msg.content });
        } else if (msg === lastUserMsg && currentAttachments.length > 0) {
          const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
          for (const att of currentAttachments) {
            if (att.type === "image") {
              const base64 = att.preview || await fileToBase64(att.file);
              contentParts.push({ type: "image_url", image_url: { url: base64 } });
            } else {
              try {
                const textContent = await readTextFile(att.file);
                contentParts.push({ type: "text", text: `[File: ${att.file.name}]\n${textContent}` });
              } catch {
                contentParts.push({ type: "text", text: `[File: ${att.file.name} - could not read]` });
              }
            }
          }
          if (currentInput) contentParts.push({ type: "text", text: currentInput });
          else if (contentParts.every(p => p.type === "image_url")) contentParts.push({ type: "text", text: "What do you see in this image?" });
          apiMessages.push({ role: "user", content: contentParts });
        } else {
          apiMessages.push({ role: "user", content: msg.content });
        }
      }

      const memoryTexts = memoryEnabled ? memories.map((m) => m.memory_text) : undefined;
      const lifeEventTexts = memoryEnabled && lifeEvents.length > 0
        ? lifeEvents.map((e) => ({ text: e.event_text, category: e.event_category, date: e.event_date }))
        : undefined;

      const personaPayload = persona.id !== "seren" ? {
        name: persona.name,
        role: persona.role,
        personality: persona.personality,
        conversation_style: persona.conversation_style,
        emotional_tone: persona.emotional_tone,
        interests: persona.interests,
      } : null;

      await streamChat({
        messages: apiMessages,
        mode,
        memories: memoryTexts,
        lifeEvents: lifeEventTexts,
        userId,
        memoryEnabled: memoryEnabled === true,
        realName,
        persona: personaPayload,
        onDelta: (chunk) => {
          if (assistantSoFar === "") {
            setMessages((prev) => [...prev, { role: "assistant", content: chunk }]);
            assistantSoFar = chunk;
          } else {
            assistantSoFar += chunk;
            setMessages((prev) => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
        },
        onDone: () => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.content.includes("||SPLIT||")) {
              const parts = last.content.split("||SPLIT||").map(p => p.trim()).filter(Boolean);
              if (parts.length > 1) {
                const withoutLast = prev.slice(0, -1);
                return [...withoutLast, ...parts.map(p => ({ role: "assistant" as const, content: p }))];
              }
            }
            return prev;
          });
          setIsTyping(false);
          if (memoryEnabled) setTimeout(() => refetchMemories(), 1500);
          setMessages((prev) => {
            setTimeout(() => persistMessages(prev), 200);
            return prev;
          });
        },
      });
    } catch (e: any) {
      console.error(e);
      setIsTyping(false);
      toast.error(e.message || "Something went wrong. Please try again.");
    }
  }, [memoryEnabled, memories, lifeEvents, userId, realName, refetchMemories, mode, persona, persistMessages]);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0) || isTyping) return;

    if (editingIndex !== null) {
      const updatedMessages = [...messages];
      updatedMessages[editingIndex] = {
        ...updatedMessages[editingIndex],
        content: input.trim(),
        edited: true,
      };
      const trimmed = updatedMessages.slice(0, editingIndex + 1);
      setMessages(trimmed);
      setTimeout(() => persistMessages(trimmed), 0);
      const currentInput = input.trim();
      setInput("");
      setEditingIndex(null);
      setAttachments([]);
      await sendMessage(trimmed, currentInput, []);
      return;
    }

    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim(),
      attachments: attachments.map(a => ({ type: a.type, name: a.file.name, preview: a.preview })),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setTimeout(() => persistMessages(newMessages), 0);
    const currentInput = input.trim();
    const currentAttachments = [...attachments];
    setInput("");
    setAttachments([]);
    await sendMessage(newMessages, currentInput, currentAttachments);
  }, [input, isTyping, messages, editingIndex, attachments, sendMessage, persistMessages]);

  const handleNewChat = useCallback(async () => {
    const newConversationId = await startNewConversation();
    if (userId && !newConversationId) {
      toast.error("Could not start a new chat");
      return;
    }

    setMessages([]);
    setInput("");
    setAttachments([]);
    setEditingIndex(null);
    setIsTyping(false);
    setGreetingSet(false);
    toast.success("Started a new chat");
  }, [startNewConversation, userId]);

  const handleEditMessage = useCallback((index: number) => {
    const msg = messages[index];
    if (msg.role !== "user") return;
    setInput(msg.content);
    setEditingIndex(index);
  }, [messages]);

  const handleDeleteMessage = useCallback((index: number) => {
    setMessages((prev) => {
      const updated = [...prev];
      if (index + 1 < updated.length && updated[index + 1]?.role === "assistant") {
        updated.splice(index, 2);
      } else {
        updated.splice(index, 1);
      }
      return updated;
    });
  }, []);

  const builtinData = BUILTIN_PERSONAS.find(bp => bp.id === persona.id);

  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{
        height: "calc(100dvh - 4rem - env(safe-area-inset-top, 0px))",
      }}
    >
      {/* Tree of Life Wallpaper */}
      <div
        className="absolute inset-0 z-0 bg-center bg-no-repeat bg-contain pointer-events-none"
        style={{
          backgroundImage: `url(${chatWallpaper})`,
          opacity: 0.20,
          filter: "blur(3px) contrast(1.1)",
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => {
          const left = `${(i * 31 + 11) % 100}%`;
          const top = `${(i * 47 + 9) % 100}%`;
          const size = 2 + (i % 3);
          const dur = `${22 + (i * 5) % 18}s`;
          const delay = `${(i * 2.3) % 12}s`;
          const isGold = i % 3 === 0;
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left, top,
                width: size, height: size,
                background: isGold ? "rgba(218,195,130,0.06)" : "rgba(180,230,200,0.05)",
                boxShadow: isGold ? "0 0 6px rgba(218,195,130,0.10)" : "0 0 6px rgba(180,230,200,0.08)",
                animation: `chatParticleDrift ${dur} ${delay} ease-in-out infinite alternate`,
              }}
            />
          );
        })}
      </div>

      {/* Header - fixed, outside scroll */}
      <div className="shrink-0 px-4 py-3 backdrop-blur-xl border-b border-white/10 relative z-10" style={{ background: "rgba(15, 81, 50, 0.6)" }}>
        <div className="container mx-auto flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-md ring-2 ring-offset-1 ring-offset-background" style={{ borderColor: `${persona.color}44` }}>
            {builtinData?.avatar_image ? (
              <img src={builtinData.avatar_image} alt={persona.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center text-xl" style={{ background: `${persona.color}22` }}>
                {persona.avatar_emoji || "💚"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold text-foreground text-sm truncate">
              {persona.avatar_emoji} {persona.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isTyping ? (
                <span className="text-primary animate-pulse">typing...</span>
              ) : persona.description}
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:opacity-90 transition-colors"
            style={{ backgroundColor: "#0F2E1F" }}
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span className="text-xs text-white font-medium">New Chat</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/companions")}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:opacity-90 transition-colors"
            style={{ backgroundColor: "#0F2E1F" }}
          >
            <RefreshCw className="w-3.5 h-3.5 text-white" />
            <span className="text-xs text-white font-medium">Switch</span>
          </button>
          {memoryEnabled && (
            <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/30">
              <Brain className="w-3 h-3 text-primary" />
              <span className="text-xs text-primary font-medium">Memory</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages - scrollable area */}
      <div className="relative z-10 flex-1 min-h-0">
        <ChatMessages
          messages={messages}
          isTyping={isTyping}
          showMemoryChoice={showMemoryChoice}
          onMemoryChoice={handleMemoryChoice}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
        />
      </div>

      {/* Edit indicator */}
      {editingIndex !== null && (
        <div className="px-4 py-1.5 bg-primary/10 border-t border-primary/20 flex items-center justify-between relative z-10">
          <span className="text-xs text-primary">Editing message...</span>
          <button onClick={() => { setEditingIndex(null); setInput(""); }} className="text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
      )}

      {/* Input - fixed at bottom with safe area */}
      <div className="shrink-0 relative z-10" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {/* Edit indicator */}
        {editingIndex !== null && (
          <div className="px-4 py-1.5 bg-primary/10 border-t border-primary/20 flex items-center justify-between">
            <span className="text-xs text-primary">Editing message...</span>
            <button onClick={() => { setEditingIndex(null); setInput(""); }} className="text-xs text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        )}

        {/* Privacy notice */}
        <div className="px-4 py-1">
          <p className="text-center text-[10px] text-muted-foreground/40">
            {memoryEnabled
              ? "💚 Memory is on — I'll remember helpful details to support you better."
              : "🔒 Your conversation is private. No personal data is stored."}
          </p>
        </div>

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
    </div>
  );
};

export default Chat;
