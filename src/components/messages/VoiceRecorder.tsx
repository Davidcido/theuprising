import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Play, Pause, Send, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Props = {
  onSend: (blob: Blob) => Promise<void>;
  onCancel: () => void;
  onStateChange?: (isActive: boolean) => void;
};

type RecordingState = "idle" | "recording" | "paused" | "preview";

const MAX_RECORDING_SECONDS = 600; // 10 minutes

const VoiceRecorder = ({ onSend, onCancel, onStateChange }: Props) => {
  const [state, setState] = useState<RecordingState>("idle");
  const [time, setTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendingRef = useRef(false);

  // Create a persistent audio element on mount
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    audio.addEventListener("ended", handleAudioEnded);
    audio.addEventListener("loadedmetadata", handleMetadataLoaded);

    return () => {
      audio.removeEventListener("ended", handleAudioEnded);
      audio.removeEventListener("loadedmetadata", handleMetadataLoaded);
      audio.pause();
      audio.src = "";
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackProgress(0);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleMetadataLoaded = () => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.duration) && audio.duration > 0) {
      setAudioDuration(audio.duration);
    }
  };

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTime((t) => {
        const next = t + 1;
        if (next >= MAX_RECORDING_SECONDS) {
          // Auto-stop at max duration
          setTimeout(() => {
            stopRecording();
            toast({ title: `Maximum ${MAX_RECORDING_SECONDS / 60}-minute recording reached`, description: "Your voice note has been saved for preview." });
          }, 0);
        }
        return next;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startProgressTracking = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const audio = audioRef.current;
      if (audio && isFinite(audio.duration) && audio.duration > 0) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
      if (audio && audio.ended) {
        setIsPlaying(false);
        setPlaybackProgress(0);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }
    }, 50);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      // Use lower bitrate for smaller files (48kbps opus is good quality for voice)
      const recorderOptions: MediaRecorderOptions = { mimeType };
      if (mimeType.includes("opus")) {
        recorderOptions.audioBitsPerSecond = 48000;
      } else {
        recorderOptions.audioBitsPerSecond = 64000;
      }

      const recorder = new MediaRecorder(stream, recorderOptions);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        stream.getTracks().forEach((t) => t.stop());

        if (blob.size === 0) {
          toast({ title: "Recording failed — no audio captured", variant: "destructive" });
          resetState();
          return;
        }

        // Revoke old URL
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioBlob(blob);

        // Load into audio element
        const audio = audioRef.current;
        if (audio) {
          audio.src = url;
          audio.load();
          // Handle browsers that report Infinity duration initially
          audio.currentTime = 1e101;
          audio.addEventListener("timeupdate", function seekFix() {
            audio.removeEventListener("timeupdate", seekFix);
            audio.currentTime = 0;
            if (isFinite(audio.duration) && audio.duration > 0) {
              setAudioDuration(audio.duration);
            }
          });
        }

        setState("preview");
        setPlaybackProgress(0);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setState("recording");
      onStateChange?.(true);
      setTime(0);
      setPlaybackProgress(0);
      setAudioDuration(0);
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

  const resetState = () => {
    stopTimer();
    stopProgressTracking();
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setAudioBlob(null);
    setState("idle");
    setTime(0);
    setPlaybackProgress(0);
    setAudioDuration(0);
    setIsPlaying(false);
    onStateChange?.(false);
  };

  const handleCancel = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    resetState();
    onCancel();
  };

  const handleSend = async () => {
    if (!audioBlob || sendingRef.current) return;

    // Prevent sending 0-duration recordings
    if (time === 0 && audioDuration === 0) {
      toast({ title: "Recording too short. Please record again.", variant: "destructive" });
      resetState();
      return;
    }

    sendingRef.current = true;
    setIsSending(true);
    // Stop any playback before sending
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopProgressTracking();
    }
    try {
      await onSend(audioBlob);
      resetState();
      onCancel();
    } catch {
      toast({ title: "Failed to send voice note", variant: "destructive" });
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrlRef.current) return;

    if (isPlaying) {
      audio.pause();
      stopProgressTracking();
      setIsPlaying(false);
    } else {
      // Reset to start if ended
      if (audio.ended || audio.currentTime >= audio.duration) {
        audio.currentTime = 0;
        setPlaybackProgress(0);
      }
      audio.play().then(() => {
        setIsPlaying(true);
        startProgressTracking();
      }).catch((e) => {
        console.error("Playback error:", e);
        toast({ title: "Could not play audio", variant: "destructive" });
      });
    }
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

  // Idle state
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

  // Preview state
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

        {/* Progress bar + waveform indicator */}
        <div className="flex-1 flex flex-col gap-1">
          <div
            className="h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-emerald-400 rounded-full transition-[width] duration-75"
              style={{ width: `${playbackProgress}%` }}
            />
            {/* Playback dot indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full shadow-md transition-[left] duration-75"
              style={{ left: `calc(${playbackProgress}% - 6px)` }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">🎤 {formatTime(time)}</span>
            {isPlaying && (
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-emerald-400 rounded-full animate-pulse"
                    style={{
                      height: `${6 + Math.random() * 6}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: `${0.3 + Math.random() * 0.3}s`,
                    }}
                  />
                ))}
              </span>
            )}
          </div>
        </div>

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
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(150 40% 20%))" }}
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
      {state === "recording" && (
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
      {state === "paused" && (
        <span className="w-2 h-2 bg-yellow-500 rounded-full" />
      )}

      <span className="text-sm text-red-400 font-medium tabular-nums">
        {formatTime(time)} <span className="text-[10px] text-muted-foreground/50">/ {formatTime(MAX_RECORDING_SECONDS)}</span>
      </span>

      {/* Progress toward max duration */}
      {state === "recording" && (
        <div className="flex-1 max-w-[80px] h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-400/60 rounded-full transition-[width] duration-1000"
            style={{ width: `${Math.min(100, (time / MAX_RECORDING_SECONDS) * 100)}%` }}
          />
        </div>
      )}

      {state === "paused" && (
        <span className="text-[10px] text-yellow-400/80 uppercase tracking-wider font-medium">
          Paused
        </span>
      )}

      <div className="flex-1" />

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

      <button
        onClick={stopRecording}
        className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        aria-label="Stop recording"
      >
        <Square className="w-4 h-4" />
      </button>

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
