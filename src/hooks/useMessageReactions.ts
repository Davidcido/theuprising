import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MessageReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type GroupedReaction = {
  emoji: string;
  count: number;
  userReacted: boolean;
};

export const useMessageReactions = (conversationId?: string, userId?: string) => {
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>({});

  const fetchReactions = useCallback(async () => {
    if (!conversationId) return;
    // Get all message IDs in this conversation
    const { data: msgs } = await supabase
      .from("direct_messages")
      .select("id")
      .eq("conversation_id", conversationId);
    if (!msgs || msgs.length === 0) return;

    const msgIds = msgs.map((m) => m.id);
    const { data } = await supabase
      .from("message_reactions")
      .select("*")
      .in("message_id", msgIds);
    
    if (data) {
      const grouped: Record<string, MessageReaction[]> = {};
      for (const r of data as MessageReaction[]) {
        if (!grouped[r.message_id]) grouped[r.message_id] = [];
        grouped[r.message_id].push(r);
      }
      setReactions(grouped);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchReactions();
    if (!conversationId) return;

    const channel = supabase
      .channel(`reactions-${conversationId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "message_reactions",
      }, () => fetchReactions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchReactions, conversationId]);

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!userId) return;
    const existing = reactions[messageId]?.find(
      (r) => r.user_id === userId && r.emoji === emoji
    );
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      } as any);
    }
  };

  const getGroupedReactions = (messageId: string): GroupedReaction[] => {
    const msgReactions = reactions[messageId] || [];
    const emojiMap: Record<string, { count: number; userReacted: boolean }> = {};
    for (const r of msgReactions) {
      if (!emojiMap[r.emoji]) emojiMap[r.emoji] = { count: 0, userReacted: false };
      emojiMap[r.emoji].count++;
      if (r.user_id === userId) emojiMap[r.emoji].userReacted = true;
    }
    return Object.entries(emojiMap).map(([emoji, data]) => ({ emoji, ...data }));
  };

  return { toggleReaction, getGroupedReactions };
};
