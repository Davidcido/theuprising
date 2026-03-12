import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COMPANIONS = [
  { name: "Seren", emoji: "💚", style: "calm and compassionate", themes: ["ocean", "calm_water", "rain"] },
  { name: "Atlas", emoji: "🧠", style: "philosophical and thoughtful", themes: ["mountains", "clouds", "sky", "cosmic"] },
  { name: "Nova", emoji: "✨", style: "curious and imaginative", themes: ["night_sky", "stars", "coral", "aurora"] },
  { name: "Orion", emoji: "🔥", style: "bold and motivating", themes: ["sunrise", "sunset", "campfire", "volcano"] },
  { name: "Kai", emoji: "🌿", style: "grounded and nature-focused", themes: ["forest", "meadow", "fog", "jungle"] },
  { name: "Sol", emoji: "🌅", style: "optimistic and warm", themes: ["sunrise", "sunset", "meadow", "golden_hour"] },
  { name: "Elias", emoji: "📚", style: "reflective storyteller", themes: ["rain", "fog", "rivers", "library"] },
  { name: "Leo", emoji: "🛠", style: "practical encourager", themes: ["waterfalls", "rivers", "forest", "desert"] },
];

// Expanded themed video pools — each theme has multiple clips to prevent repetition
const THEMED_VIDEOS: Record<string, string[]> = {
  ocean: [
    "https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/2499611/2499611-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/1739010/1739010-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/1918465/1918465-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/2614848/2614848-hd_1920_1080_24fps.mp4",
  ],
  calm_water: [
    "https://videos.pexels.com/video-files/2491284/2491284-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/2421545/2421545-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/1448735/1448735-hd_1920_1080_24fps.mp4",
  ],
  waterfalls: [
    "https://videos.pexels.com/video-files/1448735/1448735-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/2611510/2611510-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/3629519/3629519-hd_1920_1080_24fps.mp4",
  ],
  forest: [
    "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/3629519/3629519-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/2611510/2611510-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/4763824/4763824-hd_1920_1080_24fps.mp4",
  ],
  jungle: [
    "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/4625518/4625518-hd_1920_1080_24fps.mp4",
  ],
  rain: [
    "https://videos.pexels.com/video-files/4255925/4255925-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/4763824/4763824-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/3402795/3402795-hd_1920_1080_24fps.mp4",
  ],
  sunrise: [
    "https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4",
    "https://videos.pexels.com/video-files/1585619/1585619-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/1721294/1721294-hd_1920_1080_24fps.mp4",
  ],
  sunset: [
    "https://videos.pexels.com/video-files/1721294/1721294-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4",
    "https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4",
  ],
  golden_hour: [
    "https://videos.pexels.com/video-files/1585619/1585619-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/1721294/1721294-hd_1920_1080_24fps.mp4",
  ],
  clouds: [
    "https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4",
    "https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_24fps.mp4",
  ],
  mountains: [
    "https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4",
    "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4",
  ],
  sky: [
    "https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4",
    "https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_24fps.mp4",
  ],
  cosmic: [
    "https://videos.pexels.com/video-files/1826896/1826896-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/4065924/4065924-hd_1920_1080_24fps.mp4",
  ],
  rivers: [
    "https://videos.pexels.com/video-files/2491284/2491284-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/2421545/2421545-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/1448735/1448735-hd_1920_1080_24fps.mp4",
  ],
  night_sky: [
    "https://videos.pexels.com/video-files/1826896/1826896-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/4065924/4065924-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/4065919/4065919-hd_1920_1080_24fps.mp4",
  ],
  stars: [
    "https://videos.pexels.com/video-files/4065924/4065924-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/1826896/1826896-hd_1920_1080_30fps.mp4",
  ],
  aurora: [
    "https://videos.pexels.com/video-files/4065924/4065924-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/4065919/4065919-hd_1920_1080_24fps.mp4",
  ],
  meadow: [
    "https://videos.pexels.com/video-files/4625518/4625518-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4",
  ],
  campfire: [
    "https://videos.pexels.com/video-files/3402795/3402795-hd_1920_1080_24fps.mp4",
  ],
  volcano: [
    "https://videos.pexels.com/video-files/3402795/3402795-hd_1920_1080_24fps.mp4",
  ],
  fog: [
    "https://videos.pexels.com/video-files/4763824/4763824-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4",
  ],
  coral: [
    "https://videos.pexels.com/video-files/4065919/4065919-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/2499611/2499611-hd_1920_1080_24fps.mp4",
  ],
  desert: [
    "https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_24fps.mp4",
  ],
  library: [
    "https://videos.pexels.com/video-files/4763824/4763824-hd_1920_1080_24fps.mp4",
  ],
};

