import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CallSignal = {
  id: string;
  caller_id: string;
  callee_id: string;
  conversation_id: string;
  signal_type: string;
  signal_data: any;
  call_type: string;
  created_at: string;
};

export type CallState = "idle" | "calling" | "ringing" | "connected" | "ended";

export const useCallSignaling = (userId?: string) => {
  const [callState, setCallState] = useState<CallState>("idle");
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);
  const [activeCallUserId, setActiveCallUserId] = useState<string | null>(null);
  const [activeCallType, setActiveCallType] = useState<"voice" | "video">("voice");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);
  const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);

  // Listen for incoming call signals
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`call-signals-${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "call_signals",
        filter: `callee_id=eq.${userId}`,
      }, (payload) => {
        const signal = payload.new as CallSignal;
        handleIncomingSignal(signal);
      })
      .subscribe();

    // Also listen for signals where I'm the caller (answers, ICE candidates)
    const callerChannel = supabase
      .channel(`call-signals-caller-${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "call_signals",
        filter: `caller_id=eq.${userId}`,
      }, (payload) => {
        // This catches signals sent TO me as caller (answer, ice from callee)
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(callerChannel);
    };
  }, [userId]);

  const handleIncomingSignal = async (signal: CallSignal) => {
    switch (signal.signal_type) {
      case "call-request":
        if (callState === "idle") {
          setIncomingCall(signal);
          setCallState("ringing");
        } else {
          // Busy - auto reject
          await sendSignal(signal.caller_id, signal.conversation_id, "call-reject", null, signal.call_type as "voice" | "video");
        }
        break;
      case "call-accept":
        if (callState === "calling" && peerConnection.current) {
          // Callee accepted, create and send offer
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          await sendSignal(signal.caller_id === userId ? signal.callee_id : signal.caller_id, signal.conversation_id, "offer", { sdp: offer }, activeCallType);
        }
        break;
      case "offer":
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.signal_data.sdp));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          const targetId = signal.caller_id === userId ? signal.callee_id : signal.caller_id;
          await sendSignal(targetId, signal.conversation_id, "answer", { sdp: answer }, activeCallType);
        }
        break;
      case "answer":
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.signal_data.sdp));
          setCallState("connected");
        }
        break;
      case "ice-candidate":
        if (peerConnection.current && signal.signal_data?.candidate) {
          try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.signal_data.candidate));
          } catch (e) {
            console.error("Error adding ICE candidate:", e);
          }
        }
        break;
      case "call-reject":
      case "call-end":
        endCall();
        break;
    }
  };

  // Subscribe to signals from the other user in active call
  useEffect(() => {
    if (!userId || !activeCallUserId) return;
    const channel = supabase
      .channel(`call-active-${userId}-${activeCallUserId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "call_signals",
        filter: `caller_id=eq.${activeCallUserId}`,
      }, (payload) => {
        const signal = payload.new as CallSignal;
        if (signal.callee_id === userId) {
          handleIncomingSignal(signal);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, activeCallUserId]);

  const sendSignal = async (targetId: string, conversationId: string, signalType: string, signalData: any, callType: "voice" | "video") => {
    if (!userId) return;
    await supabase.from("call_signals").insert({
      caller_id: userId,
      callee_id: targetId,
      conversation_id: conversationId,
      signal_type: signalType,
      signal_data: signalData,
      call_type: callType,
    });
  };

  const setupPeerConnection = async (callType: "voice" | "video") => {
    const iceServers: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];

    // TURN server support — configure via environment variables when needed
    const turnUrl = import.meta.env.VITE_TURN_SERVER_URL;
    const turnUser = import.meta.env.VITE_TURN_SERVER_USERNAME;
    const turnCred = import.meta.env.VITE_TURN_SERVER_CREDENTIAL;
    if (turnUrl) {
      iceServers.push({
        urls: turnUrl,
        username: turnUser || "",
        credential: turnCred || "",
      });
    }

    const config: RTCConfiguration = { iceServers };

    const pc = new RTCPeerConnection(config);
    peerConnection.current = pc;

    // Get local media
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: callType === "video",
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;
      setLocalMediaStream(stream);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    } catch (err) {
      console.error("Error accessing media devices:", err);
      return null;
    }

    // Handle remote stream
    const remote = new MediaStream();
    remoteStream.current = remote;
    setRemoteMediaStream(remote);

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        remote.addTrack(track);
      });
      setRemoteMediaStream(new MediaStream(remote.getTracks()));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && activeCallUserId && activeConversationId) {
        sendSignal(activeCallUserId, activeConversationId, "ice-candidate", { candidate: event.candidate }, callType);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("connected");
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        endCall();
      }
    };

    return pc;
  };

  const startCall = async (targetId: string, conversationId: string, callType: "voice" | "video") => {
    if (!userId || callState !== "idle") return;
    
    setActiveCallUserId(targetId);
    setActiveCallType(callType);
    setActiveConversationId(conversationId);
    setCallState("calling");

    await setupPeerConnection(callType);
    await sendSignal(targetId, conversationId, "call-request", null, callType);
  };

  const acceptCall = async () => {
    if (!incomingCall || !userId) return;
    
    setActiveCallUserId(incomingCall.caller_id);
    setActiveCallType(incomingCall.call_type as "voice" | "video");
    setActiveConversationId(incomingCall.conversation_id);
    setCallState("connected");

    const pc = await setupPeerConnection(incomingCall.call_type as "voice" | "video");
    if (!pc) return;

    await sendSignal(incomingCall.caller_id, incomingCall.conversation_id, "call-accept", null, incomingCall.call_type as "voice" | "video");
    setIncomingCall(null);
  };

  const rejectCall = async () => {
    if (!incomingCall || !userId) return;
    await sendSignal(incomingCall.caller_id, incomingCall.conversation_id, "call-reject", null, incomingCall.call_type as "voice" | "video");
    setIncomingCall(null);
    setCallState("idle");
  };

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    if (activeCallUserId && activeConversationId && userId) {
      sendSignal(activeCallUserId, activeConversationId, "call-end", null, activeCallType);
    }
    setCallState("idle");
    setActiveCallUserId(null);
    setActiveConversationId(null);
    setIncomingCall(null);
    setLocalMediaStream(null);
    setRemoteMediaStream(null);
  };

  return {
    callState,
    incomingCall,
    activeCallUserId,
    activeCallType,
    localMediaStream,
    remoteMediaStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  };
};
