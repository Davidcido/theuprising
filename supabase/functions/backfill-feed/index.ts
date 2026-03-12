import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    let days = 30;
    try {
      const body = await req.json();
      days = body.days || 30;
    } catch {}

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const today = new Date();
    const results: { date: string; status: string }[] = [];

    // Process days sequentially (each call generates text content via AI)
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/publish-feed-content`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ date: dateStr }),
        });

        const data = await resp.json();
        results.push({ date: dateStr, status: data.posts > 0 ? `${data.posts} posts` : (data.message || "skipped") });
        console.log(`${dateStr}: ${JSON.stringify(data)}`);
      } catch (err) {
        results.push({ date: dateStr, status: "error" });
        console.error(`${dateStr} error:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("backfill error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
