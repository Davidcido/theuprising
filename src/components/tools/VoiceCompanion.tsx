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

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationRef = useRef<{ role: string; content: string }[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

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

  const getAIResponse = useCallback(
    async (userText: string): Promise<string> => {
      conversationRef.current.push({ role: "user", content: userText });

      // Build mode-specific system instruction
      const modeHint =
        selectedMode === "vent"
          ? "vent"
          : selectedMode === "calm"
          ? "calm"
          : undefined;

      const langInfo = languages.find((l) => l.code === selectedLang);
      const langInstruction =
        selectedLang !== "en"
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
        body: JSON.stringify({
          messages: messagesForAPI,
          mode: modeHint,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "AI response failed");
      }

      // Parse the streamed response to get full text
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
    [selectedLang, selectedMode]
  );

  const speakText = useCallback(async (text: string): Promise<void> => {
    setIsSpeaking(true);
    try {
      // Strip markdown formatting for speech
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
          resolve();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          reject(new Error("Audio playback failed"));
        };
        audio.play().catch((err) => {
          setIsSpeaking(false);
          reject(err);
        });
      });
    } catch (err) {
      setIsSpeaking(false);
      throw err;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isActiveRef.current || muted) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in your browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    const langInfo = languages.find((l) => l.code === selectedLang);
    recognition.lang = langInfo?.speechCode || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";
    let silenceTimeout: NodeJS.Timeout;

    recognition.onresult = (event: any) => {
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

      // Reset silence timer
      clearTimeout(silenceTimeout);
      if (finalTranscript) {
        silenceTimeout = setTimeout(async () => {
          if (!isActiveRef.current) return;
          recognition.stop();
          setIsListening(false);
          setCurrentPartial("");

          const userText = finalTranscript.trim();
          if (!userText) {
            startListening();
            return;
          }

          setTranscript((prev) => [...prev, { role: "user", text: userText }]);
          setIsProcessing(true);

          try {
            const aiResponse = await getAIResponse(userText);
            setTranscript((prev) => [
              ...prev,
              { role: "assistant", text: aiResponse },
            ]);
            setIsProcessing(false);

            await speakText(aiResponse);
          } catch (err) {
            console.error("Voice flow error:", err);
            setIsProcessing(false);
            toast.error("Something went wrong. I'm still here though. 💚");
          }

          // Resume listening after speaking
          if (isActiveRef.current) {
            startListening();
          }
        }, 1500);
      }
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        toast.error("Microphone access denied. Please allow it in your browser settings.");
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        console.error("Speech error:", e.error);
      }
      setIsListening(false);
      // Retry if still active
      if (isActiveRef.current && e.error === "no-speech") {
        setTimeout(() => startListening(), 500);
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if call is still active and not processing
      if (isActiveRef.current && !isProcessing && !isSpeaking) {
        setTimeout(() => startListening(), 300);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [selectedLang, muted, getAIResponse, speakText, isProcessing, isSpeaking]);

  const startCall = useCallback(async () => {
    isActiveRef.current = true;
    setCallActive(true);
    setTranscript([]);
    conversationRef.current = [];

    await setupAudioAnalyser();

    // Greet the user
    const greeting =
      selectedMode === "vent"
        ? "I'm here to listen. Take your time, and say whatever's on your mind."
        : selectedMode === "calm"
        ? "Let's take a moment to breathe and find some calm together. I'm right here with you."
        : "Hey, I'm your Uprising Companion. I'm here for you. How are you feeling right now?";

    setTranscript([{ role: "assistant", text: greeting }]);
    conversationRef.current.push({ role: "assistant", content: greeting });

    try {
      await speakText(greeting);
    } catch (err) {
      console.error("TTS greeting error:", err);
    }

    startListening();
  }, [selectedMode, setupAudioAnalyser, speakText, startListening]);

  const endCall = useCallback(() => {
    isActiveRef.current = false;
    setCallActive(false);
    setMuted(false);
    setShowTranscript(false);
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    setCurrentPartial("");
    setAudioLevel(0);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
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
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const newMuted = !prev;
      if (newMuted && recognitionRef.current) {
        recognitionRef.current.stop();
      } else if (!newMuted && isActiveRef.current) {
        startListening();
      }
      return newMuted;
    });
  }, [startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      if (audioRef.current) audioRef.current.pause();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

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
          {/* Outer pulse rings */}
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

          {/* Main circle */}
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
            {/* Waveform bars */}
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

        {/* Live partial transcript */}
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
