import { motion } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import type { CallSignal } from "@/hooks/useCallSignaling";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface IncomingCallModalProps {
  signal: CallSignal;
  onAccept: () => void;
  onReject: () => void;
}

// Generate a ringtone using Web Audio API
const createRingtone = (): { start: () => void; stop: () => void } => {
  let audioCtx: AudioContext | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isActive = false;

  const playTone = () => {
    if (!audioCtx || audioCtx.state === "closed") return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.setValueAtTime(480, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  };

  return {
    start: () => {
      if (isActive) return;
      isActive = true;
      try {
        audioCtx = new AudioContext();
        playTone();
        intervalId = setInterval(() => {
          if (audioCtx && audioCtx.state !== "closed") playTone();
        }, 1500);
      } catch (e) {
        console.error("Ringtone error:", e);
      }
    },
    stop: () => {
      isActive = false;
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
        audioCtx = null;
      }
    },
  };
};

const IncomingCallModal = ({ signal, onAccept, onReject }: IncomingCallModalProps) => {
  const [callerName, setCallerName] = useState("User");
  const [callerAvatar, setCallerAvatar] = useState<string | null>(null);
  const ringtoneRef = useRef<ReturnType<typeof createRingtone> | null>(null);

  useEffect(() => {
    supabase.from("profiles").select("display_name, avatar_url").eq("user_id", signal.caller_id).single()
      .then(({ data }) => {
        if (data) {
          setCallerName(data.display_name || "User");
          setCallerAvatar(data.avatar_url);
        }
      });
  }, [signal.caller_id]);

  // Start ringtone on mount, stop on unmount
  useEffect(() => {
    const ringtone = createRingtone();
    ringtoneRef.current = ringtone;
    ringtone.start();
    return () => { ringtone.stop(); };
  }, []);

  const handleAccept = () => {
    ringtoneRef.current?.stop();
    onAccept();
  };

  const handleReject = () => {
    ringtoneRef.current?.stop();
    onReject();
  };

  const isVideo = signal.call_type === "video";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        className="rounded-3xl p-8 flex flex-col items-center max-w-sm w-full mx-4 border border-white/15"
        style={{ background: "linear-gradient(135deg, #155E3A, #0F5132)" }}
      >
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          <UserAvatar avatarUrl={callerAvatar} displayName={callerName} size="xl" />
        </motion.div>
        <h3 className="text-white text-lg font-bold mt-4">{callerName}</h3>
        <p className="text-white/60 text-sm mt-1">
          Incoming {isVideo ? "video" : "voice"} call...
        </p>
        <p className="text-white/40 text-xs mt-2">
          {isVideo ? "📹" : "📞"} {isVideo ? "Video" : "Voice"} call from {callerName}
        </p>

        <div className="flex gap-8 mt-8">
          <button
            onClick={handleReject}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
          <button
            onClick={handleAccept}
            className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-lg animate-pulse"
          >
            {isVideo ? <Video className="w-7 h-7 text-white" /> : <Phone className="w-7 h-7 text-white" />}
          </button>
        </div>

        <div className="flex gap-4 mt-4 text-xs text-white/40">
          <span>Decline</span>
          <span>Accept</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default IncomingCallModal;
