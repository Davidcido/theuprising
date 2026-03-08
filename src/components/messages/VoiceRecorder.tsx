import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Send, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Props = {
  onSend: (blob: Blob) => Promise<void>;
  onCancel: () => void;
};

type RecordingState = "idle" | "recording" | "paused" | "preview";

const VoiceRecorder = ({ onSend, onCancel }: Props) => {
  const [state, setState] = useState<RecordingState>("idle");
  const [time, setTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startTimer = () => {
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState("preview");
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setState("recording");
      startTimer();
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const pauseRecording = () => {
    mediaRecorderRef.current?.pause();
    stopTimer();
    setState("paused");
  };

  const resumeRecording = () => {
    mediaRecorderRef.current?.resume();
    startTimer();
    setState("recording");
  };

  const stopRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    await onSend(audioBlob);
    onCancel();
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (state === "idle") {
    return (
      <button
        onClick={startRecording}
        className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-white/60 hover:text-white hover:bg-white/15 transition-colors shrink-0"
      >
        <Mic className="w-4 h-4" />
      </button>
    );
  }

  if (state === "preview") {
    return (
      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/15">
        <button onClick={togglePlayback} className="p-1.5 rounded-full bg-emerald-500/30">
          {isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
        </button>
        <span className="text-xs text-white/60 flex-1">🎤 {formatTime(time)}</span>
        <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
        <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-white/10">
          <X className="w-3.5 h-3.5 text-white/40" />
        </button>
        <button onClick={handleSend} className="p-2 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Recording / Paused
  return (
    <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      <span className="text-sm text-red-400 font-medium">{formatTime(time)}</span>
      <div className="flex-1" />
      {state === "recording" ? (
        <button onClick={pauseRecording} className="p-1.5 rounded-full bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
          <Pause className="w-4 h-4" />
        </button>
      ) : (
        <button onClick={resumeRecording} className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
          <Mic className="w-4 h-4" />
        </button>
      )}
      <button onClick={stopRecording} className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30">
        <Square className="w-4 h-4" />
      </button>
      <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-white/10">
        <X className="w-3.5 h-3.5 text-white/40" />
      </button>
    </div>
  );
};

export default VoiceRecorder;
