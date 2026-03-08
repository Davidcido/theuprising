import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];

    // Check if today's content already exists
    const { data: existing } = await supabase
      .from("daily_rise_content")
      .select("id")
      .eq("content_date", today)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ message: "Today's content already exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Generate today's Daily Rise briefing for a youth-focused African community app called Uprising. Today is ${today}.

Create exactly 11 cards in JSON array format. Each card must have these fields:
- "category": one of ["Daily Motivation", "Global News", "Local News", "Politics", "Sports", "Entertainment", "Tech & Innovation", "Corpers Corner", "Health & Wellness", "Fitness Tip", "World Discoveries"]
- "title": a short catchy title (2-4 words)
- "summary": a fresh, informative 1-3 sentence summary

Guidelines:
- Daily Motivation: An uplifting, original motivational message for young Africans
- Global News: A current global event or trend (be realistic and timely for ${today})
- Local News: African community news, development, or youth programs
- Politics: Youth-relevant policy or governance updates
- Sports: African or global sports highlights
- Entertainment: Music, film, or pop culture trending in Africa
- Tech & Innovation: Tech news relevant to young Africans or global innovation
- Corpers Corner: NYSC tips, experiences, or community service advice
- Health & Wellness: Practical mental or physical health tip
- Fitness Tip: A specific exercise or fitness advice
- World Discoveries: An interesting scientific or world discovery

Return ONLY a valid JSON array with no extra text.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are a content generator for the Uprising app. Return only valid JSON arrays. No markdown, no code blocks, just the raw JSON array.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required for AI generation." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (strip markdown fences if present)
    let cards;
    try {
      const cleaned = rawContent.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      cards = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error("Failed to parse AI-generated content");
    }

    // Store in database
    const { error: insertError } = await supabase
      .from("daily_rise_content")
      .insert({ content_date: today, cards });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to store daily content");
    }

    console.log("Daily Rise content generated for", today);

    return new Response(
      JSON.stringify({ success: true, date: today, cardCount: cards.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-daily-rise error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
