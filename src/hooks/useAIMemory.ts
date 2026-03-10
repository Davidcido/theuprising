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
  const [memoryEnabled, setMemoryEnabled] = useState<boolean | null>(null);
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

  // Fetch preference with safety timeout
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("ai_memory_preferences" as any)
          .select("memory_enabled")
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error("[AIMemory] Preference fetch error:", error);
          setMemoryEnabled(null);
        } else if (data) {
          setMemoryEnabled((data as any).memory_enabled);
        } else {
          setMemoryEnabled(null);
        }
      } catch (e) {
        console.error("[AIMemory] Preference fetch exception:", e);
        if (!cancelled) setMemoryEnabled(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    // Safety timeout - never stay loading forever
    const timer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 5000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [userId]);

  // Fetch memories when enabled
  useEffect(() => {
    if (!userId || memoryEnabled !== true) { setMemories([]); return; }
    let cancelled = false;
    supabase
      .from("ai_memories" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("[AIMemory] Memories fetch error:", error);
        if (data) setMemories(data as any);
      });
    return () => { cancelled = true; };
  }, [userId, memoryEnabled]);

  const setPreference = useCallback(async (enabled: boolean) => {
    if (!userId) return null;
    try {
      const { error } = await supabase
        .from("ai_memory_preferences" as any)
        .upsert({ user_id: userId, memory_enabled: enabled, updated_at: new Date().toISOString() } as any, { onConflict: "user_id" });
      // Always update local state even if DB fails - prevents UI lock
      setMemoryEnabled(enabled);
      if (error) {
        console.error("[AIMemory] setPreference error:", error);
      }
      return error;
    } catch (e) {
      console.error("[AIMemory] setPreference exception:", e);
      // Still update local state to unblock UI
      setMemoryEnabled(enabled);
      return e;
    }
  }, [userId]);

  const clearMemories = useCallback(async () => {
    if (!userId) return;
    try {
      await supabase.from("ai_memories" as any).delete().eq("user_id", userId);
    } catch (e) {
      console.error("[AIMemory] clearMemories error:", e);
    }
    setMemories([]);
  }, [userId]);

  const deleteMemory = useCallback(async (memoryId: string) => {
    try {
      await supabase.from("ai_memories" as any).delete().eq("id", memoryId);
    } catch (e) {
      console.error("[AIMemory] deleteMemory error:", e);
    }
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
  }, []);

  const disableAndClear = useCallback(async () => {
    await setPreference(false);
    await clearMemories();
  }, [setPreference, clearMemories]);

  const refetchMemories = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from("ai_memories" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (data) setMemories(data as any);
    } catch (e) {
      console.error("[AIMemory] refetchMemories error:", e);
    }
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
