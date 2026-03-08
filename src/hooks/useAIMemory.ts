import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AIMemory = {
  id: string;
  memory_text: string;
  category: string;
  created_at: string;
};

export function useAIMemory() {
  const [userId, setUserId] = useState<string | null>(null);
  const [memoryEnabled, setMemoryEnabled] = useState<boolean | null>(null); // null = not yet chosen
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch preference
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("ai_memory_preferences" as any)
        .select("memory_enabled")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setMemoryEnabled((data as any).memory_enabled);
      } else {
        setMemoryEnabled(null); // No choice made yet
      }
      setLoading(false);
    })();
  }, [userId]);

  // Fetch memories when enabled
  useEffect(() => {
    if (!userId || memoryEnabled !== true) { setMemories([]); return; }
    supabase
      .from("ai_memories" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setMemories(data as any);
      });
  }, [userId, memoryEnabled]);

  const setPreference = useCallback(async (enabled: boolean) => {
    if (!userId) return;
    const { error } = await supabase
      .from("ai_memory_preferences" as any)
      .upsert({ user_id: userId, memory_enabled: enabled, updated_at: new Date().toISOString() } as any, { onConflict: "user_id" });
    if (!error) setMemoryEnabled(enabled);
    return error;
  }, [userId]);

  const clearMemories = useCallback(async () => {
    if (!userId) return;
    await supabase.from("ai_memories" as any).delete().eq("user_id", userId);
    setMemories([]);
  }, [userId]);

  const deleteMemory = useCallback(async (memoryId: string) => {
    await supabase.from("ai_memories" as any).delete().eq("id", memoryId);
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
  }, []);

  const disableAndClear = useCallback(async () => {
    await setPreference(false);
    await clearMemories();
  }, [setPreference, clearMemories]);

  const refetchMemories = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("ai_memories" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setMemories(data as any);
  }, [userId]);

  return {
    userId,
    memoryEnabled,
    memories,
    loading,
    setPreference,
    clearMemories,
    deleteMemory,
    disableAndClear,
    refetchMemories,
  };
}
