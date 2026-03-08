import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  country: string | null;
  avatar_url: string | null;
  online_status: string;
  created_at: string;
  updated_at: string;
};

export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) {
      setProfile(data as unknown as Profile);
    } else {
      // Auto-create profile if it doesn't exist
      const { data: session } = await supabase.auth.getSession();
      const email = session?.session?.user?.email;
      const defaultName = email?.split("@")[0] || `user_${userId.slice(0, 4)}`;
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({ user_id: userId, display_name: defaultName, online_status: "online" })
        .select("*")
        .single();
      if (newProfile) setProfile(newProfile as unknown as Profile);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Set online status
  useEffect(() => {
    if (!userId || !profile) return;
    supabase.from("profiles").update({ online_status: "online" }).eq("user_id", userId).then();

    const handleBeforeUnload = () => {
      navigator.sendBeacon && supabase.from("profiles").update({ online_status: "offline" }).eq("user_id", userId);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      supabase.from("profiles").update({ online_status: "offline" }).eq("user_id", userId).then();
    };
  }, [userId, profile]);

  const updateProfile = async (updates: Partial<Pick<Profile, "display_name" | "bio" | "country" | "avatar_url">>) => {
    if (!userId) return { error: "Not authenticated" };
    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (!error) {
      setProfile((prev) => prev ? { ...prev, ...updates } : prev);
    }
    return { error };
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

  return { profile, loading, updateProfile, uploadAvatar, refetch: fetchProfile };
};
