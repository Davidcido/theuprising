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

export type CallEvent = {
  type: "started" | "missed" | "ended" | "rejected";
  callType: "voice" | "video";
  conversationId: string;
  duration?: number; // seconds
  isCaller: boolean;
};

const CALL_TIMEOUT_MS = 30_000; // 30 seconds

export const useCallSignaling = (userId?: string, onCallEvent?: (event: CallEvent) => void) => {
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
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedAtRef = useRef<number | null>(null);
  const onCallEventRef = useRef(onCallEvent);
  onCallEventRef.current = onCallEvent;

  // Store refs for values needed in callbacks
  const activeCallUserIdRef = useRef(activeCallUserId);
  const activeConversationIdRef = useRef(activeConversationId);
  const activeCallTypeRef = useRef(activeCallType);
  const callStateRef = useRef(callState);
  activeCallUserIdRef.current = activeCallUserId;
  activeConversationIdRef.current = activeConversationId;
  activeCallTypeRef.current = activeCallType;
  callStateRef.current = callState;

  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleIncomingSignal = async (signal: CallSignal) => {
    switch (signal.signal_type) {
      case "call-request":
        if (callStateRef.current === "idle") {
          setIncomingCall(signal);
          setCallState("ringing");
        } else {
          await sendSignal(signal.caller_id, signal.conversation_id, "call-reject", { reason: "busy" }, signal.call_type as "voice" | "video");
        }
        break;
      case "call-accept":
        if (callStateRef.current === "calling" && peerConnection.current) {
          clearCallTimeout();
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          const targetId = signal.caller_id === userId ? signal.callee_id : signal.caller_id;
          await sendSignal(targetId, signal.conversation_id!, "offer", { sdp: offer }, activeCallTypeRef.current);
        }
        break;
      case "offer":
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.signal_data.sdp));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          const targetId = signal.caller_id === userId ? signal.callee_id : signal.caller_id;
          await sendSignal(targetId, signal.conversation_id!, "answer", { sdp: answer }, activeCallTypeRef.current);
        }
        break;
      case "answer":
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.signal_data.sdp));
          setCallState("connected");
          connectedAtRef.current = Date.now();
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
        clearCallTimeout();
        if (activeConversationIdRef.current) {
          onCallEventRef.current?.({
            type: "rejected",
            callType: activeCallTypeRef.current,
            conversationId: activeConversationIdRef.current,
            isCaller: true,
          });
        }
        endCall(true);
        break;
      case "call-end":
        endCall(true);
        break;
      case "call-missed":
        // The caller notified us that the call timed out
        setIncomingCall(null);
        setCallState("idle");
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

    const turnUrl = import.meta.env.VITE_TURN_SERVER_URL;
    const turnUser = import.meta.env.VITE_TURN_SERVER_USERNAME;
    const turnCred = import.meta.env.VITE_TURN_SERVER_CREDENTIAL;
    if (turnUrl) {
      iceServers.push({ urls: turnUrl, username: turnUser || "", credential: turnCred || "" });
    }

    const pc = new RTCPeerConnection({ iceServers });
    peerConnection.current = pc;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      localStream.current = stream;
      setLocalMediaStream(stream);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    } catch (err) {
      console.error("Error accessing media devices:", err);
      return null;
    }

    const remote = new MediaStream();
    remoteStream.current = remote;
    setRemoteMediaStream(remote);

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => remote.addTrack(track));
      setRemoteMediaStream(new MediaStream(remote.getTracks()));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && activeCallUserIdRef.current && activeConversationIdRef.current) {
        sendSignal(activeCallUserIdRef.current, activeConversationIdRef.current, "ice-candidate", { candidate: event.candidate }, callType);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("connected");
        connectedAtRef.current = Date.now();
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
    connectedAtRef.current = null;

    // Fire "started" event
    onCallEventRef.current?.({
      type: "started",
      callType,
      conversationId,
      isCaller: true,
    });

    await setupPeerConnection(callType);
    await sendSignal(targetId, conversationId, "call-request", null, callType);

    // Set timeout for unanswered call
    clearCallTimeout();
    callTimeoutRef.current = setTimeout(() => {
      if (callStateRef.current === "calling") {
        // Notify callee that call was missed
        sendSignal(targetId, conversationId, "call-missed", null, callType);
        onCallEventRef.current?.({
          type: "missed",
          callType,
          conversationId,
          isCaller: true,
        });
        endCall(true);
      }
    }, CALL_TIMEOUT_MS);
  };

  const acceptCall = async () => {
    if (!incomingCall || !userId) return;

    clearCallTimeout();
    setActiveCallUserId(incomingCall.caller_id);
    setActiveCallType(incomingCall.call_type as "voice" | "video");
    setActiveConversationId(incomingCall.conversation_id);
    setCallState("connected");
    connectedAtRef.current = Date.now();

    const pc = await setupPeerConnection(incomingCall.call_type as "voice" | "video");
    if (!pc) return;

    await sendSignal(incomingCall.caller_id, incomingCall.conversation_id, "call-accept", null, incomingCall.call_type as "voice" | "video");
    setIncomingCall(null);
  };

  const rejectCall = async () => {
    if (!incomingCall || !userId) return;

    // Fire rejected event for the recipient's chat
    if (incomingCall.conversation_id) {
      onCallEventRef.current?.({
        type: "rejected",
        callType: incomingCall.call_type as "voice" | "video",
        conversationId: incomingCall.conversation_id,
        isCaller: false,
      });
    }

    await sendSignal(incomingCall.caller_id, incomingCall.conversation_id, "call-reject", null, incomingCall.call_type as "voice" | "video");
    setIncomingCall(null);
    setCallState("idle");
  };

  const endCall = (skipSignal?: boolean) => {
    clearCallTimeout();
    const duration = connectedAtRef.current ? Math.round((Date.now() - connectedAtRef.current) / 1000) : 0;
    const convId = activeConversationIdRef.current;
    const cType = activeCallTypeRef.current;
    const wasConnected = connectedAtRef.current !== null;

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }

    if (!skipSignal && activeCallUserIdRef.current && convId && userId) {
      sendSignal(activeCallUserIdRef.current, convId, "call-end", null, cType);
    }

    // Fire ended event if the call was connected
    if (wasConnected && convId) {
      onCallEventRef.current?.({
        type: "ended",
        callType: cType,
        conversationId: convId,
        duration,
        isCaller: true,
      });
    }

    setCallState("idle");
    setActiveCallUserId(null);
    setActiveConversationId(null);
    setIncomingCall(null);
    setLocalMediaStream(null);
    setRemoteMediaStream(null);
    connectedAtRef.current = null;
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
