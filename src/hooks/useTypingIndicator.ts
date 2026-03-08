import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useTypingIndicator = (conversationId?: string, userId?: string) => {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase.channel(`typing-${conversationId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.user_id !== userId) {
          setIsOtherTyping(true);
          setTypingUserName(payload.payload.display_name || null);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
            setTypingUserName(null);
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, userId]);

  const sendTyping = useCallback((displayName?: string) => {
    if (!conversationId || !userId) return;
    const now = Date.now();
    if (now - lastSentRef.current < 2000) return; // Throttle
    lastSentRef.current = now;

    supabase.channel(`typing-${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, display_name: displayName },
    });
  }, [conversationId, userId]);

  return { isOtherTyping, typingUserName, sendTyping };
};
