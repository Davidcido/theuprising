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

    // Get conversations where user is participant (using user_one_id / user_two_id)
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

    // Determine other user IDs
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

    const result: Conversation[] = [];
    for (const conv of convs) {
      const convAny = conv as any;
      const otherUserId = convAny.user_one_id === userId ? convAny.user_two_id : convAny.user_one_id;
      const otherProfile = otherUserId ? profilesMap[otherUserId] || null : null;

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
    if (userId === otherUserId) return null;

    // Use security definer function to find existing conversation
    const { data: existingConvId } = await supabase
      .rpc("find_conversation_between", { user_a: userId, user_b: otherUserId });

    if (existingConvId) return existingConvId as string;

    // Create new conversation with user_one_id and user_two_id
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
        if (userId && newMsg.sender_id !== userId) {
          supabase.from("direct_messages").update({ read: true }).eq("id", newMsg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages, conversationId, userId]);

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
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  };

  return { messages, loading, sendMessage };
};