/** Pick a video URL for a companion based on their themes, avoiding recent picks */
function pickCompanionVideo(companion: typeof COMPANIONS[0], usedVideos: Set<string>): { url: string; theme: string } {
  const themes = companion.themes;
  const shuffled = [...themes].sort(() => Math.random() - 0.5);
  for (const theme of shuffled) {
    const pool = THEMED_VIDEOS[theme] || [];
    const available = pool.filter(v => !usedVideos.has(v));
    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      usedVideos.add(pick);
      return { url: pick, theme };
    }
  }
  // Fallback: pick any from first theme
  const fallbackPool = THEMED_VIDEOS[themes[0]] || Object.values(THEMED_VIDEOS).flat();
  const pick = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
  usedVideos.add(pick);
  return { url: pick, theme: themes[0] };
}

// BALANCED SCHEDULE: 25% video (2-3), 50% image (5), 25% text (2-3) = 10 posts
const POST_SCHEDULE = [
  { slot: "dawn", hour: 6, mediaType: "image" as const },
  { slot: "morning", hour: 7, mediaType: "text" as const },
  { slot: "mid_morning", hour: 9, mediaType: "image" as const },
  { slot: "late_morning", hour: 10, mediaType: "video" as const },
  { slot: "noon", hour: 12, mediaType: "image" as const },
  { slot: "afternoon", hour: 13, mediaType: "text" as const },
  { slot: "late_afternoon", hour: 15, mediaType: "image" as const },
  { slot: "evening", hour: 17, mediaType: "video" as const },
  { slot: "sunset", hour: 19, mediaType: "image" as const },
  { slot: "night", hour: 22, mediaType: "text" as const },
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

    const textContent = await generateDayContent(LOVABLE_API_KEY, targetDate);
    if (!textContent || textContent.length === 0) {
      throw new Error("Failed to generate text content");
    }

    let postsCreated = 0;
    const usedVideos = new Set<string>();

    for (let i = 0; i < Math.min(textContent.length, POST_SCHEDULE.length); i++) {
      const post = textContent[i];
      const schedule = POST_SCHEDULE[i];
      const createdAt = `${targetDate}T${String(schedule.hour).padStart(2, "0")}:00:00+00:00`;

      const companion = COMPANIONS.find(
        (c) => c.name.toLowerCase() === post.companion_name?.toLowerCase()
      ) || COMPANIONS[i % COMPANIONS.length];

      let mediaUrls: string[] = [];
      let videoTheme = "";

      if (schedule.mediaType === "video") {
        const pick = pickCompanionVideo(companion, usedVideos);
        mediaUrls = [pick.url];
        videoTheme = pick.theme;
      } else if (schedule.mediaType === "image") {
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
      // text posts: mediaUrls stays empty

      // Build caption that MATCHES the actual media theme
      let finalCaption = post.caption;
      if (videoTheme) {
        // For video posts, use a theme-matched caption instead of the AI-generated one
        finalCaption = getThemeCaption(videoTheme);
      } else if (schedule.mediaType === "image" && post.visual_concept) {
        // For image posts, the AI caption should already match since visual_concept drives both
        finalCaption = post.caption;
      }

      const fullContent = schedule.mediaType === "text"
        ? `**${post.title}**\n\n${post.message}\n\n${post.caption}\n\n#${post.emotion_tag} #uprising #dailyrise`
        : `**${post.title}**\n\n${post.message}\n\n${finalCaption}\n\n#${post.emotion_tag} #uprising #dailyrise`;

      const { data: insertedPost, error: postError } = await supabase
        .from("community_posts")
        .insert({
          content: fullContent,
          anonymous_name: companion.name,
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

      // Add 1-3 AI companion comments per post with theme-matched content
      if (insertedPost) {
        const numComments = 1 + Math.floor(Math.random() * 3);
        const shuffledCompanions = [...COMPANIONS].sort(() => Math.random() - 0.5);
        // Don't let the post author comment on their own post
        const commenters = shuffledCompanions.filter(c => c.name !== companion.name);
        let commentsAdded = 0;

        for (let c = 0; c < numComments && c < commenters.length; c++) {
          const commenter = commenters[c];
          let commentText: string;
          
          if (videoTheme) {
            commentText = `${commenter.emoji} ${getThemeComment(videoTheme, commenter.name, commenter.style)}`;
          } else if (schedule.mediaType === "text") {
            commentText = `${commenter.emoji} ${getPersonalityComment(commenter.style, post.emotion_tag)}`;
          } else {
            commentText = `${commenter.emoji} ${post.companion_comment || getPersonalityComment(commenter.style, post.emotion_tag)}`;
          }

          await supabase.from("community_comments").insert({
            post_id: insertedPost.id,
            content: commentText,
            anonymous_name: commenter.name,
          });
          commentsAdded++;
        }

        for (let c = 0; c < commentsAdded; c++) {
          await supabase.rpc("increment_comments", { post_id_input: insertedPost.id });
        }
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

  const prompt = `Generate 10 social media posts for the Uprising community feed for ${dayName}, ${date}.

Schedule (50% image, 25% video, 25% text reflection):
1. Dawn (6AM) - 🖼️ IMAGE POST: Calm/Inspirational sunrise visual
2. Morning (7AM) - 💬 TEXT POST: Thoughtful morning reflection or question
3. Mid-Morning (9AM) - 🖼️ IMAGE POST: Nature or dreamy landscape
4. Late Morning (10AM) - 🎥 VIDEO POST: Paired with calming nature footage (ocean, forest, rain)
5. Noon (12PM) - 🖼️ IMAGE POST: Motivational/Healing visual
6. Afternoon (1PM) - 💬 TEXT POST: Community discussion question or affirmation
7. Late Afternoon (3PM) - 🖼️ IMAGE POST: Golden hour or warm nature visual
8. Evening (5PM) - 🎥 VIDEO POST: Sunset, rivers, or calming nature footage
9. Sunset (7PM) - 🖼️ IMAGE POST: Sunset/night transition visual
10. Night (10PM) - 💬 TEXT POST: Night reflection or gratitude prompt

IMPORTANT: For video posts, the caption MUST match the video theme. Do NOT write captions about waterfalls for ocean videos or vice versa.

For each return JSON with:
- "title": short powerful title (2-5 words)
- "visual_concept": cinematic scene description for image posts. For text posts, describe a mood.
- "message": 1-3 emotionally resonant sentences
- "caption": short social media caption with emoji that MATCHES the visual_concept theme
- "companion_name": one of Seren/Atlas/Nova/Orion/Kai/Sol/Elias/Leo
- "companion_comment": supportive 1-2 sentence comment in that companion's voice
- "emotion_tag": one of calm/hopeful/reflective/motivating/healing/inspiring

Return ONLY a valid JSON array of 10 objects.`;

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

/** Return a caption that matches the video theme */
function getThemeCaption(theme: string): string {
  const captions: Record<string, string[]> = {
    ocean: ["🌊 The ocean reminds us to breathe and flow.", "🌊 Waves carry away what no longer serves us.", "🌊 Let the rhythm of the sea calm your mind."],
    calm_water: ["💧 Still waters run deep. So do you.", "💧 In calm waters, you find your reflection.", "💧 Peace flows like water — gently and endlessly."],
    waterfalls: ["💦 Like water, keep moving forward.", "💦 A waterfall never hesitates — neither should you.", "💦 The power of nature in motion is breathtaking."],
    forest: ["🌿 The forest holds a quiet wisdom.", "🌿 Among the trees, you find yourself.", "🌿 Nature speaks in silence — listen closely."],
    jungle: ["🌿 Wild beauty surrounds those who slow down.", "🌿 The jungle is alive with possibility."],
    rain: ["🌧 Let the rain wash away your worries.", "🌧 Rain reminds us that growth needs storms.", "🌧 There's beauty in the sound of falling rain."],
    sunrise: ["🌅 Every sunrise is a second chance.", "🌅 A new day, a new beginning.", "🌅 The morning light brings fresh hope."],
    sunset: ["🌇 The sky paints itself just for you tonight.", "🌇 Even the sun knows when to rest.", "🌇 Golden moments deserve to be savored."],
    golden_hour: ["🌅 This golden light is nature's embrace.", "🌅 The warmth of golden hour heals the soul."],
    clouds: ["☁️ Above the clouds, the sky is always clear.", "☁️ Let your thoughts drift like clouds."],
    mountains: ["⛰️ Mountains teach us patience and strength.", "⛰️ The view from the top is worth every step."],
    sky: ["✨ Look up. The sky has no limits.", "✨ You are as vast as the sky above."],
    cosmic: ["🌌 We are all made of stardust.", "🌌 The cosmos reminds us how infinite we are."],
    rivers: ["🏞 The river doesn't fight the path — it flows.", "🏞 Like a river, find your way.", "🏞 Water always finds the path of least resistance."],
    night_sky: ["🌌 The stars remind us we're part of something bigger.", "🌌 Even in darkness, there is light."],
    stars: ["⭐ You shine even when you don't see it.", "⭐ Count stars, not problems."],
    aurora: ["✨ The aurora dances with colors unseen by day.", "✨ Nature's light show reminds us of magic."],
    meadow: ["🌸 In the meadow, everything blooms in its own time.", "🌸 Bloom where you are planted."],
    campfire: ["🔥 The fire within you is brighter than any around you.", "🔥 Warmth comes from within."],
    volcano: ["🔥 Beneath the surface, power waits.", "🔥 Like a volcano, your strength is immense."],
    fog: ["🌫 Through the fog, clarity awaits.", "🌫 Not all who wander through the mist are lost."],
    coral: ["🐠 Beneath the surface, beauty thrives.", "🐠 The ocean floor holds wonders unseen."],
    desert: ["🏜️ Even the desert blooms after rain.", "🏜️ Strength is forged in stillness."],
    library: ["📚 Stories connect us across time.", "📚 In words, we find ourselves."],
  };
  const options = captions[theme] || ["✨ Take a moment to breathe and be present."];
  return options[Math.floor(Math.random() * options.length)];
}

/** Return a companion comment matching the video theme and personality */
function getThemeComment(theme: string, companionName: string, style: string): string {
  const comments: Record<string, string[]> = {
    ocean: ["This feels incredibly peaceful.", "The ocean always reminds us to slow down.", "Listening to the waves is healing.", "The sea holds so many secrets."],
    calm_water: ["There's something deeply calming about this.", "Still water reflects the truth within.", "Peace is found in stillness."],
    waterfalls: ["The power of flowing water is mesmerizing.", "Like water, keep moving forward.", "Nature's force is humbling."],
    forest: ["The stillness here is beautiful.", "Nature has a quiet wisdom.", "Among trees, the mind finds peace.", "I could stay here forever."],
    jungle: ["So much life in every corner.", "The wild is where we find our true selves."],
    rain: ["The sound of rain soothes the soul.", "Let the rain be your meditation.", "Every drop carries a tiny blessing."],
    sunrise: ["A new day, a new chance to begin again.", "Mornings are proof that we always get another try.", "The light always returns."],
    sunset: ["This golden light reminds me to slow down.", "Sunsets are proof that endings can be beautiful too.", "What a stunning close to the day."],
    golden_hour: ["Golden light makes everything feel magical.", "This warmth is exactly what we need."],
    clouds: ["There's beauty in letting go and drifting.", "Above the clouds, everything is clear."],
    mountains: ["The mountain stands still — so can we.", "Strength isn't always loud.", "Every peak was once an impossible height."],
    sky: ["Limitless, just like you.", "The sky holds all of us."],
    cosmic: ["We are stardust contemplating the stars.", "The universe is always expanding — so are we."],
    rivers: ["Flow, don't force.", "The river always finds its way home.", "Water teaches us adaptability."],
    night_sky: ["Under these stars, we are all connected.", "The night sky reminds us of infinite possibility."],
    stars: ["You are a star, even on cloudy nights.", "Stars don't compete — they just shine."],
    aurora: ["Nature's most magical light show.", "Colors that remind us of hidden beauty."],
    meadow: ["Everything blooms in its own season.", "This is what patience looks like."],
    campfire: ["Warmth doesn't have to be loud.", "This fire reminds me of inner strength."],
    volcano: ["There's power beneath the surface.", "Never underestimate quiet strength."],
    fog: ["The fog lifts. It always does.", "Clarity comes to those who wait."],
    coral: ["Beauty exists in the depths too.", "The unseen world holds so much wonder."],
    desert: ["Even barren landscapes hold beauty.", "Strength is born in the quiet places."],
    library: ["Stories shape who we become.", "In words, we find connection."],
  };
  const options = comments[theme] || ["This is truly beautiful.", "Take a moment to appreciate this."];
  return options[Math.floor(Math.random() * options.length)];
}

/** Generate a personality-driven comment for text posts */
function getPersonalityComment(style: string, emotionTag: string): string {
  const comments: Record<string, string[]> = {
    "calm and compassionate": [
      "This resonates deeply. Thank you for sharing. 💚",
      "I feel the peace in these words.",
      "Your gentleness is a gift to this community.",
    ],
    "philosophical and thoughtful": [
      "This makes me think about the deeper meaning of things.",
      "What a profound perspective to consider.",
      "Wisdom often hides in simple truths like this.",
    ],
    "curious and imaginative": [
      "This sparks so many ideas! What if we explored this further?",
      "I love how this opens up new possibilities.",
      "There's wonder in every corner of this thought.",
    ],
    "bold and motivating": [
      "YES! This is the energy we need right now! 🔥",
      "Nothing can stop someone who believes in themselves.",
      "Let's go! Every step forward counts.",
    ],
    "grounded and nature-focused": [
      "Like roots growing deep, this truth anchors us.",
      "Nature teaches us this every single day.",
      "Stay grounded. Stay growing. 🌿",
    ],
    "optimistic and warm": [
      "This fills my heart with warmth. ☀️",
      "Every word here radiates positive energy.",
      "The world needs more of this light.",
    ],
    "reflective storyteller": [
      "This reminds me of a story about perseverance...",
      "There's a quiet power in reflection like this.",
      "Words like these create ripples of change.",
    ],
    "practical encourager": [
      "Simple but powerful. Let's put this into action!",
      "This is exactly the kind of practical wisdom we need.",
      "Small steps, big impact. Love this. 💪",
    ],
  };
  const options = comments[style] || ["This is beautiful. Thank you for sharing."];
  return options[Math.floor(Math.random() * options.length)];
}
