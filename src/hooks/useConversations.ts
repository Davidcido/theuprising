import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Conversation = {
  id: string;
  created_at: string;
  updated_at: string;
  other_user: { user_id: string; display_name: string | null; avatar_url: string; online_status?: string; last_seen_at?: string } | null;
  last_message?: { content: string; created_at: string; sender_id: string } | null;
  unread_count: number;
};

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  reply_to_message_id?: string | null;
  edited_at?: string | null;
  deleted_for_everyone?: boolean;
};

export const useConversations = (userId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`)
      .order("updated_at", { ascending: false });

    if (!convs || convs.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const otherUserIds = [...new Set(
      convs.map((c: any) => c.user_one_id === userId ? c.user_two_id : c.user_one_id).filter(Boolean)
    )];

    let profilesMap: Record<string, any> = {};
    if (otherUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, online_status, last_seen_at")
        .in("user_id", otherUserIds);
      if (profiles) {
        for (const p of profiles) {
          profilesMap[p.user_id] = p;
        }
      }
    }

    const convIds = convs.map((c: any) => c.id);

    // Batch fetch: last messages and unread counts for ALL conversations at once
    const [lastMsgsRes, unreadRes] = await Promise.all([
      // Get all recent messages for these conversations, then pick last per conversation
      supabase
        .from("direct_messages")
        .select("conversation_id, content, created_at, sender_id")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false }),
      // Get all unread messages in one query
      supabase
        .from("direct_messages")
        .select("conversation_id")
        .in("conversation_id", convIds)
        .eq("read", false)
        .neq("sender_id", userId),
    ]);

    // Build last message map (first occurrence per conversation_id is the latest)
    const lastMsgMap: Record<string, { content: string; created_at: string; sender_id: string }> = {};
    if (lastMsgsRes.data) {
      for (const msg of lastMsgsRes.data) {
        if (!lastMsgMap[msg.conversation_id]) {
          lastMsgMap[msg.conversation_id] = { content: msg.content, created_at: msg.created_at, sender_id: msg.sender_id };
        }
      }
    }

    // Build unread count map
    const unreadMap: Record<string, number> = {};
    if (unreadRes.data) {
      for (const msg of unreadRes.data) {
        unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1;
      }
    }

    const result: Conversation[] = convs.map((conv: any) => {
      const otherUserId = conv.user_one_id === userId ? conv.user_two_id : conv.user_one_id;
      const otherProfile = otherUserId ? profilesMap[otherUserId] || null : null;
      return {
        ...conv,
        other_user: otherProfile,
        last_message: lastMsgMap[conv.id] || null,
        unread_count: unreadMap[conv.id] || 0,
      };
    });

    setConversations(result);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const getOrCreateConversation = async (otherUserId: string) => {
    if (!userId) return null;
    if (userId === otherUserId) return null;

    const { data: existingConvId } = await supabase
      .rpc("find_conversation_between", { user_a: userId, user_b: otherUserId });

    if (existingConvId) return existingConvId as string;

    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({ user_one_id: userId, user_two_id: otherUserId } as any)
      .select("id")
      .single();

    if (convError || !newConv) {
      console.error("Failed to create conversation:", convError);
      return null;
    }

    await fetchConversations();
    return newConv.id;
  };

  return { conversations, loading, getOrCreateConversation, refetch: fetchConversations };
};

export const useMessages = (conversationId?: string, userId?: string) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Mark all unread messages in this conversation as read
  const markAsRead = useCallback(async () => {
    if (!conversationId || !userId) return;
    await supabase
      .from("direct_messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .eq("read", false)
      .neq("sender_id", userId);
  }, [conversationId, userId]);

  // Fetch hidden message IDs for the current user
  const fetchHiddenIds = useCallback(async () => {
    if (!userId || !conversationId) return;
    const { data } = await supabase
      .from("message_hidden_for_user")
      .select("message_id")
      .eq("user_id", userId);
    if (data) {
      setHiddenIds(new Set(data.map((r: any) => r.message_id)));
    }
  }, [userId, conversationId]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) { setMessages([]); setLoading(false); return; }
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as DirectMessage[]);
    setLoading(false);
  }, [conversationId]);

  // Clear messages immediately when conversation changes to prevent mixing
  useEffect(() => {
    setMessages([]);
    setLoading(true);
  }, [conversationId]);

  useEffect(() => {
    fetchHiddenIds();
    fetchMessages().then(() => markAsRead());
    if (!conversationId) return;

    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as DirectMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (userId && newMsg.sender_id !== userId) {
          supabase.from("direct_messages").update({ read: true }).eq("id", newMsg.id).then(() => {});
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "direct_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as DirectMessage;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages, fetchHiddenIds, conversationId, userId, markAsRead]);

  const sendMessage = async (content: string) => {
    if (!conversationId || !userId || !content.trim()) return;
    await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: content.trim(),
    });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    await markAsRead();
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;
    await supabase
      .from("direct_messages")
      .update({ content: newContent.trim(), edited_at: new Date().toISOString() } as any)
      .eq("id", messageId);
  };

  const deleteForMe = async (messageId: string) => {
    if (!userId) return;
    await supabase.from("message_hidden_for_user").insert({ message_id: messageId, user_id: userId } as any);
    setHiddenIds((prev) => new Set(prev).add(messageId));
  };

  const deleteForEveryone = async (messageId: string) => {
    await supabase
      .from("direct_messages")
      .update({ deleted_for_everyone: true, content: "" } as any)
      .eq("id", messageId);
  };

  // Filter out hidden messages
  const visibleMessages = messages.filter((m) => !hiddenIds.has(m.id));

  return { messages: visibleMessages, loading, sendMessage, markAsRead, editMessage, deleteForMe, deleteForEveryone };
};
