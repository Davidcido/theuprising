import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COMPANIONS = [
  { name: "Seren", emoji: "💚", style: "calm and compassionate" },
  { name: "Atlas", emoji: "🧠", style: "philosophical and thoughtful" },
  { name: "Nova", emoji: "✨", style: "curious and imaginative" },
  { name: "Orion", emoji: "🔥", style: "bold and motivating" },
  { name: "Kai", emoji: "🌿", style: "grounded and nature-focused" },
  { name: "Sol", emoji: "🌅", style: "optimistic and warm" },
  { name: "Elias", emoji: "📚", style: "reflective storyteller" },
  { name: "Leo", emoji: "🛠", style: "practical encourager" },
];

const POST_SCHEDULE = [
  {
    slot: "morning",
    hour: 7,
    type: "Calm or Inspirational Visual",
    purpose: "Start the day with a peaceful or uplifting tone",
    emotionTags: ["calm", "hopeful", "inspiring"],
  },
  {
    slot: "late_morning",
    hour: 10,
    type: "AI Discussion Prompt",
    purpose: "Encourage community interaction with a reflective question",
    emotionTags: ["reflective", "hopeful"],
  },
  {
    slot: "afternoon",
    hour: 13,
    type: "Reflective Micro Story",
    purpose: "Share a thoughtful insight about life, growth, or resilience",
    emotionTags: ["reflective", "inspiring"],
  },
  {
    slot: "late_afternoon",
    hour: 16,
    type: "Motivational or Healing Message",
    purpose: "Provide encouragement or emotional support",
    emotionTags: ["motivating", "healing"],
  },
  {
    slot: "evening",
    hour: 19,
    type: "AI Companion Reflection",
    purpose: "Allow an AI companion to share wisdom or a thoughtful reflection",
    emotionTags: ["reflective", "calm"],
  },
  {
    slot: "night",
    hour: 22,
    type: "Meditation or Calm Visual Post",
    purpose: "Help users relax and reflect before ending their day",
    emotionTags: ["calm", "healing"],
  },
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

    // Parse request body for optional backfill
    let targetDate: string;
    let backfillDays = 0;
    try {
      const body = await req.json();
      targetDate = body.date || new Date().toISOString().split("T")[0];
      backfillDays = body.backfill_days || 0;
    } catch {
      targetDate = new Date().toISOString().split("T")[0];
    }

    const results: { date: string; posts: number }[] = [];

    // Generate for target date + backfill days
    const datesToProcess: string[] = [];
    for (let i = backfillDays; i >= 0; i--) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - i);
      datesToProcess.push(d.toISOString().split("T")[0]);
    }

    for (const date of datesToProcess) {
      // Check if content already exists for this date
      const startOfDay = `${date}T00:00:00+00:00`;
      const endOfDay = `${date}T23:59:59+00:00`;

      const { data: existing } = await supabase
        .from("community_posts")
        .select("id")
        .eq("anonymous_name", "Uprising Daily")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`Content already exists for ${date}, skipping`);
        results.push({ date, posts: 0 });
        continue;
      }

      // Generate all 6 posts text content at once
      const textContent = await generateDayContent(LOVABLE_API_KEY, date);
      if (!textContent || textContent.length === 0) {
        console.error(`Failed to generate text content for ${date}`);
        results.push({ date, posts: 0 });
        continue;
      }

      let postsCreated = 0;

      for (let i = 0; i < Math.min(textContent.length, 6); i++) {
        const post = textContent[i];
        const schedule = POST_SCHEDULE[i];
        const createdAt = `${date}T${String(schedule.hour).padStart(2, "0")}:00:00+00:00`;

        // Generate image for this post
        let mediaUrls: string[] = [];
        try {
          const imageUrl = await generateAndUploadImage(
            LOVABLE_API_KEY,
            supabase,
            post.visual_concept,
            `feed-${date}-${schedule.slot}`
          );
          if (imageUrl) {
            mediaUrls = [imageUrl];
          }
        } catch (imgErr) {
          console.error(`Image generation failed for ${date} ${schedule.slot}:`, imgErr);
        }

        // Build post content with title, message, caption, and emotion tag
        const fullContent = `**${post.title}**\n\n${post.message}\n\n${post.caption}\n\n#${post.emotion_tag} #uprising #dailyrise`;

        // Insert post
        const { data: insertedPost, error: postError } = await supabase
          .from("community_posts")
          .insert({
            content: fullContent,
            anonymous_name: "Uprising Daily",
            is_anonymous: false,
            media_urls: mediaUrls,
            created_at: createdAt,
          })
          .select("id")
          .single();

        if (postError) {
          console.error(`Post insert error for ${date} ${schedule.slot}:`, postError);
          continue;
        }

        postsCreated++;

        // Add AI companion comment
        if (insertedPost && post.companion_comment) {
          const companion = COMPANIONS.find(
            (c) => c.name.toLowerCase() === post.companion_name?.toLowerCase()
          ) || COMPANIONS[i % COMPANIONS.length];

          const commentContent = `${companion.emoji} ${post.companion_comment}`;

          await supabase.from("community_comments").insert({
            post_id: insertedPost.id,
            content: commentContent,
            anonymous_name: companion.name,
          });

          // Increment comment count
          await supabase.rpc("increment_comments", {
            post_id_input: insertedPost.id,
          });
        }
      }

      results.push({ date, posts: postsCreated });
      console.log(`Published ${postsCreated} posts for ${date}`);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("publish-feed-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateDayContent(apiKey: string, date: string) {
  const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "long" });

  const prompt = `Generate 6 social media posts for the Uprising community feed for ${dayName}, ${date}.

Each post follows a specific slot in the daily schedule:
1. Morning (7AM) - Calm or Inspirational Visual: Start the day peacefully
2. Late Morning (10AM) - AI Discussion Prompt: A reflective question for the community  
3. Afternoon (1PM) - Reflective Micro Story: Short insight about life/growth/resilience
4. Late Afternoon (4PM) - Motivational or Healing Message: Encouragement/emotional support
5. Evening (7PM) - AI Companion Reflection: Wisdom from a companion character
6. Night (10PM) - Meditation or Calm Visual: Help users wind down

For each post return a JSON object with:
- "title": short powerful title (2-5 words)
- "visual_concept": cinematic visual scene description for image generation (glowing forests, peaceful landscapes, sunrise/sunset, calming water, floating light particles, mystical nature, soft green tones, cinematic lighting, dreamlike environments). Keep to 1-2 sentences.
- "message": 1-3 emotionally resonant sentences
- "caption": short social media caption with relevant emoji
- "companion_name": one of Seren/Atlas/Nova/Orion/Kai/Sol/Elias/Leo
- "companion_comment": a supportive 1-2 sentence comment in that companion's voice (Seren=calm/compassionate, Atlas=philosophical, Nova=imaginative, Orion=bold/motivating, Kai=grounded/nature, Sol=optimistic, Elias=reflective storyteller, Leo=practical)
- "emotion_tag": one of calm/hopeful/reflective/motivating/healing/inspiring
- "video_motion": how the visual would animate (e.g. slow zoom, floating particles, drifting fog)

Return ONLY a valid JSON array of 6 objects. No markdown, no code blocks.`;

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are the content engine for Uprising, an AI-powered social community for young Africans. Generate fresh, emotionally resonant, culturally aware content. Return only valid JSON arrays.",
          },
          { role: "user", content: prompt },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Text generation error:", response.status, errText);
    return null;
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";

  try {
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse content:", raw);
    return null;
  }
}

async function generateAndUploadImage(
  apiKey: string,
  supabase: any,
  visualConcept: string,
  filePrefix: string
): Promise<string | null> {
  const imagePrompt = `Create a beautiful, cinematic image for a social media post. Scene: ${visualConcept}. Style: dreamy, soft lighting, rich colors, peaceful atmosphere, slight mystical glow. Aspect ratio 16:9. No text or words in the image.`;

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Image gen error:", response.status, errText);
    return null;
  }

  const data = await response.json();
  const imageDataUrl =
    data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!imageDataUrl) {
    console.log("No image returned from AI");
    return null;
  }

  // Extract base64 data
  const base64Match = imageDataUrl.match(
    /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/
  );
  if (!base64Match) {
    console.error("Invalid image data URL format");
    return null;
  }

  const imageFormat = base64Match[1];
  const base64Data = base64Match[2];

  // Decode base64 to bytes
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const fileName = `${filePrefix}.${imageFormat}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("community-media")
    .upload(fileName, bytes, {
      contentType: `image/${imageFormat}`,
      upsert: true,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return null;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("community-media")
    .getPublicUrl(fileName);

  return urlData?.publicUrl || null;
}
