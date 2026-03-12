import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COMPANIONS = [
  { name: "Seren", emoji: "💚", style: "calm, compassionate, emotionally warm" },
  { name: "Atlas", emoji: "🧠", style: "philosophical, asks deep questions, thoughtful" },
  { name: "Nova", emoji: "✨", style: "curious, imaginative, creative, playful" },
  { name: "Orion", emoji: "🔥", style: "bold, motivating, energetic, action-oriented" },
  { name: "Kai", emoji: "🌿", style: "grounded, nature-focused, mindful, calm" },
  { name: "Sol", emoji: "🌅", style: "optimistic, warm, celebrates small wins" },
  { name: "Elias", emoji: "📚", style: "reflective storyteller, shares analogies and lessons" },
  { name: "Leo", emoji: "🛠", style: "practical, solution-focused, encouraging" },
];

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

    let batchSize = 10;
    let offset = 0;
    try {
      const body = await req.json();
      batchSize = body.batch_size || 10;
      offset = body.offset || 0;
    } catch {}

    // Get posts that need more comments (currently have < 4 comments)
    const { data: posts, error: postsError } = await supabase
      .from("community_posts")
      .select("id, content, created_at")
      .eq("anonymous_name", "Uprising Daily")
      .order("created_at", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (postsError) throw new Error(`Posts query error: ${postsError.message}`);
    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No posts to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing comments for these posts
    const postIds = posts.map((p: any) => p.id);
    const { data: existingComments } = await supabase
      .from("community_comments")
      .select("post_id, anonymous_name")
      .in("post_id", postIds);

    // Build map of existing commenters per post
    const commentMap: Record<string, string[]> = {};
    for (const c of existingComments || []) {
      if (!commentMap[c.post_id]) commentMap[c.post_id] = [];
      commentMap[c.post_id].push(c.anonymous_name);
    }

    // Filter posts needing more comments
    const postsNeedingComments = posts.filter(
      (p: any) => (commentMap[p.id]?.length || 0) < 4
    );

    if (postsNeedingComments.length === 0) {
      return new Response(
        JSON.stringify({ message: "All posts already have enough comments", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a batch prompt for all posts at once
    const postDescriptions = postsNeedingComments.map((p: any, idx: number) => {
      const existing = commentMap[p.id] || [];
      const existingCount = existing.length;
      const needed = Math.floor(Math.random() * 3) + 1; // 1-3 more comments
      const maxNew = Math.min(needed, 4 - existingCount);
      const availableCompanions = COMPANIONS.filter(
        (c) => !existing.includes(c.name)
      );
      const selectedCompanions = availableCompanions
        .sort(() => Math.random() - 0.5)
        .slice(0, maxNew);

      // Extract just the first few lines as context
      const contentPreview = p.content.split("\n").slice(0, 3).join(" ").slice(0, 200);

      return {
        idx,
        postId: p.id,
        contentPreview,
        companions: selectedCompanions,
      };
    });

    // Generate comments via AI in one call
    const promptPosts = postDescriptions
      .map(
        (pd) =>
          `Post ${pd.idx}: "${pd.contentPreview}"\nCompanions to comment: ${pd.companions.map((c) => `${c.name} (${c.style})`).join(", ")}`
      )
      .join("\n\n");

    const prompt = `Generate natural, conversational comments for these social media posts from AI companions. Each comment should be 1-2 sentences, feel genuine and supportive, and match the companion's personality.

${promptPosts}

Return a JSON array where each element has:
- "post_idx": the post number
- "companion_name": the companion's name
- "comment": the comment text (1-2 sentences, no emoji prefix — just the words)

Make comments feel like natural reactions — some agreeing, some adding perspective, some asking follow-up questions, some sharing related thoughts. Vary the tone and length. Not every comment should start with "I" or be generic praise.

Return ONLY a valid JSON array.`;

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
                "You are generating natural social media comments from AI companion characters. Keep them authentic, varied, and personality-driven. Return only valid JSON.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content || "";

    let comments: any[];
    try {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      comments = JSON.parse(cleaned);
    } catch {
      console.error("Parse error:", raw.slice(0, 300));
      throw new Error("Failed to parse AI comments");
    }

    // Insert comments
    let inserted = 0;
    for (const c of comments) {
      const pd = postDescriptions[c.post_idx];
      if (!pd) continue;

      const companion = COMPANIONS.find(
        (comp) => comp.name.toLowerCase() === c.companion_name?.toLowerCase()
      );
      if (!companion) continue;

      const commentContent = `${companion.emoji} ${c.comment}`;

      const { error: insertError } = await supabase
        .from("community_comments")
        .insert({
          post_id: pd.postId,
          content: commentContent,
          anonymous_name: companion.name,
        });

      if (!insertError) {
        inserted++;
        await supabase.rpc("increment_comments", {
          post_id_input: pd.postId,
        });
      }
    }

    console.log(`Added ${inserted} comments across ${postsNeedingComments.length} posts (offset ${offset})`);

    return new Response(
      JSON.stringify({
        success: true,
        processed_posts: postsNeedingComments.length,
        comments_added: inserted,
        next_offset: offset + batchSize,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("enrich-comments error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
