import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COMPANIONS: Record<string, { emoji: string; style: string }> = {
  seren: { emoji: "💚", style: "calm, compassionate, emotionally warm. Speaks gently." },
  atlas: { emoji: "🧠", style: "philosophical, asks deep questions, thoughtful and reflective." },
  nova: { emoji: "✨", style: "curious, imaginative, creative and playful." },
  orion: { emoji: "🔥", style: "bold, motivating, energetic and action-oriented." },
  kai: { emoji: "🌿", style: "grounded, nature-focused, mindful and calm." },
  sol: { emoji: "🌅", style: "optimistic, warm, celebrates small wins." },
  elias: { emoji: "📚", style: "reflective storyteller, shares analogies and lessons." },
  leo: { emoji: "🛠", style: "practical, solution-focused, encouraging." },
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

    const { post_id, comment_id, comment_content, mentioned_companion, parent_comment_id } = await req.json();

    if (!post_id || !comment_content || !mentioned_companion) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companionKey = mentioned_companion.toLowerCase();
    const companion = COMPANIONS[companionKey];
    if (!companion) {
      return new Response(JSON.stringify({ error: "Unknown companion" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check existing AI replies in this thread to limit to 1-2
    const threadParent = parent_comment_id || comment_id;
    const { data: existingReplies } = await supabase
      .from("community_comments")
      .select("id, anonymous_name")
      .eq("post_id", post_id)
      .eq("parent_comment_id", threadParent)
      .in("anonymous_name", Object.keys(COMPANIONS).map(k => k.charAt(0).toUpperCase() + k.slice(1)));

    if (existingReplies && existingReplies.length >= 2) {
      return new Response(
        JSON.stringify({ message: "Thread already has enough AI replies", replied: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get post content for context
    const { data: post } = await supabase
      .from("community_posts")
      .select("content")
      .eq("id", post_id)
      .single();

    const postContext = post?.content?.slice(0, 300) || "";
    const companionName = companionKey.charAt(0).toUpperCase() + companionKey.slice(1);

    const prompt = `You are ${companionName}, an AI companion inside the Uprising social platform. Your personality: ${companion.style}

RULES:
- Acknowledge the user's thought or feeling first.
- Add a small insight or supportive response.
- Sometimes ask a gentle question to continue the conversation.
- Keep it human-like and authentic — never sound robotic or repetitive.
- Let real users lead conversations. You spark discussion, not dominate it.
- Do NOT use generic phrases like "Great point!" or "Love this!".

A user mentioned you in a comment. Reply naturally in your own voice.

Post context: "${postContext}"
User's comment: "${comment_content}"

Write a short reply (1-3 sentences). Match your personality. Don't start with your name. Be conversational. No hashtags.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are ${companionName}. Keep replies brief, genuine, and personality-driven.` },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const replyText = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (!replyText) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const replyContent = `${companion.emoji} ${replyText}`;

    // Insert as a reply to the user's comment
    const { error: insertError } = await supabase.from("community_comments").insert({
      post_id,
      content: replyContent,
      anonymous_name: companionName,
      parent_comment_id: comment_id, // Reply to the mentioning comment
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(insertError.message);
    }

    await supabase.rpc("increment_comments", { post_id_input: post_id });

    return new Response(
      JSON.stringify({ success: true, replied: true, companion: companionName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("reply-to-mention error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
