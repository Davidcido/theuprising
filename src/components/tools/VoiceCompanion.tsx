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
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

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
    let langInstruction = "";
    if (lang === "pcm") {
      langInstruction = `The user is speaking Nigerian Pidgin English. The speech transcript may be imperfect — interpret the meaning naturally even if words are misspelled or run together.

Common Pidgin vocabulary and phrases:
- Greetings: "how far" (how are you), "how body" (how are you feeling), "how e dey go" (how's it going), "wetin dey sup" (what's up)
- Emotions: "I no too good today" (I'm not feeling well), "my heart heavy" (I'm sad), "e dey pain me" (it hurts me), "I dey vex" (I'm angry), "I dey fear" (I'm scared), "I tire" / "I don tire" (I'm exhausted/fed up), "my mind no dey rest" (I'm anxious), "I dey feel somehow" (I feel off/uneasy), "e dey do me somehow" (something feels wrong), "I happy well well" (I'm very happy)
- States: "I dey" (I'm here/I'm fine), "I dey kampe" (I'm good), "I no fit again" (I can't anymore), "I wan give up" (I want to give up), "e too much for me" (it's overwhelming), "I dey try" (I'm trying), "I dey manage" (I'm coping), "nothing dey happen" (nothing is working out)
- Expressions: "no wahala" (no problem), "na so" (that's how it is), "e don tey" (it's been a while), "abeg" (please), "sha" (though/anyway), "abi" (right?/isn't it?), "shey" (is it that/right?), "ehen" (yes/go on), "walahi" (I swear), "na God" (it's God/only God), "e go better" (it will get better), "God dey" (God exists/is watching)
- Actions: "I wan yarn" (I want to talk), "make we talk" (let's talk), "I need person wey go hear me" (I need someone to listen), "nobody dey hear me" (nobody listens to me), "I dey think too much" (I'm overthinking), "sleep no dey come" (I can't sleep), "I no fit chop" (I can't eat)
- Relationships: "my person" (my partner/close one), "we dey quarrel" (we're fighting), "e leave me" / "she leave me" (they left me), "I dey lonely" (I'm lonely), "my family no understand" (my family doesn't understand), "dem dey pressure me" (they're pressuring me)
- School/Work: "school wahala" (school stress), "I no fit cope" (I can't cope), "exam dey worry me" (exams stress me), "oga dey stress me" (my boss is stressing me)

Language interpretation process:
1. First, internally interpret the user's Pidgin into clear English meaning — even if the transcript has typos, merged words, or phonetic spelling.
2. Understand the emotional intent and context behind what they said.
3. Generate your response in natural Nigerian Pidgin that matches the user's tone.
Never expose the English interpretation to the user — always reply fully in Pidgin. Be warm, supportive, and emotionally present.`;
    } else if (lang === "yo") {
      langInstruction = `The user is speaking Yoruba. The speech transcript may be imperfect — interpret the meaning naturally even if tonal marks are missing or words are transliterated.

Common Yoruba vocabulary and phrases:
- Greetings: "bawo ni" (how are you), "e kaaro" (good morning), "e kaasan" (good afternoon), "e kaaale" (good evening), "se daadaa ni" (are you well?), "pele o" (sorry/sympathy greeting)
- Emotions: "inu mi dun" (I'm happy), "inu mi bajẹ" (I'm sad/upset), "mo n binu" (I'm angry), "mo n bẹru" (I'm scared), "ara mi ko da" (I'm not feeling well), "okan mi ko balẹ" (my heart is unsettled/I'm anxious), "mo ti arẹ" (I'm tired), "ori mi wu mi" (I'm confused/overwhelmed), "mo ni ireti" (I have hope), "aye mi daru" (my life is troubled)
- States: "mo wa" (I'm here), "mo dara" (I'm fine), "ko si wahala" (no problem), "mo n gbiyanju" (I'm trying), "ko le ye mi" (I can't understand), "o ti pọ ju" (it's too much), "mi o le mọ" (I can't anymore), "mo fẹ fi silẹ" (I want to give up)
- Expressions: "Oluwa maa je" (God will provide), "a o ni ku" (we won't die/it will be okay), "e ma binu" (don't be angry), "o da mi loju" (I'm sure), "Olorun lo mọ" (only God knows), "e jọọ" (please), "mo dupẹ" (thank you), "ẹ ku isẹ" (well done), "rara" (no), "bẹẹni" (yes)
- Actions: "mo fẹ sọrọ" (I want to talk), "gbọ mi" (listen to me), "ẹ ran mi lọwọ" (help me), "mo n ronú pupọ" (I'm overthinking), "orun ko gba mi" (I can't sleep), "mi o le jẹun" (I can't eat)
- Relationships: "ololufe mi" (my loved one), "a n ja" (we're fighting), "o fi mi silẹ" (they left me), "idile mi ko ye mi" (my family doesn't understand me), "mo ti sùn mọlẹ" (I feel alone), "wọn n fi ipa ba mi" (they're pressuring me)
- School/Work: "ile-iwe n da mi lamu" (school is stressing me), "idanwo n ba mi ninu jẹ" (exams are worrying me), "isẹ n pa mi" (work is killing me)

Language interpretation process:
1. First, internally interpret the user's Yoruba into clear English meaning — even if tonal marks are missing, words are phonetically spelled, or the transcript is fragmented.
2. Understand the emotional intent and context behind what they said.
3. Generate your response in natural Yoruba that matches the user's tone.
Never expose the English interpretation to the user — always reply fully in Yoruba. Be warm, supportive, and emotionally present.`;
    } else if (lang === "ig") {
      langInstruction = `The user is speaking Igbo. The speech transcript may be imperfect — interpret the meaning naturally even if words are transliterated or tonal marks are missing.

Common Igbo vocabulary and phrases:
- Greetings: "kedu" (how are you), "nnọọ" (welcome), "ụtụtụ ọma" (good morning), "ehihie ọma" (good afternoon), "anyasị ọma" (good evening), "i meela" (thank you/well done), "kedu ka ị mere" (how are you doing)
- Emotions: "obi dị m ụtọ" (I'm happy), "obi na-ewu m ewu" (I'm sad), "iwe na-ewe m" (I'm angry), "ụjọ na-atụ m" (I'm scared), "ahụ adịghị m mma" (I'm not well), "obi m adịghị mma" (my heart is not well/I'm upset), "ike gwụrụ m" (I'm exhausted), "isi na-awụ m" (I'm confused), "enweghị m olileanya" (I have no hope), "ndụ siri m ike" (life is hard for me)
- States: "a nọ m" (I'm here), "ọ dị mma" (it's fine/I'm good), "enweghi nsogbu" (no problem), "a na m agba mbọ" (I'm trying), "ọ karịrị m" (it's beyond me), "a pụghị m ịnagide" (I can't endure anymore), "achọrọ m ịhapụ" (I want to quit)
- Expressions: "Chukwu mara" (God knows), "ọ ga-adị mma" (it will be fine), "biko" (please), "nwanne" (sibling/friend), "daalụ" (thank you), "ọ dị egwu" (it's serious), "chineke m" (my God - exclamation), "ewoo" (exclamation of distress), "ndo" (sorry/sympathy)
- Actions: "achọrọ m ịkọrọ gị" (I want to tell you), "gee m ntị" (listen to me), "nyere m aka" (help me), "a na m eche echiche ọtụtụ" (I'm overthinking), "ụra adịghị abịa m" (I can't sleep), "apụghị m iri nri" (I can't eat)
- Relationships: "onye m hụrụ n'anya" (my loved one), "anyị na-alụ ọgụ" (we're fighting), "o hapụrụ m" (they left me), "ezinụlọ m aghọtaghị m" (my family doesn't understand me), "a nọ m naanị m" (I'm alone), "ha na-abọ m" (they're pressuring me)
- School/Work: "akwụkwọ na-enye m nsogbu" (school is giving me problems), "ule na-enye m nchegbu" (exams are worrying me), "ọrụ na-egbu m" (work is killing me)

Language interpretation process:
1. First, internally interpret the user's Igbo into clear English meaning — even if diacritics are missing, words are phonetically spelled, or the transcript is fragmented.
2. Understand the emotional intent and context behind what they said.
3. Generate your response in natural Igbo that matches the user's tone.
Never expose the English interpretation to the user — always reply fully in Igbo. Be warm, supportive, and emotionally present.`;
    } else if (lang === "ha") {
      langInstruction = `The user is speaking Hausa. The speech transcript may be imperfect — interpret the meaning naturally even if words are transliterated or diacritics are missing.

Common Hausa vocabulary and phrases:
- Greetings: "sannu" (hello), "ina kwana" (good morning/how did you sleep), "ina wuni" (good afternoon/how's your day), "yaya dai" (how are you), "lafiya lau" (I'm fine), "barka da zuwa" (welcome), "yaya gida" (how's home/family)
- Emotions: "ina farin ciki" (I'm happy), "ba ni da daɗi" (I'm not happy), "ina baƙin ciki" (I'm sad), "ina fushi" (I'm angry), "ina tsoro" (I'm scared), "jiki na ba ni daɗi ba" (I'm not feeling well), "zuciya na cike" (my heart is full/overwhelmed), "na gaji" (I'm tired/exhausted), "kai na yi mini hauka" (I'm confused), "ban da bege" (I have no hope), "rayuwa ta yi mini wuya" (life is hard for me)
- States: "ina nan" (I'm here), "lafiya" (I'm fine), "babu matsala" (no problem), "ina ƙoƙari" (I'm trying), "ya fi ƙarfi na" (it's beyond me), "ba zan iya ba" (I can't anymore), "ina so in daina" (I want to quit), "ina jurewa" (I'm enduring)
- Expressions: "Allah ya sani" (God knows), "za a yi" (it will be done/it'll be okay), "don Allah" (please/for God's sake), "na gode" (thank you), "madalla" (well done), "ya isa" (it's enough), "wallahi" (I swear), "subhanallah" (exclamation of awe), "innalillahi" (exclamation of grief), "Allah ya taimaka" (God help)
- Actions: "ina so in yi magana" (I want to talk), "ka saurare ni" (listen to me), "ka taimake ni" (help me), "ina tunani da yawa" (I'm overthinking), "barci ba ya zo mini" (I can't sleep), "ba zan iya ci ba" (I can't eat), "ina buƙatar wani" (I need someone)
- Relationships: "ƙaunataccen na" (my loved one), "muna faɗa" (we're fighting), "ya/ta bar ni" (they left me), "iyali na ba su fahimce ni ba" (my family doesn't understand me), "ina kaɗaici" (I'm lonely), "suna matsa mini" (they're pressuring me)
- School/Work: "makaranta na damun ni" (school is bothering me), "jarrabawa na ba ni tsoro" (exams scare me), "aiki ya yi mini yawa" (work is too much for me)

Language interpretation process:
1. First, internally interpret the user's Hausa into clear English meaning — even if diacritics are missing, words are phonetically spelled, or the transcript is fragmented.
2. Understand the emotional intent and context behind what they said.
3. Generate your response in natural Hausa that matches the user's tone.
Never expose the English interpretation to the user — always reply fully in Hausa. Be warm, supportive, and emotionally present.`;
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

  // Cached best voice ref to avoid repeated lookups
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voicesLoadedRef = useRef(false);

  // Load and select the best available voice
  const loadBestVoice = useCallback((): Promise<SpeechSynthesisVoice | null> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(null); return; }

      const pickBest = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) return null;

        // Priority order: Google > Microsoft > other high-quality > any English
        const googleEn = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"));
        if (googleEn) return googleEn;

        const microsoftEn = voices.find(v => v.name.includes("Microsoft") && v.lang.startsWith("en") && !v.name.includes("David"));
        if (microsoftEn) return microsoftEn;

        // Prefer non-local (network) voices as they tend to be higher quality
        const networkEn = voices.find(v => v.lang.startsWith("en") && !v.localService);
        if (networkEn) return networkEn;

        const localEn = voices.find(v => v.lang.startsWith("en") && v.localService);
        if (localEn) return localEn;

        return voices.find(v => v.lang.startsWith("en")) || null;
      };

      // If voices are already loaded
      const existing = pickBest();
      if (existing) {
        bestVoiceRef.current = existing;
        voicesLoadedRef.current = true;
        resolve(existing);
        return;
      }

      // Wait for voices to load (needed on many mobile browsers)
      const onChanged = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onChanged);
        const voice = pickBest();
        bestVoiceRef.current = voice;
        voicesLoadedRef.current = true;
        resolve(voice);
      };
      window.speechSynthesis.addEventListener("voiceschanged", onChanged);

      // Safety timeout — don't wait forever
      setTimeout(() => {
        window.speechSynthesis.removeEventListener("voiceschanged", onChanged);
        if (!voicesLoadedRef.current) {
          const voice = pickBest();
          bestVoiceRef.current = voice;
          voicesLoadedRef.current = true;
          resolve(voice);
        }
      }, 2000);
    });
  }, []);

  // Eagerly load voices on mount
  useEffect(() => {
    loadBestVoice();
  }, [loadBestVoice]);

  const speakWithBrowser = useCallback(async (text: string): Promise<void> => {
    if (!window.speechSynthesis) return;

    // Cancel ALL queued and ongoing speech first
    window.speechSynthesis.cancel();
    // Small delay after cancel to let the engine reset (needed on mobile)
    await new Promise(r => setTimeout(r, 100));

    // Ensure we have the best voice loaded
    if (!voicesLoadedRef.current) {
      await loadBestVoice();
    }

    return new Promise<void>((resolve) => {
      // Double-check cancel to prevent queue stacking
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (bestVoiceRef.current) {
        utterance.voice = bestVoiceRef.current;
        console.log("Browser TTS using voice:", bestVoiceRef.current.name);
      }

      let resolved = false;
      const finish = () => { if (!resolved) { resolved = true; resolve(); } };

      utterance.onend = finish;
      utterance.onerror = (e) => {
        console.warn("Browser TTS error:", e);
        finish();
      };

      window.speechSynthesis.speak(utterance);

      // Chrome bug workaround: long utterances can pause silently
      // Periodically resume to keep speech going
      const keepAlive = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          clearInterval(keepAlive);
        }
      }, 10000);

      utterance.onend = () => { clearInterval(keepAlive); finish(); };
      utterance.onerror = (e) => { clearInterval(keepAlive); console.warn("Browser TTS error:", e); finish(); };
    });
  }, [loadBestVoice]);

  const speakText = useCallback(async (text: string): Promise<void> => {
    if (!activeRef.current) return;
    setPhaseSync("speaking");

    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`~]/g, "")
      .replace(/[💚🌱✨🫂]/g, "")
      .trim();

    // Try ElevenLabs with up to 2 retries before falling back to browser TTS
    let elevenLabsSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!activeRef.current) return;
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

        if (!resp.ok) throw new Error(`ElevenLabs failed (${resp.status})`);

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
        elevenLabsSuccess = true;
        break; // Success — exit retry loop
      } catch (err) {
        console.warn(`ElevenLabs TTS attempt ${attempt + 1}/3 failed:`, err);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 800));
      }
    }

    // Only use browser TTS as final fallback after all ElevenLabs retries exhausted
    if (!elevenLabsSuccess) {
      console.warn("All ElevenLabs attempts failed, using browser TTS fallback");
      if (!activeRef.current) return;
      try {
        await speakWithBrowser(cleanText);
      } catch (err) {
        console.error("Browser TTS also failed:", err);
      }
    }
  }, [setPhaseSync, speakWithBrowser]);

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
    // Always use English recognition for browser compatibility — AI interprets language internally
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = "";

    recognition.onstart = () => {
      clearTimer(); // Clear the 2s safety timeout — we successfully started
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
      recognitionRef.current = null;

      if (!activeRef.current) return;
      if (phaseRef.current !== "listening") return;

      const userText = finalText.trim();
      if (userText.length > 0) {
        processUtteranceRef.current?.(userText);
      } else {
        // No speech detected — restart after short delay
        setPhaseSync("cooldown");
        clearTimer();
        timerRef.current = setTimeout(() => {
          if (activeRef.current && !mutedRef.current) startListeningRef.current?.();
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
      if (activeRef.current) {
        setPhaseSync("cooldown");
        clearTimer();
        timerRef.current = setTimeout(() => {
          if (activeRef.current && !mutedRef.current) startListeningRef.current?.();
        }, 1000);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      // Safety timeout: if we don't reach "listening" within 2s, force retry
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (activeRef.current && !mutedRef.current && phaseRef.current !== "listening") {
          console.warn("SpeechRecognition stuck — retrying");
          killRecognition();
          // Retry after short delay
          timerRef.current = setTimeout(() => {
            if (activeRef.current && !mutedRef.current) startListeningRef.current?.();
          }, 500);
        }
      }, 2000);
    } catch {
      recognitionRef.current = null;
      // Retry once after a short delay
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (activeRef.current && !mutedRef.current) startListeningRef.current?.();
      }, 500);
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
        startListeningRef.current?.();
      }
    }, 700);
  }, [getAIResponse, speakText, killRecognition, setPhaseSync, clearTimer]);

  // Keep refs updated
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);
  useEffect(() => { processUtteranceRef.current = processUtterance; }, [processUtterance]);

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
        startListeningRef.current?.();
      }
    }, 700);
  }, [setupAudioAnalyser, speakText, setPhaseSync, clearTimer]);

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

    // Stop any active listening
    killRecognition();
    setTextInput("");
    processUtterance(text);
  }, [textInput, killRecognition, processUtterance]);

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
