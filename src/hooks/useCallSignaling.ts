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
  duration?: number;
  isCaller: boolean;
};

const CALL_TIMEOUT_MS = 30_000;

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

const fetchTurnServers = async (): Promise<RTCIceServer[]> => {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(`https://${projectId}.supabase.co/functions/v1/get-turn-credentials`);
    if (!res.ok) throw new Error("Failed to fetch TURN credentials");
    const data = await res.json();
    if (data.iceServers && data.iceServers.length > 0) {
      return data.iceServers;
    }
  } catch (e) {
    console.warn("Could not fetch TURN servers, using STUN fallback:", e);
  }
  return FALLBACK_ICE_SERVERS;
};

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

  // Deduplication: track processed signal IDs
  const processedSignals = useRef<Set<string>>(new Set());

  const activeCallUserIdRef = useRef(activeCallUserId);
  const activeConversationIdRef = useRef(activeConversationId);
  const activeCallTypeRef = useRef(activeCallType);
  const callStateRef = useRef(callState);
  activeCallUserIdRef.current = activeCallUserId;
  activeConversationIdRef.current = activeConversationId;
  activeCallTypeRef.current = activeCallType;
  callStateRef.current = callState;

  // Pending ICE candidates received before remote description is set
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  const sendSignal = useCallback(async (targetId: string, conversationId: string, signalType: string, signalData: any, callType: "voice" | "video") => {
    if (!userId) return;
    await supabase.from("call_signals").insert({
      caller_id: userId,
      callee_id: targetId,
      conversation_id: conversationId,
      signal_type: signalType,
      signal_data: signalData,
      call_type: callType,
    });
  }, [userId]);

  const cleanupPeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    pendingCandidates.current = [];
  }, []);

  const endCall = useCallback((skipSignal?: boolean) => {
    clearCallTimeout();
    const duration = connectedAtRef.current ? Math.round((Date.now() - connectedAtRef.current) / 1000) : 0;
    const convId = activeConversationIdRef.current;
    const cType = activeCallTypeRef.current;
    const wasConnected = connectedAtRef.current !== null;

    cleanupPeerConnection();

    if (!skipSignal && activeCallUserIdRef.current && convId && userId) {
      sendSignal(activeCallUserIdRef.current, convId, "call-end", null, cType);
    }

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
  }, [userId, clearCallTimeout, cleanupPeerConnection, sendSignal]);

  const endCallRef = useRef(endCall);
  endCallRef.current = endCall;

  const setupPeerConnection = useCallback(async (callType: "voice" | "video") => {
    const iceServers = await fetchTurnServers();
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
        if (!connectedAtRef.current) connectedAtRef.current = Date.now();
      } else if (pc.connectionState === "failed") {
        endCallRef.current();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setCallState("connected");
        if (!connectedAtRef.current) connectedAtRef.current = Date.now();
      }
    };

    return pc;
  }, [sendSignal]);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = peerConnection.current;
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ICE candidate:", e);
      }
    } else {
      // Queue candidate until remote description is set
      pendingCandidates.current.push(candidate);
    }
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnection.current;
    if (!pc) return;
    const candidates = [...pendingCandidates.current];
    pendingCandidates.current = [];
    for (const c of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.error("Error adding queued ICE candidate:", e);
      }
    }
  }, []);

  const handleIncomingSignal = useCallback(async (signal: CallSignal) => {
    // Dedup
    if (processedSignals.current.has(signal.id)) return;
    processedSignals.current.add(signal.id);
    // Limit set size
    if (processedSignals.current.size > 200) {
      const arr = Array.from(processedSignals.current);
      processedSignals.current = new Set(arr.slice(-100));
    }

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
          try {
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);
            await sendSignal(signal.caller_id, signal.conversation_id!, "offer", { sdp: offer }, activeCallTypeRef.current);
          } catch (e) {
            console.error("Error creating offer:", e);
          }
        }
        break;

      case "offer":
        if (peerConnection.current) {
          try {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.signal_data.sdp));
            await flushPendingCandidates();
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            const targetId = signal.caller_id;
            await sendSignal(targetId, signal.conversation_id!, "answer", { sdp: answer }, activeCallTypeRef.current);
          } catch (e) {
            console.error("Error handling offer:", e);
          }
        }
        break;

      case "answer":
        if (peerConnection.current) {
          try {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.signal_data.sdp));
            await flushPendingCandidates();
          } catch (e) {
            console.error("Error handling answer:", e);
          }
        }
        break;

      case "ice-candidate":
        if (signal.signal_data?.candidate) {
          await addIceCandidate(signal.signal_data.candidate);
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
        endCallRef.current(true);
        break;

      case "call-end":
        endCallRef.current(true);
        break;

      case "call-missed":
        setIncomingCall(null);
        setCallState("idle");
        break;
    }
  }, [sendSignal, clearCallTimeout, addIceCandidate, flushPendingCandidates]);

  // Single channel listening for all signals addressed to this user
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
        handleIncomingSignal(payload.new as CallSignal);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, handleIncomingSignal]);

  const startCall = useCallback(async (targetId: string, conversationId: string, callType: "voice" | "video") => {
    if (!userId || callState !== "idle") return;

    setActiveCallUserId(targetId);
    setActiveCallType(callType);
    setActiveConversationId(conversationId);
    setCallState("calling");
    connectedAtRef.current = null;

    onCallEventRef.current?.({
      type: "started",
      callType,
      conversationId,
      isCaller: true,
    });

    await setupPeerConnection(callType);
    await sendSignal(targetId, conversationId, "call-request", null, callType);

    clearCallTimeout();
    callTimeoutRef.current = setTimeout(() => {
      if (callStateRef.current === "calling") {
        sendSignal(targetId, conversationId, "call-missed", null, callType);
        onCallEventRef.current?.({
          type: "missed",
          callType,
          conversationId,
          isCaller: true,
        });
        endCallRef.current(true);
      }
    }, CALL_TIMEOUT_MS);
  }, [userId, callState, setupPeerConnection, sendSignal, clearCallTimeout]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !userId) return;

    clearCallTimeout();
    const callerId = incomingCall.caller_id;
    const convId = incomingCall.conversation_id;
    const cType = incomingCall.call_type as "voice" | "video";

    setActiveCallUserId(callerId);
    setActiveCallType(cType);
    setActiveConversationId(convId);
    // Don't set "connected" yet — wait for WebRTC connection
    setCallState("calling");

    const pc = await setupPeerConnection(cType);
    if (!pc) return;

    await sendSignal(callerId, convId, "call-accept", null, cType);
    setIncomingCall(null);
  }, [incomingCall, userId, clearCallTimeout, setupPeerConnection, sendSignal]);

  const rejectCall = useCallback(async () => {
    if (!incomingCall || !userId) return;

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
  }, [incomingCall, userId, sendSignal]);

  return {
    callState,
    incomingCall,
    activeCallUserId,
    activeCallType,
    activeConversationId,
    localMediaStream,
    remoteMediaStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  };
};
