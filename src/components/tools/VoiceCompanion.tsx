import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  MessageSquare,
  Globe,
  Send,
  Keyboard,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type TranscriptEntry = { role: "user" | "assistant"; text: string };
type CallPhase = "idle" | "listening" | "processing" | "speaking";

/* ── Voice helpers ── */

function getVoiceLabel(v: SpeechSynthesisVoice): string {
  // Extract accent/region from lang code
  const langParts = v.lang.split("-");
  const regionCode = langParts[1] || "";
  const regionMap: Record<string, string> = {
    US: "United States", GB: "United Kingdom", UK: "United Kingdom",
    AU: "Australia", CA: "Canada", IN: "India", IE: "Ireland",
    NZ: "New Zealand", ZA: "South Africa", SG: "Singapore",
    NG: "Nigeria", PH: "Philippines", HK: "Hong Kong",
  };
  const accent = regionMap[regionCode.toUpperCase()] || regionCode;
  const langName = langParts[0] === "en" ? "English" : v.lang;
  return `${v.name} — ${langName}${accent ? ` — ${accent}` : ""}`;
}

function voicePriority(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  if (name.includes("google")) return 0;
  if (name.includes("microsoft")) return 1;
  if (name.includes("neural") || name.includes("natural")) return 2;
  if (v.lang.startsWith("en")) return 3;
  return 4;
}

function sortVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => voicePriority(a) - voicePriority(b));
}

function pickBestEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.startsWith("en"));
  if (english.length === 0) return voices[0] || null;
  return sortVoices(english)[0];
}

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
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

  // Browser voices
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const userPickedVoiceRef = useRef(false);

  const phaseRef = useRef<CallPhase>("idle");
  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const recognitionBusyRef = useRef(false);
  const conversationRef = useRef<{ role: string; content: string }[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emptyRetryRef = useRef(0);
  const selectedLangRef = useRef(selectedLang);
  const selectedModeRef = useRef(selectedMode);
  const selectedVoiceURIRef = useRef(selectedVoiceURI);

  const setPhaseSync = useCallback((p: CallPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { selectedLangRef.current = selectedLang; }, [selectedLang]);
  useEffect(() => { selectedModeRef.current = selectedMode; }, [selectedMode]);
  useEffect(() => { selectedVoiceURIRef.current = selectedVoiceURI; }, [selectedVoiceURI]);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  // Load browser voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        const sorted = sortVoices(voices);
        setAvailableVoices(sorted);
        if (!userPickedVoiceRef.current) {
          const best = pickBestEnglishVoice(voices);
          if (best) {
            setSelectedVoiceURI(best.voiceURI);
            selectedVoiceURIRef.current = best.voiceURI;
          }
        }
      }
    };
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const processUtteranceRef = useRef<(text: string) => Promise<void>>();
  const startListeningRef = useRef<() => void>();

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
    recognitionBusyRef.current = false;
  }, []);

  const killSpeech = useCallback(() => {
    speechSynthesis.cancel();
  }, []);

  const setupAudioAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
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
    let langInstruction = "";
    if (lang === "pcm") {
      langInstruction = `The user is speaking Nigerian Pidgin English. The speech transcript may be imperfect — interpret the meaning naturally even if words are misspelled or run together. Reply fully in Pidgin. Be warm, supportive, and emotionally present.`;
    } else if (lang === "yo") {
      langInstruction = `The user is speaking Yoruba. Interpret naturally even if tonal marks are missing. Reply fully in Yoruba. Be warm, supportive, and emotionally present.`;
    } else if (lang === "ig") {
      langInstruction = `The user is speaking Igbo. Interpret naturally even if diacritics are missing. Reply fully in Igbo. Be warm, supportive, and emotionally present.`;
    } else if (lang === "ha") {
      langInstruction = `The user is speaking Hausa. Interpret naturally even if diacritics are missing. Reply fully in Hausa. Be warm, supportive, and emotionally present.`;
    } else if (lang !== "en") {
      langInstruction = `The user is speaking in ${langInfo?.label}. Respond in the same language.`;
    }

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

      if (!resp.body) throw new Error("No response body");

      let fullText = "";
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { streamDone = true; break; }
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) fullText += c;
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }

      if (buf.trim()) {
        for (let raw of buf.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch {}
        }
      }

      return fullText;
    };

    let lastError: Error | null = null;
    for (let i = 0; i <= retries; i++) {
      try {
        const result = await attempt();
        if (result.trim().length > 0) {
          conversationRef.current.push({ role: "assistant", content: result });
          return result;
        }
        lastError = new Error("AI returned empty response");
        if (i < retries) await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        lastError = err as Error;
        if (i < retries) await new Promise((r) => setTimeout(r, 1000));
      }
    }

    conversationRef.current.pop();
    throw lastError!;
  }, []);

  /* ── Browser TTS via speechSynthesis ── */
  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (!activeRef.current) { resolve(); return; }

      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/#{1,6}\s/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[`~]/g, "")
        .replace(/[💚🌱✨🫂]/g, "")
        .trim();

      if (!cleanText) { resolve(); return; }

      // Cancel any ongoing speech first
      speechSynthesis.cancel();

      // Wait a tick for cancel to clear
      setTimeout(() => {
        if (!activeRef.current) { resolve(); return; }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.volume = 1.0;
        utterance.rate = 0.92;
        utterance.pitch = 1.05;

        // Find the selected voice
        const voices = speechSynthesis.getVoices();
        const voiceURI = selectedVoiceURIRef.current;
        const voice = voices.find((v) => v.voiceURI === voiceURI);
        if (voice) utterance.voice = voice;

        utterance.onstart = () => {
          if (activeRef.current) setPhaseSync("speaking");
        };

        utterance.onend = () => {
          resolve();
        };

        utterance.onerror = (e) => {
          console.warn("[Voice] speechSynthesis error:", e.error);
          resolve();
        };

        speechSynthesis.speak(utterance);
      }, 50);
    });
  }, [setPhaseSync]);

  // The main listening function
  const startListening = useCallback(() => {
    if (!activeRef.current || mutedRef.current) return;
    if (recognitionBusyRef.current) return;
    if (phaseRef.current !== "idle") return;

    killRecognition();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported. Try Chrome.");
      return;
    }

    recognitionBusyRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let captured = false;

    recognition.onstart = () => {
      setPhaseSync("listening");
      setCurrentPartial("");
    };

    recognition.onresult = (event: any) => {
      if (captured) return;
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }
      if (finalText.trim().length >= 2) {
        captured = true;
        recognitionBusyRef.current = false;
        killRecognition();
        emptyRetryRef.current = 0;
        setPhaseSync("processing");
        setCurrentPartial("");
        processUtteranceRef.current?.(finalText.trim());
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      recognitionBusyRef.current = false;

      if (!activeRef.current || captured) return;

      if (emptyRetryRef.current < 1) {
        emptyRetryRef.current++;
        setPhaseSync("idle");
        clearTimer();
        timerRef.current = setTimeout(() => {
          if (activeRef.current && !mutedRef.current) {
            startListeningRef.current?.();
          }
        }, 600);
      } else {
        emptyRetryRef.current = 0;
        const retryMsg = "I didn't quite catch that. Could you say it again?";
        setTranscript((prev) => [...prev, { role: "assistant", text: retryMsg }]);
        setPhaseSync("processing");
        speakText(retryMsg).then(() => {
          if (!activeRef.current) return;
          setPhaseSync("idle");
          clearTimer();
          timerRef.current = setTimeout(() => {
            if (activeRef.current && !mutedRef.current) {
              startListeningRef.current?.();
            }
          }, 700);
        });
      }
    };

    recognition.onerror = (e: any) => {
      recognitionRef.current = null;
      recognitionBusyRef.current = false;

      if (captured) return;
      if (e.error === "not-allowed") {
        toast.error("Microphone access denied.");
        return;
      }
      if (e.error === "aborted") return;
      if (activeRef.current) {
        setPhaseSync("idle");
        clearTimer();
        timerRef.current = setTimeout(() => {
          if (activeRef.current && !mutedRef.current) {
            startListeningRef.current?.();
          }
        }, 1000);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      recognitionBusyRef.current = false;
      setPhaseSync("idle");
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (activeRef.current && !mutedRef.current) {
          startListeningRef.current?.();
        }
      }, 500);
    }
  }, [killRecognition, setPhaseSync, clearTimer, speakText]);

  const processUtterance = useCallback(async (userText: string) => {
    if (!activeRef.current) return;

    killRecognition();
    setCurrentPartial("");
    setPhaseSync("processing");
    setTranscript((prev) => [...prev, { role: "user", text: userText }]);

    let aiResponse = "";
    try {
      aiResponse = await getAIResponse(userText);
    } catch (err) {
      console.error("[Voice] AI failed:", err);
    }

    if (!activeRef.current) return;

    if (!aiResponse || aiResponse.trim().length === 0) {
      aiResponse = "I hear you. Could you tell me a bit more about how you're feeling?";
      conversationRef.current.push({ role: "assistant", content: aiResponse });
    }

    setTranscript((prev) => [...prev, { role: "assistant", text: aiResponse }]);

    try {
      await speakText(aiResponse);
    } catch (err) {
      console.error("[Voice] TTS failed:", err);
    }

    if (!activeRef.current) return;

    recognitionBusyRef.current = false;
    setPhaseSync("idle");
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (activeRef.current && !mutedRef.current) {
        startListeningRef.current?.();
      }
    }, 700);
  }, [getAIResponse, speakText, killRecognition, setPhaseSync, clearTimer]);

  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);
  useEffect(() => { processUtteranceRef.current = processUtterance; }, [processUtterance]);

  const startCall = useCallback(async () => {
    activeRef.current = true;
    recognitionBusyRef.current = false;
    setCallActive(true);
    setTranscript([]);
    setPhaseSync("processing");
    conversationRef.current = [];
    emptyRetryRef.current = 0;

    // iOS audio unlock
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      await ctx.resume();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      setTimeout(() => ctx.close().catch(() => {}), 100);
    } catch {}

    await setupAudioAnalyser();

    const greeting = "Hi, this is your Uprising Companion. I'm here to listen and support you. How are you doing today?";

    setTranscript([{ role: "assistant", text: greeting }]);
    conversationRef.current.push({ role: "assistant", content: greeting });

    try {
      await speakText(greeting);
    } catch {}

    if (!activeRef.current) return;

    setPhaseSync("idle");
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (activeRef.current && !mutedRef.current) {
        startListeningRef.current?.();
      }
    }, 700);
  }, [setupAudioAnalyser, speakText, setPhaseSync, clearTimer]);

  const endCall = useCallback(() => {
    activeRef.current = false;
    recognitionBusyRef.current = false;
    clearTimer();
    killRecognition();
    killSpeech(); // Cancel all browser speech immediately

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
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, [clearTimer, killRecognition, killSpeech, setPhaseSync]);

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
          if (activeRef.current && !mutedRef.current) startListeningRef.current?.();
        }, 500);
      }
      return newMuted;
    });
  }, [killRecognition, setPhaseSync, clearTimer]);

  const handleTextSubmit = useCallback(() => {
    const text = textInput.trim();
    if (!text || !activeRef.current) return;
    if (phaseRef.current === "processing" || phaseRef.current === "speaking") return;

    killRecognition();
    setTextInput("");
    processUtterance(text);
  }, [textInput, killRecognition, processUtterance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      recognitionBusyRef.current = false;
      clearTimer();
      speechSynthesis.cancel();
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch { try { recognitionRef.current.stop(); } catch {} }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [clearTimer]);

  const isListening = phase === "listening";
  const isSpeaking = phase === "speaking";
  const isProcessing = phase === "processing";

  // Get current voice name for display
  const currentVoiceName = availableVoices.find((v) => v.voiceURI === selectedVoiceURI)?.name || "Default";

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

        {/* Voice picker — Browser voices */}
        <div className="space-y-2">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" /> Voice
          </p>
          {availableVoices.length > 0 ? (
            <Select
              value={selectedVoiceURI}
              onValueChange={(uri) => {
                userPickedVoiceRef.current = true;
                setSelectedVoiceURI(uri);
                selectedVoiceURIRef.current = uri;
              }}
            >
              <SelectTrigger className="w-full bg-white/10 border-white/20 text-white text-sm rounded-xl h-11 [&>span]:text-white/80">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent className="max-h-60 bg-[#1a2e23] border-white/20">
                {availableVoices.map((v) => (
                  <SelectItem
                    key={v.voiceURI}
                    value={v.voiceURI}
                    className="text-white/80 text-sm focus:bg-white/10 focus:text-white"
                  >
                    <span className="block truncate text-xs">
                      {getVoiceLabel(v)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-white/40 text-xs italic">Loading voices...</p>
          )}
        </div>

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
          🎙️ Microphone access required · Browser voice
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
          {modes.find((m) => m.id === selectedMode)?.label} ·{" "}
          {currentVoiceName}
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

      {/* Text input fallback */}
      <AnimatePresence>
        {showTextInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTextSubmit();
              }}
              placeholder="Type your message..."
              disabled={isProcessing || isSpeaking}
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/40 disabled:opacity-40"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isProcessing || isSpeaking}
              className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center disabled:opacity-30 transition-all"
            >
              <Send className="w-5 h-5 text-white" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleMute}
          className={`w-13 h-13 rounded-full flex items-center justify-center border transition-all ${
            muted
              ? "bg-red-500/20 border-red-400/30"
              : "bg-white/10 border-white/20"
          }`}
        >
          {muted ? (
            <MicOff className="w-5 h-5 text-red-300" />
          ) : (
            <Mic className="w-5 h-5 text-white" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowTextInput(!showTextInput)}
          className={`w-13 h-13 rounded-full flex items-center justify-center border transition-all ${
            showTextInput
              ? "bg-white/20 border-white/40"
              : "bg-white/10 border-white/20"
          }`}
        >
          <Keyboard className="w-5 h-5 text-white" />
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
          className={`w-13 h-13 rounded-full flex items-center justify-center border transition-all ${
            showTranscript
              ? "bg-white/20 border-white/40"
              : "bg-white/10 border-white/20"
          }`}
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </motion.button>
      </div>
    </div>
  );
};

export default VoiceCompanion;
