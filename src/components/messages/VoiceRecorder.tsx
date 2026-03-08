import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Play, Pause, Send, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Props = {
  onSend: (blob: Blob) => Promise<void>;
  onCancel: () => void;
  onStateChange?: (isActive: boolean) => void;
};

type RecordingState = "idle" | "recording" | "paused" | "preview";

const VoiceRecorder = ({ onSend, onCancel }: Props) => {
  const [state, setState] = useState<RecordingState>("idle");
  const [time, setTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<number>(0);
  const sendingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [audioUrl]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick a supported mime type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("preview");
        stream.getTracks().forEach((t) => t.stop());
      };

      // Use timeslice to collect data in chunks for better pause support
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setState("recording");
      setTime(0);
      setPlaybackProgress(0);
      startTimer();
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      stopTimer();
      setState("paused");
    }
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "paused") {
      recorder.resume();
      startTimer();
      setState("recording");
    }
  };

  const stopRecording = () => {
    stopTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const handleCancel = () => {
    stopTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      // Prevent onstop from setting preview state
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl("");
    setState("idle");
    setTime(0);
    setPlaybackProgress(0);
    setIsPlaying(false);
    onCancel();
  };

  const handleSend = async () => {
    if (!audioBlob || sendingRef.current) return;
    sendingRef.current = true;
    setIsSending(true);
    try {
      await onSend(audioBlob);
      onCancel();
    } catch {
      toast({ title: "Failed to send voice note", variant: "destructive" });
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  // Playback progress animation loop
  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.duration) && audio.duration > 0) {
      setPlaybackProgress((audio.currentTime / audio.duration) * 100);
    }
    animRef.current = requestAnimationFrame(updateProgress);
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      cancelAnimationFrame(animRef.current);
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      animRef.current = requestAnimationFrame(updateProgress);
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackProgress(0);
    cancelAnimationFrame(animRef.current);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
    setPlaybackProgress(pct * 100);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Idle state - just the mic button
  if (state === "idle") {
    return (
      <button
        onClick={startRecording}
        className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-muted-foreground hover:text-foreground hover:bg-white/15 transition-colors shrink-0"
        aria-label="Record voice message"
      >
        <Mic className="w-4 h-4" />
      </button>
    );
  }

  // Preview state - listen before sending
  if (state === "preview") {
    return (
      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/15">
        {/* Play/Pause */}
        <button
          onClick={togglePlayback}
          className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0 hover:bg-emerald-500/40 transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-foreground" />
          ) : (
            <Play className="w-3.5 h-3.5 text-foreground ml-0.5" />
          )}
        </button>

        {/* Progress bar */}
        <div className="flex-1 flex flex-col gap-1">
          <div
            className="h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-emerald-400 rounded-full transition-[width] duration-75"
              style={{ width: `${playbackProgress}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">
            🎤 {formatTime(time)}
          </span>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnded}
          preload="auto"
          className="hidden"
        />

        {/* Cancel */}
        <button
          onClick={handleCancel}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          disabled={isSending}
          aria-label="Discard recording"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={isSending}
          className="p-2 rounded-xl text-foreground disabled:opacity-50 transition-opacity"
          style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
          aria-label="Send voice message"
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    );
  }

  // Recording / Paused state
  return (
    <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
      {/* Recording indicator */}
      {state === "recording" && (
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
      {state === "paused" && (
        <span className="w-2 h-2 bg-yellow-500 rounded-full" />
      )}

      <span className="text-sm text-red-400 font-medium tabular-nums">
        {formatTime(time)}
      </span>

      {state === "paused" && (
        <span className="text-[10px] text-yellow-400/80 uppercase tracking-wider font-medium">
          Paused
        </span>
      )}

      <div className="flex-1" />

      {/* Pause / Resume */}
      {state === "recording" ? (
        <button
          onClick={pauseRecording}
          className="p-1.5 rounded-full bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
          aria-label="Pause recording"
        >
          <Pause className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={resumeRecording}
          className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
          aria-label="Resume recording"
        >
          <Mic className="w-4 h-4" />
        </button>
      )}

      {/* Stop → go to preview */}
      <button
        onClick={stopRecording}
        className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        aria-label="Stop recording"
      >
        <Square className="w-4 h-4" />
      </button>

      {/* Cancel */}
      <button
        onClick={handleCancel}
        className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Cancel recording"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
};

export default VoiceRecorder;
