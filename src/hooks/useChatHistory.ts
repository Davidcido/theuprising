import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/components/chat/ChatMessages";

export function useChatHistory(userId: string | null | undefined, companionId: string) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [savedMessages, setSavedMessages] = useState<ChatMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const savingRef = useRef(false);
  const lastSavedCountRef = useRef(0);

  // Load or create conversation on mount / companion change
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setSavedMessages(null);
      setConversationId(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setSavedMessages(null);
      setConversationId(null);
      lastSavedCountRef.current = 0;

      // Find existing conversation
      const { data: existing } = await supabase
        .from("ai_chat_conversations")
        .select("id")
        .eq("user_id", userId)
        .eq("companion_id", companionId)
        .maybeSingle();

      if (cancelled) return;

      let convId: string;

      if (existing) {
        convId = existing.id;
      } else {
        // Create new conversation
        const { data: created, error } = await supabase
          .from("ai_chat_conversations")
          .insert({ user_id: userId, companion_id: companionId } as any)
          .select("id")
          .single();

        if (error || !created || cancelled) {
          console.error("[ChatHistory] Failed to create conversation:", error);
          setLoading(false);
          return;
        }
        convId = created.id;
      }

      setConversationId(convId);

      // Fetch messages
      const { data: msgs } = await supabase
        .from("ai_chat_messages")
        .select("role, content, attachments, edited")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (cancelled) return;

      if (msgs && msgs.length > 0) {
        const chatMessages: ChatMessage[] = msgs.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          attachments: m.attachments || undefined,
          edited: m.edited || false,
        }));
        setSavedMessages(chatMessages);
        lastSavedCountRef.current = msgs.length;
      } else {
        setSavedMessages([]);
      }

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId, companionId]);

  // Save new messages (only saves messages that haven't been saved yet)
  const saveMessages = useCallback(async (messages: ChatMessage[]) => {
    if (!conversationId || !userId || savingRef.current) return;
    
    // Only save new messages beyond what we already saved
    const newMessages = messages.slice(lastSavedCountRef.current);
    if (newMessages.length === 0) return;

    // Don't save if the last message is still being streamed (assistant with empty content)
    const lastNew = newMessages[newMessages.length - 1];
    if (lastNew.role === "assistant" && !lastNew.content.trim()) return;

    savingRef.current = true;

    try {
      const rows = newMessages.map((m) => ({
        conversation_id: conversationId,
        role: m.role,
        content: m.content,
        attachments: m.attachments ? JSON.stringify(m.attachments) : null,
        edited: m.edited || false,
      }));

      const { error } = await supabase.from("ai_chat_messages").insert(rows as any);
      if (!error) {
        lastSavedCountRef.current = messages.length;
        // Update conversation timestamp
        await supabase
          .from("ai_chat_conversations")
          .update({ updated_at: new Date().toISOString() } as any)
          .eq("id", conversationId);
      } else {
        console.error("[ChatHistory] Save error:", error);
      }
    } finally {
      savingRef.current = false;
    }
  }, [conversationId, userId]);

  // Clear conversation history (for "new chat" feature)
  const clearHistory = useCallback(async () => {
    if (!conversationId) return;
    await supabase.from("ai_chat_messages").delete().eq("conversation_id", conversationId);
    lastSavedCountRef.current = 0;
    setSavedMessages([]);
  }, [conversationId]);

  return { savedMessages, loading, saveMessages, clearHistory, conversationId };
}
