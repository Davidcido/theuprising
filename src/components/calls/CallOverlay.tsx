import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, SwitchCamera } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import type { CallState } from "@/hooks/useCallSignaling";
import { toast } from "@/hooks/use-toast";

const MAX_CALL_DURATION = 4 * 60 * 60; // 4 hours in seconds

interface CallOverlayProps {
  callState: CallState;
  callType: "voice" | "video";
  otherUserName?: string;
  otherUserAvatar?: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
}

const CallOverlay = ({
  callState,
  callType,
  otherUserName,
  otherUserAvatar,
  localStream,
  remoteStream,
  onEndCall,
}: CallOverlayProps) => {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Timer with 4-hour auto-end
  useEffect(() => {
    if (callState !== "connected") { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        if (next >= MAX_CALL_DURATION) {
          toast({ title: "Call ended", description: "Maximum 4-hour call duration reached." });
          setTimeout(onEndCall, 0);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [callState, onEndCall]);

  useEffect(() => {
    if (remoteStream) {
      if (callType === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      } else if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callType]);

  useEffect(() => {
    if (localStream && localVideoRef.current && callType === "video") {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callType]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setMuted(!muted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setVideoOff(!videoOff);
    }
  };

  const toggleSpeaker = () => {
    // Toggle speaker by adjusting remote audio volume
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = speakerOn ? 0.15 : 1.0;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = speakerOn ? 0.15 : 1.0;
    }
    setSpeakerOn(!speakerOn);
  };

  const switchCamera = async () => {
    if (!localStream) return;
    const newFacing = facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        // Replace track in peer connection (if available via sender)
        oldVideoTrack.stop();
        localStream.removeTrack(oldVideoTrack);
        localStream.addTrack(newVideoTrack);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      setFacingMode(newFacing);
    } catch {
      toast({ title: "Could not switch camera", variant: "destructive" });
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (callState === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(180deg, #0a3d22 0%, #0F5132 50%, #155E3A 100%)" }}
      >
        {/* Remote video (fullscreen) */}
        {callType === "video" && callState === "connected" && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Audio element for voice calls */}
        {callType === "voice" && <audio ref={remoteAudioRef} autoPlay />}

        {/* Local video pip */}
        {callType === "video" && callState === "connected" && (
          <div className="absolute top-6 right-6 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl z-10">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
            />
          </div>
        )}

        {/* Calling / Ringing / Voice connected UI */}
        <div className={`relative z-10 flex flex-col items-center ${callType === "video" && callState === "connected" ? "mt-auto mb-32" : ""}`}>
          {(callState !== "connected" || callType === "voice") && (
            <>
              <motion.div
                animate={callState === "calling" ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <UserAvatar
                  avatarUrl={otherUserAvatar}
                  displayName={otherUserName}
                  size="xl"
                  className="border-4 border-white/20"
                />
              </motion.div>
              <h2 className="text-white text-xl font-bold mt-4">{otherUserName || "User"}</h2>
              <p className="text-white/60 text-sm mt-1">
                {callState === "calling" ? `Calling ${otherUserName || "User"}...` : callState === "ringing" ? "Ringing..." : callState === "connected" ? formatTime(elapsed) : ""}
              </p>
            </>
          )}

          {callState === "connected" && callType === "video" && (
            <p className="text-white/80 text-sm font-medium bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
              {formatTime(elapsed)}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className={`relative z-10 flex items-center gap-4 ${callType === "video" && callState === "connected" ? "mb-12" : "mt-12"}`}>
          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              muted ? "bg-red-500/80" : "bg-white/15 hover:bg-white/25"
            }`}
          >
            {muted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>

          {/* Speaker (voice calls) */}
          {callType === "voice" && callState === "connected" && (
            <button
              onClick={toggleSpeaker}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                speakerOn ? "bg-white/15 hover:bg-white/25" : "bg-red-500/80"
              }`}
            >
              <Volume2 className="w-6 h-6 text-white" />
            </button>
          )}

          {/* End call */}
          <button
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          {/* Camera toggle (video) */}
          {callType === "video" && (
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                videoOff ? "bg-red-500/80" : "bg-white/15 hover:bg-white/25"
              }`}
            >
              {videoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
            </button>
          )}

          {/* Camera flip (video) */}
          {callType === "video" && callState === "connected" && (
            <button
              onClick={switchCamera}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors"
            >
              <SwitchCamera className="w-6 h-6 text-white" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallOverlay;
