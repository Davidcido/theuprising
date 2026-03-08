import { supabase } from "@/integrations/supabase/client";

const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "Mobile";
  if (/Tablet|iPad/i.test(ua)) return "Tablet";
  return "Desktop";
};

export const trackLogin = async (userId?: string) => {
  const sessionId = localStorage.getItem("uprising_session_id") || "unknown";
  const deviceType = getDeviceType();

  try {
    await supabase.from("login_sessions").insert({
      user_id: userId || null,
      session_id: sessionId,
      device_type: deviceType,
    });
  } catch (err) {
    console.error("Failed to track login:", err);
  }
};
