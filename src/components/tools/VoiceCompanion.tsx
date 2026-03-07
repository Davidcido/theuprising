import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  MessageSquare,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

const languages = [
  { code: "en", label: "English", speechCode: "en-US" },
  { code: "pcm", label: "Pidgin", speechCode: "en-NG" },
  { code: "yo", label: "Yoruba", speechCode: "yo-NG" },
  { code: "ha", label: "Hausa", speechCode: "ha-NG" },
  { code: "ig", label: "Igbo", speechCode: "ig-NG" },
];

const modes = [
  { id: "vent", label: "Vent Mode", desc: "I'll listen more than I speak" },
  { id: "support", label: "Support Mode", desc: "Emotional guidance & coping tips" },
  { id: "calm", label: "Calm Mode", desc: "Breathing & grounding exercises" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-tts`;

type TranscriptEntry = { role: "user" | "assistant"; text: string };

// Strict state machine: IDLE -> LISTENING -> PROCESSING -> SPEAKING -> COOLDOWN -> LISTENING
type CallPhase = "idle" | "listening" | "processing" | "speaking" | "cooldown";

const VoiceCompanion = () => {
  const [callActive, setCallActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [selectedMode, setSelectedMode] = useState("support");
  const [showTranscript, setShowTranscript] = useState(false);
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [currentPartial, setCurrentPartial] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  const phaseRef = useRef<CallPhase>("idle");
  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationRef = useRef<{ role: string; content: string }[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedLangRef = useRef(selectedLang);
  const selectedModeRef = useRef(selectedMode);

  const setPhaseSync = useCallback((p: CallPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { selectedLangRef.current = selectedLang; }, [selectedLang]);
  useEffect(() => { selectedModeRef.current = selectedMode; }, [selectedMode]);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const killRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {
        try { recognitionRef.current.stop(); } catch {}
      }
      recognitionRef.current = null;
    }
  }, []);

  const killAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
  }, []);

  const setupAudioAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateLevel = () => {
        if (!analyserRef.current || !activeRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      toast.error("Please allow microphone access to use voice companion.");
    }
  }, []);

  const getAIResponse = useCallback(async (userText: string, retries = 1): Promise<string> => {
    conversationRef.current.push({ role: "user", content: userText });

    const mode = selectedModeRef.current;
    const lang = selectedLangRef.current;
    const modeHint = mode === "vent" ? "vent" : mode === "calm" ? "calm" : undefined;

    const langInfo = languages.find((l) => l.code === lang);
    const langInstruction =
      lang !== "en" ? `The user is speaking in ${langInfo?.label}. Respond in the same language.` : "";

    const messagesForAPI = [
      ...(langInstruction ? [{ role: "user" as const, content: `[System note: ${langInstruction}]` }] : []),
      ...conversationRef.current.slice(-12),
    ];

    const attempt = async (): Promise<string> => {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: messagesForAPI, mode: modeHint }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "AI response failed");
      }

      let fullText = "";
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) fullText += c;
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }

      return fullText;
    };

    let lastError: Error | null = null;
    for (let i = 0; i <= retries; i++) {
      try {
        const result = await attempt();
        conversationRef.current.push({ role: "assistant", content: result });
        return result;
      } catch (err) {
        lastError = err as Error;
        if (i < retries) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    // Remove the user message we added since the response failed
    conversationRef.current.pop();
    throw lastError!;
  }, []);

  const speakText = useCallback(async (text: string): Promise<void> => {
    if (!activeRef.current) return;
    setPhaseSync("speaking");

    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`~]/g, "")
      .trim();

    try {
      const resp = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!resp.ok) throw new Error("Voice generation failed");

      const data = await resp.json();
      if (!activeRef.current) return;

      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;

      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => { audioRef.current = null; resolve(); };
        audio.onerror = () => { audioRef.current = null; reject(new Error("Playback failed")); };
        audio.play().catch((err) => { audioRef.current = null; reject(err); });
      });
    } catch (err) {
      console.error("TTS error:", err);
      // Don't block the flow — continue to cooldown even if TTS fails
    }
  }, [setPhaseSync]);

  // The main listening function — only enters if phase allows
  const startListening = useCallback(() => {
    if (!activeRef.current || mutedRef.current) return;
    if (phaseRef.current !== "idle" && phaseRef.current !== "cooldown") return;

    killRecognition();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    const currentLang = selectedLangRef.current;
    // Nigerian Pidgin has no browser speech support — use Nigerian English instead
    const speechLang = currentLang === "pcm" ? "en-NG" : (languages.find((l) => l.code === currentLang)?.speechCode || "en-US");
    recognition.lang = speechLang;
    recognition.continuous = false;    // Single utterance — prevents loop issues
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = "";

    recognition.onstart = () => {
      setPhaseSync("listening");
      setCurrentPartial("");
    };

    recognition.onresult = (event: any) => {
      if (phaseRef.current !== "listening") return;

      let interim = "";
      finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setCurrentPartial(interim || finalText);
    };

    recognition.onend = () => {
      // Recognition ended naturally (single utterance done)
      recognitionRef.current = null;

      if (!activeRef.current) return;
      if (phaseRef.current !== "listening") return;

      const userText = finalText.trim();
      if (userText.length > 0) {
        // Got speech → process it
        processUtterance(userText);
      } else {
        // No speech detected — restart after short delay
        setPhaseSync("cooldown");
        clearTimer();
        timerRef.current = setTimeout(() => {
          if (activeRef.current && !mutedRef.current) startListening();
        }, 800);
      }
    };

    recognition.onerror = (e: any) => {
      recognitionRef.current = null;
      if (e.error === "not-allowed") {
        toast.error("Microphone access denied.");
        return;
      }
      // For no-speech, aborted, network — retry after delay
      if (activeRef.current && phaseRef.current === "listening") {
        setPhaseSync("cooldown");
        clearTimer();
        timerRef.current = setTimeout(() => {
          if (activeRef.current && !mutedRef.current) startListening();
        }, 1000);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }, [killRecognition, setPhaseSync, clearTimer]);

  // Process a complete utterance through AI + TTS pipeline
  const processUtterance = useCallback(async (userText: string) => {
    if (!activeRef.current) return;

    killRecognition();
    setCurrentPartial("");
    setPhaseSync("processing");
    setTranscript((prev) => [...prev, { role: "user", text: userText }]);

    try {
      const aiResponse = await getAIResponse(userText);
      if (!activeRef.current) return;

      setTranscript((prev) => [...prev, { role: "assistant", text: aiResponse }]);

      await speakText(aiResponse);
    } catch (err) {
      console.error("Voice flow error:", err);
      toast.error("I couldn't process that. Let's try again. 💚");
    }

    if (!activeRef.current) return;

    setPhaseSync("cooldown");
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (activeRef.current && !mutedRef.current) {
        startListening();
      }
    }, 1000);
  }, [getAIResponse, speakText, killRecognition, setPhaseSync, clearTimer, startListening]);

  const startCall = useCallback(async () => {
    activeRef.current = true;
    setCallActive(true);
    setTranscript([]);
    setPhaseSync("idle");
    conversationRef.current = [];

    await setupAudioAnalyser();

    const mode = selectedModeRef.current;
    const greeting =
      mode === "vent"
        ? "Hi, this is your Uprising Companion. I'm here to listen. Take your time, and say whatever's on your mind."
        : mode === "calm"
        ? "Hi, this is your Uprising Companion. Let's take a moment to breathe and find some calm together. I'm right here with you."
        : "Hi, this is your Uprising Companion. I'm here with you. How are you doing today?";

    setTranscript([{ role: "assistant", text: greeting }]);
    conversationRef.current.push({ role: "assistant", content: greeting });

    try {
      await speakText(greeting);
    } catch {
      // Continue even if TTS fails
    }

    if (!activeRef.current) return;

    setPhaseSync("cooldown");
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (activeRef.current && !mutedRef.current) {
        startListening();
      }
    }, 1000);
  }, [setupAudioAnalyser, speakText, startListening, setPhaseSync, clearTimer]);

  const endCall = useCallback(() => {
    activeRef.current = false;
    clearTimer();
    killRecognition();
    killAudio();

    setCallActive(false);
    setMuted(false);
    mutedRef.current = false;
    setShowTranscript(false);
    setPhaseSync("idle");
    setCurrentPartial("");
    setAudioLevel(0);

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, [clearTimer, killRecognition, killAudio, setPhaseSync]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const newMuted = !prev;
      mutedRef.current = newMuted;
      if (newMuted) {
        killRecognition();
        setPhaseSync("idle");
      } else if (activeRef.current && phaseRef.current === "idle") {
        clearTimer();
        timerRef.current = setTimeout(() => {
          if (activeRef.current && !mutedRef.current) startListening();
        }, 500);
      }
      return newMuted;
    });
  }, [killRecognition, startListening, setPhaseSync, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      clearTimer();
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
      if (audioRef.current) audioRef.current.pause();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [clearTimer]);

  const isListening = phase === "listening";
  const isSpeaking = phase === "speaking";
  const isProcessing = phase === "processing";

  if (!callActive) {
    return (
      <div className="space-y-6 py-2">
        {/* Mode selection */}
        <div className="space-y-2">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider">
            Conversation Mode
          </p>
          <div className="space-y-2">
            {modes.map((m) => (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedMode(m.id)}
                className={`w-full text-left p-3 rounded-xl backdrop-blur-md border transition-all ${
                  selectedMode === m.id
                    ? "border-white/40 bg-white/20"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <p className="text-sm font-semibold text-white">{m.label}</p>
                <p className="text-xs text-white/60">{m.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Language selection */}
        <div className="space-y-2">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Language
          </p>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setSelectedLang(l.code)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedLang === l.code
                    ? "bg-white/25 text-white border border-white/40"
                    : "bg-white/5 text-white/60 border border-white/10"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start call */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={startCall}
          className="w-full py-4 rounded-2xl font-display font-bold text-white flex items-center justify-center gap-3 shadow-lg"
          style={{ background: "linear-gradient(135deg, #0F5132, #2E8B57)" }}
        >
          <Phone className="w-5 h-5" />
          Start Voice Call
        </motion.button>

        <p className="text-center text-white/40 text-xs">
          🎙️ Microphone access required · Uses AI voice
        </p>
      </div>
    );
  }

  // Active call interface
  const statusText = isProcessing
    ? "Thinking..."
    : isSpeaking
    ? "Speaking..."
    : isListening
    ? "Listening..."
    : muted
    ? "Muted"
    : phase === "cooldown"
    ? "Getting ready..."
    : "Ready";

  return (
    <div className="space-y-5 py-2">
      {/* Voice Waveform Visualization */}
      <div className="text-center space-y-3">
        <div className="relative w-32 h-32 mx-auto">
          {isSpeaking && (
            <>
              <motion.div
                animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(46,139,87,0.3), transparent)" }}
              />
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                className="absolute inset-0 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(46,139,87,0.2), transparent)" }}
              />
            </>
          )}

          <motion.div
            animate={{
              scale: isSpeaking
                ? [1, 1.1, 1.05, 1.12, 1]
                : isListening
                ? [1, 1 + audioLevel * 0.3, 1]
                : 1,
            }}
            transition={{
              duration: isSpeaking ? 0.8 : 0.3,
              repeat: isSpeaking ? Infinity : isListening ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #0F5132, #2E8B57)",
              boxShadow: `0 0 ${isSpeaking ? 60 : isListening ? 30 + audioLevel * 40 : 20}px rgba(46,139,87,${isSpeaking ? 0.5 : 0.3 + audioLevel * 0.3})`,
            }}
          >
            <div className="flex items-center gap-[3px]">
              {[...Array(7)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: isSpeaking
                      ? [8, 20 + Math.random() * 24, 12, 28 + Math.random() * 16, 8]
                      : isListening
                      ? [6, 6 + audioLevel * (20 + i * 4), 6]
                      : [6, 8, 6],
                  }}
                  transition={{
                    duration: isSpeaking ? 0.4 + i * 0.05 : 0.3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.05,
                  }}
                  className="w-[3px] rounded-full bg-white/80"
                  style={{ minHeight: 6 }}
                />
              ))}
            </div>
          </motion.div>
        </div>

        <p className="text-white font-display font-bold text-lg">
          Uprising Companion
        </p>
        <p className="text-white/50 text-sm">{statusText}</p>
        <p className="text-white/30 text-xs">
          {languages.find((l) => l.code === selectedLang)?.label} ·{" "}
          {modes.find((m) => m.id === selectedMode)?.label}
        </p>

        {currentPartial && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/60 text-sm italic px-4 max-w-[280px] mx-auto"
          >
            "{currentPartial}"
          </motion.p>
        )}
      </div>

      {/* Transcript toggle */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-4 max-h-48 overflow-y-auto"
          >
            {transcript.length === 0 ? (
              <p className="text-white/40 text-xs text-center italic">
                Transcript will appear here...
              </p>
            ) : (
              <div className="space-y-3">
                {transcript.map((entry, i) => (
                  <div
                    key={i}
                    className={`text-xs ${entry.role === "user" ? "text-right" : "text-left"}`}
                  >
                    <span
                      className={`inline-block px-3 py-2 rounded-xl max-w-[85%] ${
                        entry.role === "user"
                          ? "bg-white/15 text-white"
                          : "bg-white/8 text-white/80"
                      }`}
                    >
                      {entry.text}
                    </span>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
            muted
              ? "bg-red-500/20 border-red-400/30"
              : "bg-white/10 border-white/20"
          }`}
        >
          {muted ? (
            <MicOff className="w-6 h-6 text-red-300" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={endCall}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500 shadow-lg"
          style={{ boxShadow: "0 0 30px rgba(239,68,68,0.4)" }}
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowTranscript(!showTranscript)}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
            showTranscript
              ? "bg-white/20 border-white/40"
              : "bg-white/10 border-white/20"
          }`}
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </motion.button>
      </div>
    </div>
  );
};

export default VoiceCompanion;
