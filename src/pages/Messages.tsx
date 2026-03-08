import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, ArrowLeft, Mail, Image, Mic, MicOff, Phone, Video, Flag, Ban, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import { useConversations, useMessages } from "@/hooks/useConversations";
import { useCallSignaling } from "@/hooks/useCallSignaling";
import { useBlocks } from "@/hooks/useBlocks";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import CallOverlay from "@/components/calls/CallOverlay";
import IncomingCallModal from "@/components/calls/IncomingCallModal";
import { createNotification } from "@/lib/notifications";

const Messages = () => {
  const { conversationId } = useParams();
  const [userId, setUserId] = useState<string | undefined>();
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });
  }, []);

  const { conversations, loading: convsLoading } = useConversations(userId);
  const { messages, loading: msgsLoading, sendMessage } = useMessages(conversationId, userId);
  const { callState, incomingCall, activeCallUserId, activeCallType, localMediaStream, remoteMediaStream, startCall, acceptCall, rejectCall, endCall } = useCallSignaling(userId);
  const { isBlocked, blockUser, unblockUser } = useBlocks(userId);
  const { isOtherTyping, typingUserName, sendTyping } = useTypingIndicator(conversationId, userId);
  const [displayName, setDisplayName] = useState<string>();

  // Fetch own display name for typing indicator
  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("display_name").eq("user_id", userId).single()
      .then(({ data }) => { if (data) setDisplayName(data.display_name || undefined); });
  }, [userId]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Recording timer
  useEffect(() => {
    if (!isRecording) { setRecordingTime(0); return; }
    const interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    await sendMessage(newMessage);
    // Notify recipient
    if (otherUserId && userId && conversationId) {
      createNotification(otherUserId, userId, "message", "sent you a message", conversationId);
    }
    setNewMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId || !userId) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${conversationId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("dm-media").upload(path, file);
    if (uploadError) {
      toast({ title: "Upload failed", variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("dm-media").getPublicUrl(path);

    await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: "📷 Image",
      attachment_url: urlData.publicUrl,
      attachment_type: "image",
    });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await uploadVoiceNote(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const uploadVoiceNote = async (blob: Blob) => {
    if (!conversationId || !userId) return;
    const path = `${conversationId}/${Date.now()}.webm`;
    const { error } = await supabase.storage.from("dm-media").upload(path, blob);
    if (error) {
      toast({ title: "Upload failed", variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("dm-media").getPublicUrl(path);
    await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: "🎤 Voice note",
      attachment_url: urlData.publicUrl,
      attachment_type: "audio",
    });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  };

  const reportUser = async (targetId: string) => {
    const sessionId = localStorage.getItem("uprising_session_id") || "anon";
    await supabase.from("reported_content").insert({
      content_id: targetId,
      content_type: "profile",
      reporter_session_id: sessionId,
      reason: "Reported by user",
    });
    toast({ title: "User reported" });
  };

  const currentConv = conversations.find((c) => c.id === conversationId);
  const otherUserId = currentConv?.other_user?.user_id;
  const isOtherBlocked = otherUserId ? isBlocked(otherUserId) : false;

  // Conversation list view
  if (!conversationId) {
    return (
      <div className="min-h-screen py-12 pb-24">
        {/* Incoming call modal */}
        {incomingCall && callState === "ringing" && (
          <IncomingCallModal signal={incomingCall} onAccept={acceptCall} onReject={rejectCall} />
        )}
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
              <Mail className="w-6 h-6 text-emerald-400" />
              Messages
            </h1>

            {convsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-400 border-t-transparent rounded-full" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No messages yet</p>
                <p className="text-sm mt-1">Visit someone's profile to start a conversation</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => navigate(`/messages/${conv.id}`)}
                    className="w-full text-left p-4 rounded-2xl backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors flex items-center gap-3"
                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
                  >
                    <UserAvatar
                      displayName={conv.other_user?.display_name}
                      avatarUrl={conv.other_user?.avatar_url}
                      size="sm"
                      showStatus
                      onlineStatus={conv.other_user?.online_status}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">
                          {conv.other_user?.display_name || "User"}
                        </span>
                        {conv.last_message && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.last_message.content}
                        </p>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="min-h-screen flex flex-col">
      {/* Call overlay */}
      {callState !== "idle" && callState !== "ringing" && (
        <CallOverlay
          callState={callState}
          callType={activeCallType}
          otherUserName={currentConv?.other_user?.display_name || undefined}
          otherUserAvatar={currentConv?.other_user?.avatar_url}
          localStream={localMediaStream}
          remoteStream={remoteMediaStream}
          onEndCall={endCall}
        />
      )}

      {/* Incoming call */}
      {incomingCall && callState === "ringing" && (
        <IncomingCallModal signal={incomingCall} onAccept={acceptCall} onReject={rejectCall} />
      )}

      {/* Header */}
      <div
        className="sticky top-16 z-40 border-b border-white/10 backdrop-blur-xl px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(15, 81, 50, 0.6)" }}
      >
        <Button size="sm" variant="ghost" onClick={() => navigate("/messages")} className="text-white/60 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <UserAvatar
          displayName={currentConv?.other_user?.display_name}
          avatarUrl={currentConv?.other_user?.avatar_url}
          size="sm"
          showStatus
          onlineStatus={currentConv?.other_user?.online_status}
          onClick={() => currentConv?.other_user && navigate(`/profile/${currentConv.other_user.user_id}`)}
        />
        <div className="flex-1 min-w-0">
          <span
            className="font-semibold text-sm text-white cursor-pointer hover:underline block"
            onClick={() => currentConv?.other_user && navigate(`/profile/${currentConv.other_user.user_id}`)}
          >
            {currentConv?.other_user?.display_name || "User"}
          </span>
          <span className="text-[10px] text-white/40">
            {currentConv?.other_user?.online_status === "online"
              ? "Online"
              : currentConv?.other_user && (currentConv.other_user as any).last_seen_at
                ? `Last seen ${formatDistanceToNow(new Date((currentConv.other_user as any).last_seen_at), { addSuffix: true })}`
                : "Offline"}
          </span>
        </div>

        {/* Call buttons */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => otherUserId && conversationId && startCall(otherUserId, conversationId, "voice")}
            disabled={callState !== "idle" || isOtherBlocked}
            className="text-white/60 hover:text-white"
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => otherUserId && conversationId && startCall(otherUserId, conversationId, "video")}
            disabled={callState !== "idle" || isOtherBlocked}
            className="text-white/60 hover:text-white"
          >
            <Video className="w-4 h-4" />
          </Button>

          {/* More options */}
          {otherUserId && (
            <div className="relative group">
              <Button size="sm" variant="ghost" className="text-white/60 hover:text-white">
                <Flag className="w-4 h-4" />
              </Button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-[#0F5132] border border-white/15 rounded-xl shadow-xl overflow-hidden min-w-[160px] z-50">
                <button
                  onClick={() => reportUser(otherUserId)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-yellow-400 hover:bg-white/10 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" /> Report User
                </button>
                <button
                  onClick={async () => {
                    if (isOtherBlocked) {
                      await unblockUser(otherUserId);
                      toast({ title: "User unblocked" });
                    } else {
                      await blockUser(otherUserId);
                      toast({ title: "User blocked", description: "They can no longer message or follow you." });
                    }
                  }}
                  className={`flex items-center gap-2 w-full px-4 py-2.5 text-xs ${isOtherBlocked ? "text-emerald-400" : "text-red-400"} hover:bg-white/10 transition-colors`}
                >
                  <Ban className="w-3.5 h-3.5" /> {isOtherBlocked ? "Unblock User" : "Block User"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blocked notice */}
      {isOtherBlocked && (
        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 text-center">
          <p className="text-xs text-red-400">You have blocked this user. Unblock to resume messaging.</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {msgsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-400 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Start the conversation 💚
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === userId;
            const msgAny = msg as any;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    isMine
                      ? "bg-emerald-600/40 text-white rounded-br-md"
                      : "bg-white/10 text-foreground rounded-bl-md"
                  }`}
                >
                  {/* Attachment */}
                  {msgAny.attachment_url && msgAny.attachment_type === "image" && (
                    <img
                      src={msgAny.attachment_url}
                      alt="Shared image"
                      className="rounded-xl max-w-full mb-2 cursor-pointer hover:opacity-90"
                      onClick={() => window.open(msgAny.attachment_url, "_blank")}
                    />
                  )}
                  {msgAny.attachment_url && msgAny.attachment_type === "audio" && (
                    <audio controls className="max-w-full mb-2" src={msgAny.attachment_url} />
                  )}

                  {!(msgAny.attachment_url && (msg.content === "📷 Image" || msg.content === "🎤 Voice note")) && (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  <p className={`text-[10px] mt-1 ${isMine ? "text-white/40" : "text-muted-foreground/60"}`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {isOtherTyping && (
        <div className="px-4 py-1.5">
          <span className="text-xs text-emerald-400/80 italic animate-pulse">
            {typingUserName || "User"} is typing…
          </span>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 border-t border-white/10 backdrop-blur-xl px-4 py-3" style={{ background: "rgba(15, 81, 50, 0.8)" }}>
        {isOtherBlocked ? (
          <p className="text-center text-xs text-muted-foreground py-2">Unblock this user to send messages</p>
        ) : (
          <div className="flex gap-2 max-w-2xl mx-auto items-end">
            {/* Image upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-white/60 hover:text-white hover:bg-white/15 transition-colors shrink-0"
            >
              <Image className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            {/* Voice note */}
            {isRecording ? (
              <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-red-400 font-medium">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}</span>
                <div className="flex-1" />
                <button onClick={stopRecording} className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30">
                  <Square className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (e.target.value.trim()) sendTyping(displayName);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                />
                <button
                  onClick={startRecording}
                  className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-white/60 hover:text-white hover:bg-white/15 transition-colors shrink-0"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </>
            )}

            {!isRecording && (
              <button
                onClick={handleSend}
                disabled={!newMessage.trim()}
                className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-40 transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
