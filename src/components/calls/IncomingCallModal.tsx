import { motion } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import type { CallSignal } from "@/hooks/useCallSignaling";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface IncomingCallModalProps {
  signal: CallSignal;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallModal = ({ signal, onAccept, onReject }: IncomingCallModalProps) => {
  const [callerName, setCallerName] = useState("User");
  const [callerAvatar, setCallerAvatar] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("profiles").select("display_name, avatar_url").eq("user_id", signal.caller_id).single()
      .then(({ data }) => {
        if (data) {
          setCallerName(data.display_name || "User");
          setCallerAvatar(data.avatar_url);
        }
      });
  }, [signal.caller_id]);

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
          Incoming {signal.call_type === "video" ? "video" : "voice"} call...
        </p>

        <div className="flex gap-8 mt-8">
          <button
            onClick={onReject}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-lg"
          >
            {signal.call_type === "video" ? <Video className="w-7 h-7 text-white" /> : <Phone className="w-7 h-7 text-white" />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default IncomingCallModal;
