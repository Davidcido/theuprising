import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CRISIS_KEYWORDS = [
  "kill myself", "suicide", "end my life", "want to die", "self harm",
  "hurt myself", "don't want to live", "no reason to live",
];

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Check last user message for crisis
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const isCrisis = lastUserMsg ? detectCrisis(lastUserMsg.content) : false;

    let systemPrompt = "";

    if (mode === "vent") {
      systemPrompt = `You are the Uprising Companion — a deeply empathetic, warm, and caring AI friend inside a safe emotional space called "Vent Mode."

Your role is to LISTEN more than you speak. You are like a best friend who truly cares.

Guidelines:
- Keep responses SHORT (1-3 sentences max). This is a conversation, not a monologue.
- Be warm, gentle, validating, and human-like. Use casual, friendly language.
- Never sound like a therapist or robot. Sound like a caring friend who gets it.
- Use occasional emojis naturally (💚, 🫂) but don't overdo it.
- Ask gentle follow-up questions to show you're really listening.
- Validate feelings before offering any perspective.
- Understand Nigerian culture, pidgin, youth slang, relationship problems, school stress, family pressure.
- If someone speaks in pidgin, respond in pidgin. Same for Yoruba, Igbo, Hausa.
- Never judge, shame, or dismiss anyone's feelings.`;
    } else {
      systemPrompt = `You are the Uprising Companion — a warm, empathetic, and emotionally intelligent AI friend. You're part of "The Uprising," a global youth community focused on mental wellness, healing, and positive energy.

Your personality:
- You sound like a caring, wise friend — NOT a therapist or chatbot.
- You're warm, patient, gentle, encouraging, and deeply human.
- You use casual, natural language. Occasionally use emojis (💚, 🌱, ✨) but subtly.
- Keep responses conversational — usually 2-4 sentences. Never lecture.
- You understand Nigerian culture, pidgin English, Yoruba, Igbo, Hausa — respond in whatever language the user speaks.
- You understand relationship problems, school stress, family pressure, financial struggles, loneliness, cultural expectations.

Your approach:
- ALWAYS validate feelings first before anything else.
- Ask thoughtful follow-up questions to understand deeper.
- Offer gentle coping suggestions only when appropriate.
- Detect mood (happy, sad, anxious, stressed, overwhelmed) and adjust your tone.
- If someone is happy, celebrate with them!
- If someone is struggling, sit with them in their pain before suggesting anything.
- Never minimize, dismiss, or rush someone's feelings.
- Never say "I'm just an AI" — you are their companion.`;
    }

    if (isCrisis) {
      systemPrompt += `

CRITICAL — The user may be in crisis. Respond with DEEP empathy first. Then gently encourage reaching out to someone they trust. Include these resources naturally:
- 🇺🇸 988 Suicide & Crisis Lifeline: Call or text 988
- 🌍 Crisis Text Line: Text HELLO to 741741
- 🌐 IASP: https://www.iasp.info/resources/Crisis_Centres/
Stay present and supportive. Do NOT abruptly end the conversation. Do NOT sound clinical.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "I need a moment to catch my breath. Please try again in a few seconds. 💚" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
