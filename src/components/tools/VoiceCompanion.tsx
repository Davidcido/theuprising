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

type TranscriptEntry = {
  role: "user" | "assistant";
  text: string;
};

const VoiceCompanion = () => {
  const [callActive, setCallActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [selectedMode, setSelectedMode] = useState("support");
  const [showTranscript, setShowTranscript] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPartial, setCurrentPartial] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs for state accessed in callbacks (prevents stale closures)
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isListeningRef = useRef(false);
  const mutedRef = useRef(false);
  const isActiveRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationRef = useRef<{ role: string; content: string }[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const listenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedLangRef = useRef(selectedLang);
  const selectedModeRef = useRef(selectedMode);

  // Sync refs with state
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { selectedLangRef.current = selectedLang; }, [selectedLang]);
  useEffect(() => { selectedModeRef.current = selectedMode; }, [selectedMode]);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  const clearListenTimeout = useCallback(() => {
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = null;
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
        if (!analyserRef.current || !isActiveRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.error("Mic access error:", err);
      toast.error("Please allow microphone access to use voice companion.");
    }
  }, []);

  const stopRecognition = useCallback(() => {
    clearListenTimeout();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setCurrentPartial("");
  }, [clearListenTimeout]);

  const getAIResponse = useCallback(
    async (userText: string): Promise<string> => {
      conversationRef.current.push({ role: "user", content: userText });

      const mode = selectedModeRef.current;
      const lang = selectedLangRef.current;
      const modeHint = mode === "vent" ? "vent" : mode === "calm" ? "calm" : undefined;

      const langInfo = languages.find((l) => l.code === lang);
      const langInstruction =
        lang !== "en"
          ? `The user is speaking in ${langInfo?.label}. Respond in the same language.`
          : "";

      const messagesForAPI = [
        ...(langInstruction
          ? [{ role: "user" as const, content: `[System note: ${langInstruction}]` }]
          : []),
        ...conversationRef.current.slice(-12),
      ];

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

      conversationRef.current.push({ role: "assistant", content: fullText });
      return fullText;
    },
    []
  );

  const speakText = useCallback(async (text: string): Promise<void> => {
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    try {
      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/#{1,6}\s/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[`~]/g, "")
        .trim();

      const resp = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!resp.ok) {
        throw new Error("Voice generation failed");
      }

      const data = await resp.json();
      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;

      return new Promise((resolve, reject) => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          resolve();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          reject(new Error("Audio playback failed"));
        };
        audio.play().catch((err) => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          reject(err);
        });
      });
    } catch (err) {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      throw err;
    }
  }, []);

  // Process user speech: get AI response, speak it, then resume listening
  const processUserSpeech = useCallback(async (userText: string) => {
    if (!isActiveRef.current) return;

    setTranscript((prev) => [...prev, { role: "user", text: userText }]);
    setIsProcessing(true);
    isProcessingRef.current = true;

    try {
      const aiResponse = await getAIResponse(userText);
      setTranscript((prev) => [...prev, { role: "assistant", text: aiResponse }]);
      setIsProcessing(false);
      isProcessingRef.current = false;

      // Speak the response
      await speakText(aiResponse);
    } catch (err) {
      console.error("Voice flow error:", err);
      setIsProcessing(false);
      isProcessingRef.current = false;
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      toast.error("Something went wrong. I'm still here though. 💚");
    }

    // Resume listening after a delay (only if call is still active)
    if (isActiveRef.current && !mutedRef.current) {
      clearListenTimeout();
      listenTimeoutRef.current = setTimeout(() => {
        if (isActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current && !mutedRef.current) {
          startListeningInternal();
        }
      }, 1200);
    }
  }, [getAIResponse, speakText, clearListenTimeout]);

  // Internal startListening that uses refs to avoid stale closures
  const startListeningInternal = useCallback(() => {
    // Guard: don't start if AI is busy or call inactive
    if (!isActiveRef.current || mutedRef.current || isSpeakingRef.current || isProcessingRef.current) {
      return;
    }

    // Stop any existing recognition first
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in your browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    const langInfo = languages.find((l) => l.code === selectedLangRef.current);
    recognition.lang = langInfo?.speechCode || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";
    let silenceTimeout: NodeJS.Timeout | null = null;
    let hasProcessed = false;

    recognition.onresult = (event: any) => {
      // Don't process if AI is speaking or processing
      if (isSpeakingRef.current || isProcessingRef.current || hasProcessed) return;

      let interim = "";
      finalTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      setCurrentPartial(interim || finalTranscript);

      // Reset silence timer on new results
      if (silenceTimeout) clearTimeout(silenceTimeout);

      if (finalTranscript.trim()) {
        silenceTimeout = setTimeout(() => {
          if (!isActiveRef.current || hasProcessed || isSpeakingRef.current || isProcessingRef.current) return;
          hasProcessed = true;

          // Stop recognition before processing
          try { recognition.stop(); } catch {}
          recognitionRef.current = null;
          setIsListening(false);
          setCurrentPartial("");

          const userText = finalTranscript.trim();
          if (userText) {
            processUserSpeech(userText);
          }
        }, 1500);
      }
    };

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
    };

    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        toast.error("Microphone access denied. Please allow it in your browser settings.");
        return;
      }
      if (e.error !== "aborted" && e.error !== "no-speech") {
        console.error("Speech error:", e.error);
      }
      setIsListening(false);
      isListeningRef.current = false;

      // Retry on no-speech after delay, only if safe
      if (isActiveRef.current && e.error === "no-speech" && !isSpeakingRef.current && !isProcessingRef.current && !hasProcessed) {
        clearListenTimeout();
        listenTimeoutRef.current = setTimeout(() => {
          if (isActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current && !mutedRef.current) {
            startListeningInternal();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      isListeningRef.current = false;

      // Only auto-restart if we haven't processed speech and call is still active
      if (isActiveRef.current && !hasProcessed && !isSpeakingRef.current && !isProcessingRef.current && !mutedRef.current) {
        clearListenTimeout();
        listenTimeoutRef.current = setTimeout(() => {
          if (isActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current && !mutedRef.current) {
            startListeningInternal();
          }
        }, 1000);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error("Recognition start error:", err);
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [processUserSpeech, clearListenTimeout]);

  const startCall = useCallback(async () => {
    isActiveRef.current = true;
    setCallActive(true);
    setTranscript([]);
    conversationRef.current = [];

    await setupAudioAnalyser();

    const mode = selectedModeRef.current;
    const greeting =
      mode === "vent"
        ? "I'm here to listen. Take your time, and say whatever's on your mind."
        : mode === "calm"
        ? "Let's take a moment to breathe and find some calm together. I'm right here with you."
        : "Hey, I'm your Uprising Companion. I'm here for you. How are you feeling right now?";

    setTranscript([{ role: "assistant", text: greeting }]);
    conversationRef.current.push({ role: "assistant", content: greeting });

    try {
      await speakText(greeting);
    } catch (err) {
      console.error("TTS greeting error:", err);
    }

    // Start listening after greeting with delay
    listenTimeoutRef.current = setTimeout(() => {
      if (isActiveRef.current && !mutedRef.current) {
        startListeningInternal();
      }
    }, 1200);
  }, [setupAudioAnalyser, speakText, startListeningInternal]);

  const endCall = useCallback(() => {
    isActiveRef.current = false;
    clearListenTimeout();
    setCallActive(false);
    setMuted(false);
    setShowTranscript(false);
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    setCurrentPartial("");
    setAudioLevel(0);
    isSpeakingRef.current = false;
    isProcessingRef.current = false;
    isListeningRef.current = false;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, [clearListenTimeout]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const newMuted = !prev;
      mutedRef.current = newMuted;
      if (newMuted) {
        stopRecognition();
      } else if (isActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
        clearListenTimeout();
        listenTimeoutRef.current = setTimeout(() => {
          if (isActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
            startListeningInternal();
          }
        }, 500);
      }
      return newMuted;
    });
  }, [stopRecognition, startListeningInternal, clearListenTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      clearListenTimeout();
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
      if (audioRef.current) audioRef.current.pause();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [clearListenTimeout]);

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
        <p className="text-white/50 text-sm">
          {isProcessing
            ? "Thinking..."
            : isSpeaking
            ? "Speaking..."
            : isListening
            ? "Listening..."
            : muted
            ? "Muted"
            : "Connecting..."}
        </p>
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
                    className={`text-xs ${
                      entry.role === "user" ? "text-right" : "text-left"
                    }`}
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
