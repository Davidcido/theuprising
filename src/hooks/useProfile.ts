import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateProfileCache } from "@/lib/apiHelpers";
import { useAuthReady } from "@/hooks/useAuthReady";

// Module-level cache so profile persists across navigations
const profileCache = new Map<string, { profile: any; ts: number }>();
const PROFILE_CACHE_TTL = 60_000; // 1 minute
const STORAGE_PREFIX = "uprising_profile_";

// Persisted copy so the profile renders instantly on a cold page load
const readStoredProfile = (userId: string) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return null;
    return JSON.parse(raw) as { profile: any; ts: number };
  } catch {
    return null;
  }
};

const writeStoredProfile = (userId: string, profile: any) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify({ profile, ts: Date.now() }));
  } catch {}
};

export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  country: string | null;
  avatar_url: string | null;
  cover_photo: string | null;
  online_status: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export const useProfile = (userId?: string) => {
  // Start from any cached copy so the page paints content instead of a skeleton
  const initial = userId
    ? profileCache.get(userId)?.profile ?? readStoredProfile(userId)?.profile ?? null
    : null;
  const [profile, setProfile] = useState<Profile | null>(initial);
  const [loading, setLoading] = useState(!initial);
  const { user: authUser } = useAuthReady();

  const fetchProfile = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    // Show whatever we already have straight away, then refresh in the background
    const cached = profileCache.get(userId) || readStoredProfile(userId);
    if (cached?.profile) {
      setProfile(cached.profile);
      setLoading(false);
      if (Date.now() - cached.ts < PROFILE_CACHE_TTL) return;
    }

    try {
      const { data } = await Promise.race([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
      ]);

      if (data) {
        const p = data as unknown as Profile;
        setProfile(p);
        profileCache.set(userId, { profile: p, ts: Date.now() });
        writeStoredProfile(userId, p);
      } else if (authUser?.id === userId) {
        // Only create profile if this is the current user (use context, not getSession)
        const defaultName = authUser.email?.split("@")[0] || `user_${userId.slice(0, 4)}`;
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert({ user_id: userId, display_name: defaultName, online_status: "online" })
          .select("*")
          .single();
        if (newProfile) {
          const p = newProfile as unknown as Profile;
          setProfile(p);
          profileCache.set(userId, { profile: p, ts: Date.now() });
          writeStoredProfile(userId, p);
        }
      }
    } catch {
      // On timeout or error, don't block the page
      console.warn("Profile fetch failed or timed out for", userId);
    }
    setLoading(false);
  }, [userId, authUser]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Online status + heartbeat — only for current user
  useEffect(() => {
    if (!userId || !profile || !authUser || authUser.id !== userId) return;
    
    // Set online immediately
    supabase.from("profiles").update({ online_status: "online", last_seen_at: new Date().toISOString() }).eq("user_id", userId).then();

    // Heartbeat every 2 minutes
    const heartbeat = setInterval(() => {
      supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("user_id", userId).then();
    }, 120000);

    const handleBeforeUnload = () => {
      supabase.from("profiles").update({ online_status: "offline", last_seen_at: new Date().toISOString() }).eq("user_id", userId);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      supabase.from("profiles").update({ online_status: "offline", last_seen_at: new Date().toISOString() }).eq("user_id", userId).then();
    };
  }, [userId, profile, authUser]);

  const updateProfile = async (updates: Partial<Pick<Profile, "display_name" | "bio" | "country" | "avatar_url" | "cover_photo">>) => {
    if (!userId) return { error: "Not authenticated" };
    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (!error) {
      setProfile((prev) => prev ? { ...prev, ...updates } : prev);
      invalidateProfileCache(userId);
      profileCache.delete(userId);
    }
    return { error: error?.message || null };
  };

  const uploadAvatar = async (file: File) => {
    if (!userId) return { url: null, error: "Not authenticated" };
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return { url: null, error: error.message };
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    await updateProfile({ avatar_url: url });
    return { url, error: null };
  };

  const uploadCoverPhoto = async (file: File) => {
    if (!userId) return { url: null, error: "Not authenticated" };
    const ext = file.name.split(".").pop();
    const path = `${userId}/cover.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return { url: null, error: error.message };
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    await updateProfile({ cover_photo: url });
    return { url, error: null };
  };

  return { profile, loading, updateProfile, uploadAvatar, uploadCoverPhoto, refetch: fetchProfile };
};
