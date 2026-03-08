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
};

export const useConversations = (userId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    // Get my conversation IDs
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (!participations || participations.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = participations.map((p) => p.conversation_id);

    // Get conversations
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    if (!convs) { setLoading(false); return; }

    // Get other participants
    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds);

    // Get profiles for other users
    const otherUserIds = [...new Set(
      (allParticipants || []).filter((p) => p.user_id !== userId).map((p) => p.user_id)
    )];

    let profilesMap: Record<string, { user_id: string; display_name: string | null; avatar_url: string; online_status?: string }> = {};
    if (otherUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, online_status")
        .in("user_id", otherUserIds);
      if (profiles) {
        for (const p of profiles) {
          profilesMap[p.user_id] = p;
        }
      }
    }

    // Get last messages and unread counts
    const result: Conversation[] = [];
    for (const conv of convs) {
      const otherParticipant = (allParticipants || []).find(
        (p) => p.conversation_id === conv.id && p.user_id !== userId
      );
      const otherProfile = otherParticipant ? profilesMap[otherParticipant.user_id] || null : null;

      const { data: lastMsg } = await supabase
        .from("direct_messages")
        .select("content, created_at, sender_id")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: unread } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("read", false)
        .neq("sender_id", userId);

      result.push({
        ...conv,
        other_user: otherProfile,
        last_message: lastMsg,
        unread_count: unread || 0,
      });
    }

    setConversations(result);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const getOrCreateConversation = async (otherUserId: string) => {
    if (!userId) return null;

    // Check if conversation already exists
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (myConvs) {
      for (const mc of myConvs) {
        const { data: otherPart } = await supabase
          .from("conversation_participants")
          .select("id")
          .eq("conversation_id", mc.conversation_id)
          .eq("user_id", otherUserId)
          .maybeSingle();
        if (otherPart) return mc.conversation_id;
      }
    }

    // Create new conversation
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({})
      .select("id")
      .single();

    if (!newConv) return null;

    await supabase.from("conversation_participants").insert([
      { conversation_id: newConv.id, user_id: userId },
      { conversation_id: newConv.id, user_id: otherUserId },
    ]);

    return newConv.id;
  };

  return { conversations, loading, getOrCreateConversation, refetch: fetchConversations };
};

export const useMessages = (conversationId?: string, userId?: string) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) { setLoading(false); return; }
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as DirectMessage[]);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
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
        setMessages((prev) => [...prev, newMsg]);
        // Mark as read if it's from the other person
        if (userId && newMsg.sender_id !== userId) {
          supabase.from("direct_messages").update({ read: true }).eq("id", newMsg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages, conversationId, userId]);

  // Mark existing unread as read
  useEffect(() => {
    if (!conversationId || !userId) return;
    supabase
      .from("direct_messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .eq("read", false)
      .neq("sender_id", userId);
  }, [conversationId, userId]);

  const sendMessage = async (content: string) => {
    if (!conversationId || !userId || !content.trim()) return;
    await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: content.trim(),
    });
    // Update conversation timestamp
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  };

  return { messages, loading, sendMessage };
};
