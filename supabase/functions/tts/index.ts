import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    let lastError = "";
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: voice || "nova",
          input: text,
        }),
      });

      if (response.ok) {
        if (attempt > 1) console.log(`TTS succeeded on attempt ${attempt}`);
        return new Response(response.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache, no-store",
          },
        });
      }

      lastError = await response.text();
      console.error(`TTS attempt ${attempt}/${MAX_RETRIES} failed (${response.status}):`, lastError);

      // Only retry on 429 or 5xx
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }

      return new Response(JSON.stringify({ error: "TTS generation failed", details: lastError }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "TTS failed after retries", details: lastError }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("TTS error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
