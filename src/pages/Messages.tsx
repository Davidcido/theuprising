import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, ArrowLeft, Mail, Image, Phone, Video, Flag, Ban, X, Check, Pencil, Copy, CheckSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionSafe } from "@/lib/apiHelpers";
import UserAvatar from "@/components/UserAvatar";
import { useConversations, useMessages, type DirectMessage } from "@/hooks/useConversations";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import { useCallSignaling, type CallEvent } from "@/hooks/useCallSignaling";
import { useBlocks } from "@/hooks/useBlocks";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import CallOverlay from "@/components/calls/CallOverlay";
import IncomingCallModal from "@/components/calls/IncomingCallModal";
import { createNotification } from "@/lib/notifications";
import ChatBubble from "@/components/messages/ChatBubble";
import ReplyPreview from "@/components/messages/ReplyPreview";
import ImagePreview from "@/components/messages/ImagePreview";
import VoiceRecorder from "@/components/messages/VoiceRecorder";
import EmojiPicker from "@/components/EmojiPicker";
import CallSystemMessage from "@/components/messages/CallSystemMessage";
import { compressVideoFile, shouldCompress } from "@/lib/videoCompression";
const Messages = () => {
  const { conversationId } = useParams();
  const [userId, setUserId] = useState<string | undefined>();
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<DirectMessage | null>(null);
  const [editText, setEditText] = useState("");
  const [pendingImage, setPendingImage] = useState<{ file: File; url: string } | null>(null);
  const [sendingImage, setSendingImage] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressedSize, setCompressedSize] = useState<number | undefined>(undefined);
  const [voiceRecorderActive, setVoiceRecorderActive] = useState(false);
  const [sendingText, setSendingText] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const sendingTextRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });
  }, []);

  const { conversations, loading: convsLoading } = useConversations(userId);
  const { messages, loading: msgsLoading, sendMessage, editMessage, deleteForMe, deleteForEveryone } = useMessages(conversationId, userId);
  const handleCallEvent = useCallback(async (event: CallEvent) => {
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
  }, [userId]);

  const { callState, incomingCall, activeCallType, localMediaStream, remoteMediaStream, startCall, acceptCall, rejectCall, endCall } = useCallSignaling(userId, handleCallEvent);
  const { isBlocked, blockUser, unblockUser } = useBlocks(userId);
  const { isOtherTyping, typingUserName, sendTyping } = useTypingIndicator(conversationId, userId);
  const { toggleReaction, getGroupedReactions } = useMessageReactions(conversationId, userId);
  const [displayName, setDisplayName] = useState<string>();

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("display_name").eq("user_id", userId).single()
      .then(({ data }) => { if (data) setDisplayName(data.display_name || undefined); });
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build a map of messages by id for reply lookups
  const messagesMap = useMemo(() => {
    const map: Record<string, DirectMessage> = {};
    for (const m of messages) map[m.id] = m;
    return map;
  }, [messages]);

  const currentConv = conversations.find((c) => c.id === conversationId);
  const convAny = currentConv as any;
  const otherUserId = currentConv?.other_user?.user_id || (convAny?.user_one_id === userId ? convAny?.user_two_id : convAny?.user_one_id);
  const isOtherBlocked = otherUserId ? isBlocked(otherUserId) : false;

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || !userId || sendingTextRef.current) return;
    sendingTextRef.current = true;
    setSendingText(true);
    const replyId = (replyTo as any)?.id || null;
    const content = newMessage.trim();
    setNewMessage("");
    setReplyTo(null);
    
    try {
      await supabase.from("direct_messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        ...(replyId ? { reply_to_message_id: replyId } : {}),
      } as any);
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

      if (otherUserId && userId) {
        createNotification(otherUserId, userId, "message", "sent you a message", conversationId);
      }
    } catch {
      setNewMessage(content);
    } finally {
      sendingTextRef.current = false;
      setSendingText(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    const videoTypes = ["video/mp4", "video/webm", "video/mov", "video/quicktime"];
    if (!imageTypes.includes(file.type) && !videoTypes.includes(file.type)) {
      toast({ title: "Invalid format", description: "Use jpg, png, gif, webp, mp4, or webm", variant: "destructive" });
      return;
    }
    const maxSize = file.type.startsWith("video/") ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: file.type.startsWith("video/") ? "Max 100MB for videos" : "Max 10MB for images", variant: "destructive" });
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (shouldCompress(file)) {
      setPendingImage({ file, url: URL.createObjectURL(file) });
      setCompressing(true);
      setCompressionProgress(0);
      setCompressedSize(undefined);
      try {
        const compressed = await compressVideoFile(file, {
          maxDimension: 1280,
          onProgress: setCompressionProgress,
        });
        const newUrl = URL.createObjectURL(compressed);
        setCompressedSize(compressed.size);
        setPendingImage({ file: compressed, url: newUrl });
      } catch {}
      setCompressing(false);
      setCompressionProgress(100);
    } else {
      setPendingImage({ file, url: URL.createObjectURL(file) });
      setCompressedSize(undefined);
    }
  };

  const sendImage = async () => {
    if (!pendingImage || !conversationId || !userId) return;
    setSendingImage(true);
    const isVideo = pendingImage.file.type.startsWith("video/");
    const ext = pendingImage.file.name.split(".").pop();
    const path = `${conversationId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("dm-media").upload(path, pendingImage.file);
    if (uploadError) {
      toast({ title: "Upload failed", variant: "destructive" });
      setSendingImage(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("dm-media").getPublicUrl(path);
    const replyId = (replyTo as any)?.id || null;
    await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: isVideo ? "🎬 Video" : "📷 Image",
      attachment_url: urlData.publicUrl,
      attachment_type: isVideo ? "video" : "image",
      ...(replyId ? { reply_to_message_id: replyId } : {}),
    } as any);
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    URL.revokeObjectURL(pendingImage.url);
    setPendingImage(null);
    setReplyTo(null);
    setSendingImage(false);
  };

  const sendVoiceNote = async (blob: Blob) => {
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
    } as any);
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  };

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-emerald-400/40");
      setTimeout(() => el.classList.remove("ring-2", "ring-emerald-400/40"), 2000);
    }
  };

  const handleEditMessage = (msg: DirectMessage) => {
    setEditingMsg(msg);
    setEditText(msg.content);
  };

  const handleSaveEdit = async () => {
    if (!editingMsg || !editText.trim()) return;
    await editMessage(editingMsg.id, editText.trim());
    setEditingMsg(null);
    setEditText("");
  };

  const handleDeleteForMe = async (msg: DirectMessage) => {
    await deleteForMe(msg.id);
    toast({ title: "Message hidden from your view" });
  };

  const handleDeleteForEveryone = async (msg: DirectMessage) => {
    await deleteForEveryone(msg.id);
    toast({ title: "Message deleted for everyone" });
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

  // Selection mode handlers
  const enterSelectionMode = (msgId: string) => {
    setSelectionMode(true);
    setSelectedMsgIds(new Set([msgId]));
  };

  const toggleSelectMsg = (msgId: string) => {
    setSelectedMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMsgIds(new Set());
  };

  const copySelectedMessages = async () => {
    const selected = messages
      .filter((m) => selectedMsgIds.has(m.id))
      .map((m) => {
        const senderName = m.sender_id === userId ? "You" : (currentConv?.other_user?.display_name || "User");
        const anyM = m as any;
        if (anyM.deleted_for_everyone) return `${senderName}: [deleted]`;
        return `${senderName}: ${m.content}`;
      });
    try {
      await navigator.clipboard.writeText(selected.join("\n"));
      toast({ title: `${selected.length} message${selected.length > 1 ? "s" : ""} copied` });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
    exitSelectionMode();
  };

  // Conversation list view
  if (!conversationId) {
    return (
      <div className="min-h-screen py-12 pb-24">
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
      {incomingCall && callState === "ringing" && (
        <IncomingCallModal signal={incomingCall} onAccept={acceptCall} onReject={rejectCall} />
      )}

      {/* Selection toolbar */}
      {selectionMode && (
        <div
          className="sticky top-16 z-50 border-b border-white/10 backdrop-blur-xl px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(15, 81, 50, 0.9)" }}
        >
          <Button size="sm" variant="ghost" onClick={exitSelectionMode} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
          <span className="text-sm text-white font-medium flex-1">
            {selectedMsgIds.size} message{selectedMsgIds.size !== 1 ? "s" : ""} selected
          </span>
          <Button size="sm" variant="ghost" onClick={copySelectedMessages} className="text-white/80 hover:text-white gap-1.5">
            <Copy className="w-4 h-4" /> Copy
          </Button>
        </div>
      )}

      {/* Header */}
      {!selectionMode && (
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
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => otherUserId && conversationId && startCall(otherUserId, conversationId, "voice")} disabled={callState !== "idle" || isOtherBlocked} className="text-white/60 hover:text-white">
              <Phone className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => otherUserId && conversationId && startCall(otherUserId, conversationId, "video")} disabled={callState !== "idle" || isOtherBlocked} className="text-white/60 hover:text-white">
              <Video className="w-4 h-4" />
            </Button>
            {otherUserId && (
              <div className="relative group">
                <Button size="sm" variant="ghost" className="text-white/60 hover:text-white">
                  <Flag className="w-4 h-4" />
                </Button>
                <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-[#0F5132] border border-white/15 rounded-xl shadow-xl overflow-hidden min-w-[160px] z-50">
                  <button onClick={() => reportUser(otherUserId)} className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-yellow-400 hover:bg-white/10 transition-colors">
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
      )}

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
            const msgAny = msg as any;
            // Render system/call messages differently
            if (msgAny.attachment_type === "system") {
              return <CallSystemMessage key={msg.id} content={msg.content} createdAt={msg.created_at} />;
            }
            const replyMsg = msgAny.reply_to_message_id ? messagesMap[msgAny.reply_to_message_id] || null : null;
            return (
              <ChatBubble
                key={msg.id}
                msg={msg}
                isMine={msg.sender_id === userId}
                replyMessage={replyMsg}
                onSwipeReply={(m) => { if (!selectionMode) setReplyTo(m); }}
                onScrollToMessage={scrollToMessage}
                onEditMessage={handleEditMessage}
                onDeleteForMe={handleDeleteForMe}
                onDeleteForEveryone={handleDeleteForEveryone}
                onReact={toggleReaction}
                reactions={getGroupedReactions(msg.id)}
                selectionMode={selectionMode}
                isSelected={selectedMsgIds.has(msg.id)}
                onSelect={() => selectionMode ? toggleSelectMsg(msg.id) : undefined}
                onLongPressSelect={() => enterSelectionMode(msg.id)}
              />
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

      {/* Input area */}
      <div className="sticky bottom-0 border-t border-white/10 backdrop-blur-xl px-4 py-3" style={{ background: "rgba(15, 81, 50, 0.8)" }}>
        {isOtherBlocked ? (
          <p className="text-center text-xs text-muted-foreground py-2">Unblock this user to send messages</p>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Edit mode */}
            {editingMsg ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <Pencil className="w-3 h-3" />
                  <span>Editing message</span>
                  <button onClick={() => { setEditingMsg(null); setEditText(""); }} className="ml-auto p-1 rounded hover:bg-white/10">
                    <X className="w-3.5 h-3.5 text-white/40" />
                  </button>
                </div>
                <div className="flex gap-2 items-end">
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } }}
                    autoFocus
                    className="flex-1 rounded-xl bg-white/10 border border-emerald-500/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  />
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editText.trim()}
                    className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-40 transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Reply preview */}
                {replyTo && <ReplyPreview message={replyTo} onCancel={() => setReplyTo(null)} />}

                {/* Image preview */}
                {pendingImage && (
                  <ImagePreview
                    file={pendingImage.file}
                    previewUrl={pendingImage.url}
                    onSend={sendImage}
                    onCancel={() => {
                      URL.revokeObjectURL(pendingImage.url);
                      setPendingImage(null);
                      setCompressedSize(undefined);
                    }}
                    sending={sendingImage}
                    compressing={compressing}
                    compressionProgress={compressionProgress}
                    compressedSize={compressedSize}
                  />
                )}

                <div className="flex gap-2 items-end">
                  <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov" className="hidden" onChange={handleFileSelect} />

                  {!voiceRecorderActive && (
                    <>
                      {/* Image upload */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-muted-foreground hover:text-foreground hover:bg-white/15 transition-colors shrink-0"
                      >
                        <Image className="w-4 h-4" />
                      </button>
                      <EmojiPicker onSelect={(emoji) => setNewMessage((prev) => prev + emoji)} />
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
                    </>
                  )}

                  {/* Voice recorder - always rendered, expands inline when active */}
                  <VoiceRecorder
                    onSend={sendVoiceNote}
                    onCancel={() => setVoiceRecorderActive(false)}
                    onStateChange={setVoiceRecorderActive}
                  />

                  {!voiceRecorderActive && (
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim() || sendingText}
                      className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-40 transition-all hover:scale-105 disabled:hover:scale-100"
                      style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
                    >
                      {sendingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
