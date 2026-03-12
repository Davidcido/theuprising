import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Pre-uploaded cinematic video URLs in community-media bucket
const FEED_VIDEOS = [
  "feed-videos/glowing-forest.mp4",
  "feed-videos/sunrise-mountains.mp4",
  "feed-videos/ocean-waves.mp4",
  "feed-videos/glowing-orbs.mp4",
  "feed-videos/breathing-meditation.mp4",
  "feed-videos/bamboo-forest.mp4",
];

const POST_SCHEDULE = [
  { slot: "morning", hour: 7, mediaType: "video" as const },
  { slot: "late_morning", hour: 10, mediaType: "video" as const },
  { slot: "afternoon", hour: 13, mediaType: "image" as const },
  { slot: "late_afternoon", hour: 16, mediaType: "video" as const },
  { slot: "evening", hour: 19, mediaType: "video" as const },
  { slot: "night", hour: 22, mediaType: "discussion" as const },
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

    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body.date || new Date().toISOString().split("T")[0];
    } catch {
      targetDate = new Date().toISOString().split("T")[0];
    }

    // Check if content already exists for this date
    const startOfDay = `${targetDate}T00:00:00+00:00`;
    const endOfDay = `${targetDate}T23:59:59+00:00`;

    const { data: existing } = await supabase
      .from("community_posts")
      .select("id")
      .eq("anonymous_name", "Uprising Daily")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ message: `Content already exists for ${targetDate}`, posts: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6 posts text content
    const textContent = await generateDayContent(LOVABLE_API_KEY, targetDate);
    if (!textContent || textContent.length === 0) {
      throw new Error("Failed to generate text content");
    }

    // Build video public URLs
    const storageBase = `${supabaseUrl}/storage/v1/object/public/community-media/`;

    let postsCreated = 0;
    let videoIndex = 0;

    for (let i = 0; i < Math.min(textContent.length, 6); i++) {
      const post = textContent[i];
      const schedule = POST_SCHEDULE[i];
      const createdAt = `${targetDate}T${String(schedule.hour).padStart(2, "0")}:00:00+00:00`;

      let mediaUrls: string[] = [];

      if (schedule.mediaType === "video") {
        // Assign a pre-uploaded video
        const videoPath = FEED_VIDEOS[videoIndex % FEED_VIDEOS.length];
        mediaUrls = [`${storageBase}${videoPath}`];
        videoIndex++;
      } else if (schedule.mediaType === "image") {
        // Generate AI image
        try {
          const imageUrl = await generateAndUploadImage(
            LOVABLE_API_KEY,
            supabase,
            post.visual_concept || post.title,
            `feed-${targetDate}-${schedule.slot}`
          );
          if (imageUrl) mediaUrls = [imageUrl];
        } catch (imgErr) {
          console.error(`Image gen failed for ${schedule.slot}:`, imgErr);
        }
      }
      // "discussion" type = text-only (no media)

      const fullContent = `**${post.title}**\n\n${post.message}\n\n${post.caption}\n\n#${post.emotion_tag} #uprising #dailyrise`;

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
        console.error(`Post insert error:`, postError);
        continue;
      }

      postsCreated++;

      // Add AI companion comment
      if (insertedPost && post.companion_comment) {
        const companion = COMPANIONS.find(
          (c) => c.name.toLowerCase() === post.companion_name?.toLowerCase()
        ) || COMPANIONS[i % COMPANIONS.length];

        await supabase.from("community_comments").insert({
          post_id: insertedPost.id,
          content: `${companion.emoji} ${post.companion_comment}`,
          anonymous_name: companion.name,
        });

        await supabase.rpc("increment_comments", { post_id_input: insertedPost.id });
      }
    }

    console.log(`Published ${postsCreated} posts for ${targetDate}`);

    return new Response(
      JSON.stringify({ success: true, date: targetDate, posts: postsCreated }),
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

Schedule (70% visual, 30% text):
1. Morning (7AM) - 🖼️ IMAGE POST: Calm/Inspirational Visual with cinematic image
2. Late Morning (10AM) - 💬 DISCUSSION POST (text-only): Start a community discussion with a thought-provoking question that invites users to share their experiences
3. Afternoon (1PM) - 🎥 VIDEO POST: Reflective post paired with cinematic nature video
4. Late Afternoon (4PM) - 🖼️ IMAGE POST: Motivational/Healing Message with striking visual
5. Evening (7PM) - 🖼️ IMAGE POST: AI Companion Reflection with dreamy visual
6. Night (10PM) - 🎥 VIDEO POST: Meditation/Calm post paired with peaceful video

Discussion post examples (slot 2):
- "What small moment made your day better today?"
- "What helps you find calm when life feels overwhelming?"
- "What's something you're grateful for tonight?"
- "If you could give your younger self one piece of advice, what would it be?"

For each return JSON with:
- "title": short powerful title (2-5 words)
- "visual_concept": cinematic scene description for image posts (glowing forests, peaceful landscapes, sunrise/sunset, calming water, floating particles, mystical nature, soft green tones, dreamlike). For discussion/video posts, still provide a concept.
- "message": 1-3 emotionally resonant sentences
- "caption": short social media caption with emoji
- "companion_name": one of Seren/Atlas/Nova/Orion/Kai/Sol/Elias/Leo
- "companion_comment": supportive 1-2 sentence comment in that companion's voice
- "emotion_tag": one of calm/hopeful/reflective/motivating/healing/inspiring

Return ONLY a valid JSON array of 6 objects.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          content: "You are the content engine for Uprising, an AI-powered social community for young Africans. Generate fresh, emotionally resonant, culturally aware content. Return only valid JSON arrays.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Text gen error:", response.status, errText);
    return null;
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";

  try {
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse:", raw.slice(0, 200));
    return null;
  }
}

async function generateAndUploadImage(
  apiKey: string,
  supabase: any,
  visualConcept: string,
  filePrefix: string
): Promise<string | null> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [{
        role: "user",
        content: `Create a beautiful cinematic image: ${visualConcept}. Style: dreamy, soft lighting, rich colors, peaceful, mystical glow. No text in image. Vertical 9:16 aspect ratio.`,
      }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    await response.text();
    return null;
  }

  const data = await response.json();
  const imageDataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageDataUrl) return null;

  const base64Match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!base64Match) return null;

  const imageFormat = base64Match[1];
  const base64Data = base64Match[2];
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  const fileName = `${filePrefix}.${imageFormat}`;
  const { error: uploadError } = await supabase.storage
    .from("community-media")
    .upload(fileName, bytes, { contentType: `image/${imageFormat}`, upsert: true });

  if (uploadError) return null;

  const { data: urlData } = supabase.storage.from("community-media").getPublicUrl(fileName);
  return urlData?.publicUrl || null;
}
