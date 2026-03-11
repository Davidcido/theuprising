import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/components/chat/ChatMessages";

function normalizeAttachments(value: unknown): ChatMessage["attachments"] {
  if (!value) return undefined;
  if (Array.isArray(value)) return value as ChatMessage["attachments"];
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as ChatMessage["attachments"];
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function useChatHistory(userId: string | null | undefined, companionId: string) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [savedMessages, setSavedMessages] = useState<ChatMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const savingRef = useRef(false);
  const lastSignatureRef = useRef("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setSavedMessages(null);
      setConversationId(null);
      lastSignatureRef.current = "";
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setSavedMessages(null);
      setConversationId(null);
      lastSignatureRef.current = "";

      const { data: existing, error: existingError } = await supabase
        .from("ai_chat_conversations")
        .select("id")
        .eq("user_id", userId)
        .eq("companion_id", companionId)
        .maybeSingle();

      if (existingError) {
        console.error("[ChatHistory] Failed to load conversation:", existingError);
        if (!cancelled) setLoading(false);
        return;
      }

      if (cancelled) return;

      let convId = existing?.id;

      if (!convId) {
        const { data: created, error: createError } = await supabase
          .from("ai_chat_conversations")
          .insert({ user_id: userId, companion_id: companionId } as any)
          .select("id")
          .single();

        if (createError || !created) {
          console.error("[ChatHistory] Failed to create conversation:", createError);
          if (!cancelled) setLoading(false);
          return;
        }

        convId = created.id;
      }

      if (cancelled) return;

      setConversationId(convId);

      const { data: msgs, error: messagesError } = await supabase
        .from("ai_chat_messages")
        .select("role, content, attachments, edited")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(500);

      if (messagesError) {
        console.error("[ChatHistory] Failed to load messages:", messagesError);
        if (!cancelled) setLoading(false);
        return;
      }

      if (cancelled) return;

      const chatMessages: ChatMessage[] = (msgs || []).map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        attachments: normalizeAttachments(m.attachments),
        edited: Boolean(m.edited),
      }));

      setSavedMessages(chatMessages);
      lastSignatureRef.current = JSON.stringify(chatMessages);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, companionId]);

  const persistMessages = useCallback(async (messages: ChatMessage[]) => {
    if (!conversationId || !userId || savingRef.current) return;

    const sanitizedMessages = messages.filter((message) => {
      if (message.role === "assistant") return message.content.trim().length > 0;
      return message.content.trim().length > 0 || (message.attachments?.length ?? 0) > 0;
    });

    const signature = JSON.stringify(sanitizedMessages);
    if (signature === lastSignatureRef.current) return;

    savingRef.current = true;

    try {
      const { error: deleteError } = await supabase
        .from("ai_chat_messages")
        .delete()
        .eq("conversation_id", conversationId);

      if (deleteError) {
        console.error("[ChatHistory] Clear before save failed:", deleteError);
        return;
      }

      if (sanitizedMessages.length > 0) {
        const baseTime = Date.now();
        const rows = sanitizedMessages.map((message, index) => ({
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          attachments: message.attachments ?? null,
          edited: Boolean(message.edited),
          created_at: new Date(baseTime + index).toISOString(),
        }));

        const { error: insertError } = await supabase
          .from("ai_chat_messages")
          .insert(rows as any);

        if (insertError) {
          console.error("[ChatHistory] Save error:", insertError);
          return;
        }
      }

      await supabase
        .from("ai_chat_conversations")
        .update({ updated_at: new Date().toISOString() } as any)
        .eq("id", conversationId);

      lastSignatureRef.current = signature;
      setSavedMessages(sanitizedMessages);
    } finally {
      savingRef.current = false;
    }
  }, [conversationId, userId]);

  const clearHistory = useCallback(async () => {
    if (!conversationId) return;

    const { error } = await supabase
      .from("ai_chat_messages")
      .delete()
      .eq("conversation_id", conversationId);

    if (error) {
      console.error("[ChatHistory] Failed to clear history:", error);
      return;
    }

    await supabase
      .from("ai_chat_conversations")
      .update({ updated_at: new Date().toISOString() } as any)
      .eq("id", conversationId);

    lastSignatureRef.current = "[]";
    setSavedMessages([]);
  }, [conversationId]);

  return { savedMessages, loading, persistMessages, clearHistory, conversationId };
}

