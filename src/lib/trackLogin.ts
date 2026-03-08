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

export const trackSignup = async (userId: string) => {
  try {
    await supabase.from("signups").insert({ user_id: userId });
  } catch (err) {
    console.error("Failed to track signup:", err);
  }
};

export const trackVisit = async () => {
  const sessionId = localStorage.getItem("uprising_session_id") || (() => {
    const id = "User" + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem("uprising_session_id", id);
    return id;
  })();
  const deviceType = getDeviceType();

  // Only track once per session (per page load)
  const visitKey = "uprising_visit_tracked";
  if (sessionStorage.getItem(visitKey)) return;
  sessionStorage.setItem(visitKey, "1");

  try {
    await supabase.from("visitors").insert({
      session_id: sessionId,
      device_type: deviceType,
    });
  } catch (err) {
    console.error("Failed to track visit:", err);
  }
};
