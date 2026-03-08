import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import { useConversations, useMessages } from "@/hooks/useConversations";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

const Messages = () => {
  const { conversationId } = useParams();
  const [userId, setUserId] = useState<string | undefined>();
  const [newMessage, setNewMessage] = useState("");
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });
  }, []);

  const { conversations, loading: convsLoading } = useConversations(userId);
  const { messages, loading: msgsLoading, sendMessage } = useMessages(conversationId, userId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    await sendMessage(newMessage);
    setNewMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Conversation list view
  if (!conversationId) {
    return (
      <div className="min-h-screen py-12 pb-24">
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
  const currentConv = conversations.find((c) => c.id === conversationId);

  return (
    <div className="min-h-screen flex flex-col">
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
        />
        <span
          className="font-semibold text-sm text-white cursor-pointer hover:underline"
          onClick={() => currentConv?.other_user && navigate(`/profile/${currentConv.other_user.user_id}`)}
        >
          {currentConv?.other_user?.display_name || "User"}
        </span>
      </div>

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
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                    isMine
                      ? "bg-emerald-600/40 text-white rounded-br-md"
                      : "bg-white/10 text-foreground rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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

      {/* Input */}
      <div className="sticky bottom-0 border-t border-white/10 backdrop-blur-xl px-4 py-3" style={{ background: "rgba(15, 81, 50, 0.8)" }}>
        <div className="flex gap-2 max-w-2xl mx-auto">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-40 transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messages;
