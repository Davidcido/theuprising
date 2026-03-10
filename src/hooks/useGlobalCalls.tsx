import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useCallSignaling, type CallEvent, type CallSignal, type CallState } from "./useCallSignaling";
import { useAuthReady } from "./useAuthReady";
import { supabase } from "@/integrations/supabase/client";
import IncomingCallModal from "@/components/calls/IncomingCallModal";

type GlobalCallContext = {
  callState: CallState;
  incomingCall: CallSignal | null;
  activeCallUserId: string | null;
  activeCallType: "voice" | "video";
  activeConversationId: string | null;
  localMediaStream: MediaStream | null;
  remoteMediaStream: MediaStream | null;
  startCall: (targetId: string, conversationId: string, callType: "voice" | "video") => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: (skipSignal?: boolean) => void;
};

const CallContext = createContext<GlobalCallContext | null>(null);

export const useGlobalCalls = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useGlobalCalls must be used within GlobalCallProvider");
  return ctx;
};

export const GlobalCallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuthReady();
  const userId = user?.id;

  const handleCallEvent = useCallback(async (event: CallEvent) => {
    // Wrap in try-catch to prevent call events from crashing the app
    try {
      if (!userId || !event.conversationId) return;
      const icon = event.callType === "video" ? "📹" : "📞";
      const typeLabel = event.callType === "video" ? "video" : "voice";
      let content = "";

      if (event.type === "started") {
        content = `${icon} You started a ${typeLabel} call`;
      } else if (event.type === "missed") {
        content = `${icon} Missed ${typeLabel} call`;
      } else if (event.type === "ended" && event.duration) {
        const mins = Math.floor(event.duration / 60);
        const secs = event.duration % 60;
        const dur = mins > 0 ? `${mins}m ${secs.toString().padStart(2, "0")}s` : `${secs}s`;
        content = `${icon} ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} call ended — duration ${dur}`;
      } else if (event.type === "rejected") {
        content = `${icon} ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} call declined`;
      }

      if (content) {
        await supabase.from("direct_messages").insert({
          conversation_id: event.conversationId,
          sender_id: userId,
          content,
          attachment_type: "system",
        } as any);
      }
    } catch (e) {
      console.error("[GlobalCalls] handleCallEvent error:", e);
    }
  }, [userId]);

  const call = useCallSignaling(userId, handleCallEvent);

  return (
    <CallContext.Provider value={call}>
      {/* Global incoming call modal - shows on ANY page */}
      {call.incomingCall && call.callState === "ringing" && (
        <IncomingCallModal
          signal={call.incomingCall}
          onAccept={call.acceptCall}
          onReject={call.rejectCall}
        />
      )}
      {children}
    </CallContext.Provider>
  );
};
