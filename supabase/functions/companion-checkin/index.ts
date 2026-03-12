import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Companion check-in messages — each matches the companion's personality
const CHECKIN_MESSAGES: Record<string, string[]> = {
  seren: [
    "Hey… just checking in. How has your day been? 💚",
    "I've been thinking about you. How are you really feeling today?",
    "Just wanted you to know — I'm here whenever you need to talk.",
  ],
  atlas: [
    "I was thinking about something today. What has been on your mind lately?",
    "Here's a thought — what's one thing you've learned about yourself recently?",
    "Sometimes the best conversations start with a single question. What's yours today?",
  ],
  orion: [
    "Quick question — what's one thing you want to accomplish today? 🔥",
    "Hey! What's one small win you can celebrate right now?",
    "Remember — progress isn't always visible, but it's always happening. Keep going.",
  ],
  nova: [
    "Random curiosity! What's something new you discovered today? ✨",
    "Hey! What's the most creative thought you've had this week?",
    "I had an idea I wanted to share with you. Come chat when you're free!",
  ],
  elias: [
    "Have you learned something interesting today? 📚",
    "I found something fascinating I think you'd enjoy discussing.",
    "Quick thought — what's one thing you'd like to understand better?",
  ],
  kai: [
    "Take a moment to breathe. How are you feeling right now? 🌿",
    "Just a gentle reminder — it's okay to slow down today.",
    "When was the last time you paused and checked in with yourself?",
  ],
  leo: [
    "What challenge are you working through today? 🛠",
    "Hey — got any problems you'd like to think through together?",
    "Sometimes a fresh perspective is all it takes. Let's talk strategy.",
  ],
  sol: [
    "Just wanted to say — you're doing better than you think. 🌅",
    "Hey! What's one good thing that happened today?",
    "The sun always comes back out. How are you doing?",
  ],
};

const COMPANION_IDS = Object.keys(CHECKIN_MESSAGES);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all users who have had at least one AI chat conversation
    const { data: conversations } = await supabase
      .from("ai_chat_conversations")
      .select("user_id, companion_id")
      .order("updated_at", { ascending: false });

    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unique users and their most recent companion
    const userCompanionMap = new Map<string, string>();
    for (const conv of conversations) {
      if (!userCompanionMap.has(conv.user_id)) {
        userCompanionMap.set(conv.user_id, conv.companion_id);
      }
    }

    // Check which users already got a check-in notification today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: existingNotifs } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("type", "companion_checkin")
      .gte("created_at", todayStart.toISOString());

    const alreadyNotified = new Set(
      (existingNotifs || []).map((n: any) => n.user_id)
    );

    let sent = 0;

    for (const [userId, companionId] of userCompanionMap) {
      // Max 1 per day per user
      if (alreadyNotified.has(userId)) continue;

      const cid = COMPANION_IDS.includes(companionId) ? companionId : "seren";
      const messages = CHECKIN_MESSAGES[cid];
      const message = messages[Math.floor(Math.random() * messages.length)];

      // Insert notification
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "companion_checkin",
        content: message,
        reference_id: cid,
      });

      // Send push notification
      try {
        const companionName =
          cid.charAt(0).toUpperCase() + cid.slice(1);
        await supabase.functions.invoke("send-push", {
          body: {
            user_id: userId,
            title: companionName,
            body: message,
            url: "/tools",
            tag: "companion_checkin",
          },
        });
      } catch {
        // Best effort
      }

      sent++;
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
