import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/components/chat/ChatMessages";

type ConversationRow = {
  id: string;
};

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
  const creatingConversationRef = useRef<Promise<string | null> | null>(null);

  const createConversation = useCallback(async () => {
    if (!userId) return null;

    if (creatingConversationRef.current) {
      return creatingConversationRef.current;
    }

    creatingConversationRef.current = (async () => {
      const { data: created, error: createError } = await supabase
        .from("ai_chat_conversations")
        .insert({ user_id: userId, companion_id: companionId })
        .select("id")
        .single();

      if (createError || !created) {
        console.error("[ChatHistory] Failed to create conversation:", createError);
        return null;
      }

      setConversationId(created.id);
      return created.id;
    })();

    try {
      return await creatingConversationRef.current;
    } finally {
      creatingConversationRef.current = null;
    }
  }, [userId, companionId]);

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
        .order("updated_at", { ascending: false })
        .limit(1);

      if (existingError) {
        console.error("[ChatHistory] Failed to load conversation:", existingError);
        if (!cancelled) setLoading(false);
        return;
      }

      if (cancelled) return;

      const latestConversation = (existing as ConversationRow[] | null)?.[0] ?? null;
      if (!latestConversation?.id) {
        setSavedMessages([]);
        lastSignatureRef.current = "[]";
        setLoading(false);
        return;
      }

      setConversationId(latestConversation.id);

      const { data: msgs, error: messagesError } = await supabase
        .from("ai_chat_messages")
        .select("role, content, attachments, edited")
        .eq("conversation_id", latestConversation.id)
        .order("created_at", { ascending: true })
        .limit(500);

      if (messagesError) {
        console.error("[ChatHistory] Failed to load messages:", messagesError);
        if (!cancelled) setLoading(false);
        return;
      }

      if (cancelled) return;

      const chatMessages: ChatMessage[] = (msgs || []).map((m) => ({
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
    if (!userId || savingRef.current) return;

    const sanitizedMessages = messages.filter((message) => {
      if (message.role === "assistant") return message.content.trim().length > 0;
      return message.content.trim().length > 0 || (message.attachments?.length ?? 0) > 0;
    });

    const signature = JSON.stringify(sanitizedMessages);
    if (signature === lastSignatureRef.current && conversationId) return;

    savingRef.current = true;

    try {
      const activeConversationId = conversationId ?? await createConversation();
      if (!activeConversationId) return;

      const { error: deleteError } = await supabase
        .from("ai_chat_messages")
        .delete()
        .eq("conversation_id", activeConversationId);

      if (deleteError) {
        console.error("[ChatHistory] Clear before save failed:", deleteError);
        return;
      }

      if (sanitizedMessages.length > 0) {
        const baseTime = Date.now();
        const rows = sanitizedMessages.map((message, index) => ({
          conversation_id: activeConversationId,
          role: message.role,
          content: message.content,
          attachments: message.attachments ?? null,
          edited: Boolean(message.edited),
          created_at: new Date(baseTime + index).toISOString(),
        }));

        const { error: insertError } = await supabase
          .from("ai_chat_messages")
          .insert(rows);

        if (insertError) {
          console.error("[ChatHistory] Save error:", insertError);
          return;
        }
      }

      await supabase
        .from("ai_chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConversationId);

      setConversationId(activeConversationId);
      lastSignatureRef.current = signature;
      setSavedMessages(sanitizedMessages);
    } finally {
      savingRef.current = false;
    }
  }, [conversationId, userId, createConversation]);

  const startNewConversation = useCallback(async () => {
    if (!userId) {
      setConversationId(null);
      setSavedMessages([]);
      lastSignatureRef.current = "[]";
      return null;
    }

    const newConversationId = await createConversation();
    if (!newConversationId) return null;

    setConversationId(newConversationId);
    setSavedMessages([]);
    lastSignatureRef.current = "[]";
    return newConversationId;
  }, [userId, createConversation]);

  return { savedMessages, loading, persistMessages, startNewConversation, conversationId };
}
