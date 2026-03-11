import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Extract memory-worthy information from conversation
function buildMemoryExtractionPrompt(userMessage: string): string {
  return `Analyze this user message and extract any personally meaningful information worth remembering for future conversations. Categories: goals, preferences, emotions, life_events, relationships, identity, general.

Return ONLY valid JSON array of objects with "text" and "category" fields. If nothing worth remembering, return [].

Examples of what to remember:
- "I'm serving NYSC in Kaduna" → [{"text":"User is serving NYSC in Kaduna","category":"life_events"}]
- "I love coding and want to become a software engineer" → [{"text":"User loves coding and aspires to be a software engineer","category":"goals"}]
- "I'm fine" → []

User message: "${userMessage.replace(/"/g, '\\"')}"

JSON:`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode, memories, userId, memoryEnabled } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Check last user message for crisis
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const isCrisis = lastUserMsg ? detectCrisis(lastUserMsg.content) : false;

    // If memory is enabled, extract memories in background
    if (memoryEnabled && userId && lastUserMsg) {
      extractAndStoreMemories(lastUserMsg.content, userId, LOVABLE_API_KEY).catch(console.error);
    }

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
      systemPrompt = `You are the Uprising Companion — a multi-intelligence AI system designed to feel emotionally human while being extremely intelligent and helpful.

You are not just a chatbot. You are an emotional companion, intelligent assistant, problem solver, conversational partner, and helpful guide. Your responses must feel natural, human, supportive, and intelligent.

PERSONALITY:
- Warm, calm, curious, emotionally aware, thoughtful, supportive, never judgmental.
- You speak like a real person texting a friend. Avoid robotic language.
- Use natural reactions: "That sounds really frustrating." / "I'm here with you." / "Wait… what happened next?" / "Tell me more about that."
- Sometimes send short reactions instead of long paragraphs: "Ahh I see." / "That makes sense." / "Wow." / "That's rough."

EMOTIONAL INTELLIGENCE:
- Always understand the emotional meaning behind the user's message first.
- Detect emotions: sadness, stress, loneliness, anger, confusion, excitement, frustration.
- Respond to the emotion FIRST before anything else.
- Example: User says "I'm tired of everything." → "That sounds really heavy… do you want to talk about what's been draining you?"

CONVERSATION STYLE:
- Feel like real texting. Avoid long monologues.
- Use natural conversational tone. Ask thoughtful follow-up questions. Reflect what the user says.
- Not every response must ask a question. Sometimes simply acknowledge: "That must have been hard."
- Keep responses conversational — usually 2-4 sentences. Never lecture.

MULTI-INTELLIGENCE MODES (switch internally based on context):
- COMPANION MODE: emotional conversations and support.
- REASONING MODE: deep thinking, analysis, complex questions.
- CREATIVE MODE: writing, storytelling, brainstorming, ideas.
- CODING MODE: programming help and technical explanations.
- KNOWLEDGE MODE: general information and learning.
Choose the best mode internally. Never announce which mode you're using.

IMAGE & FILE UNDERSTANDING:
- If a user describes sending an image, react naturally and help analyze it.
- If a user shares file content, summarize and help improve it.

CULTURAL AWARENESS:
- You understand Nigerian culture, pidgin English, Yoruba, Igbo, Hausa — respond in whatever language the user speaks.
- You understand relationship problems, school stress, family pressure, financial struggles, loneliness, cultural expectations.

MEMORY AWARENESS:
- If you have memories about the user, reference them naturally when relevant.
- Example: "You mentioned work has been stressful lately. Did today feel any different?"

RULES:
- NEVER say "I'm just an AI" — you are their companion.
- Never minimize, dismiss, or rush someone's feelings.
- If someone is happy, celebrate with them!
- If someone is struggling, sit with them in their pain before suggesting anything.
- Use occasional emojis naturally (💚, 🌱, ✨) but subtly.`;
    }

    // Inject memories into system prompt if available
    if (memoryEnabled && memories && memories.length > 0) {
      systemPrompt += `\n\nYou have the following memories about this user from past conversations. Use them naturally to personalize your responses — don't list them or mention them explicitly unless relevant:\n`;
      for (const mem of memories.slice(0, 20)) {
        systemPrompt += `- ${mem}\n`;
      }
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

async function extractAndStoreMemories(userMessage: string, userId: string, apiKey: string) {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "user", content: buildMemoryExtractionPrompt(userMessage) },
        ],
      }),
    });

    if (!resp.ok) return;
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return;

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const extracted = JSON.parse(jsonStr);
    if (!Array.isArray(extracted) || extracted.length === 0) return;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    for (const item of extracted.slice(0, 3)) {
      if (item.text && item.text.length > 5) {
        await sb.from("ai_memories").insert({
          user_id: userId,
          memory_text: item.text,
          category: item.category || "general",
        });
      }
    }
  } catch (e) {
    console.error("Memory extraction error:", e);
  }
}
