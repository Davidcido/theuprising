// Releases planned companion activity into the live community feed as its moment arrives.
// Runs hourly. Only touches rows that are due; never modifies existing posts.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  resolveCompanion,
  pickCompanionVideo,
  COMPANIONS,
  THEMED_VIDEOS,
  selectCommenters,
  buildVisualDirection,
  seedFrom,
} from "../_shared/feedCompanions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JOB_KEY = "feed_publisher";
const MAX_PER_RUN = 40;
const MAX_IMAGES_PER_RUN = 3;

const REACTION_EMOJIS = ["❤️", "🔥", "🙏", "✨", "💚", "😊"];

async function generateImage(
  apiKey: string,
  supabase: any,
  concept: string,
  fileName: string,
): Promise<string | null> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      messages: [
        {
          role: "user",
          content: `Create a beautiful cinematic image: ${concept}. Style: dreamy, soft lighting, rich colors, peaceful, mystical glow. No text in image. Vertical 9:16 aspect ratio.`,
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    console.error("image gen failed", response.status, (await response.text()).slice(0, 200));
    return null;
  }

  const data = await response.json();
  const dataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const match = dataUrl?.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!match) return null;

  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const path = `${fileName}.${match[1]}`;
  const { error } = await supabase.storage
    .from("community-media")
    .upload(path, bytes, { contentType: `image/${match[1]}`, upsert: true });
  if (error) return null;

  return supabase.storage.from("community-media").getPublicUrl(path).data?.publicUrl || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: gotLease } = await supabase.rpc("acquire_feed_job_lease", {
      _key: JOB_KEY,
      _seconds: 240,
    });
    if (!gotLease) {
      return new Response(JSON.stringify({ skipped: "publisher already running" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const nowIso = new Date().toISOString();

    const { data: due } = await supabase
      .from("feed_content_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(MAX_PER_RUN);

    let published = 0;
    let imagesMade = 0;

    for (const item of due || []) {
      // Claim the row so a concurrent run can never double-publish it
      const { data: claimed } = await supabase
        .from("feed_content_queue")
        .update({ status: "publishing" })
        .eq("id", item.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      const companion = findCompanion(item.companion_name) || COMPANIONS[0];
      let mediaUrls: string[] = item.media_urls || [];

      if (item.media_type === "image" && mediaUrls.length === 0) {
        if (apiKey && imagesMade < MAX_IMAGES_PER_RUN) {
          const url = await generateImage(
            apiKey,
            supabase,
            item.visual_concept || item.content.slice(0, 120),
            `feed-${item.id}`,
          );
          if (url) {
            mediaUrls = [url];
            imagesMade++;
          }
        }
        if (mediaUrls.length === 0) {
          // graceful fallback: a themed clip rather than an empty media post
          const pick = pickCompanionVideo(companion, Math.floor(Math.random() * 97));
          mediaUrls = [pick.url];
        }
      }

      const engagement = item.engagement || {};
      const { data: post, error: postError } = await supabase
        .from("community_posts")
        .insert({
          content: item.content,
          anonymous_name: companion.name,
          is_anonymous: false,
          media_urls: mediaUrls,
          created_at: item.scheduled_at,
          likes_count: Math.max(0, engagement.likes ?? 0),
          views_count: Math.max(0, engagement.views ?? 0),
        })
        .select("id")
        .single();

      if (postError || !post) {
        console.error("post insert failed", postError);
        await supabase
          .from("feed_content_queue")
          .update({ status: "failed" })
          .eq("id", item.id);
        continue;
      }

      // Comments and occasional replies, timed after the post
      const interactions = Array.isArray(item.interactions) ? item.interactions : [];
      let commentCount = 0;
      const postTime = new Date(item.scheduled_at).getTime();

      for (const inter of interactions) {
        const commenter = findCompanion(inter.companion_name);
        if (!commenter || !inter.text) continue;
        const at = new Date(postTime + (inter.minutes_after ?? 20) * 60000);
        if (at.getTime() > Date.now()) continue; // stays for a later run of the thread

        const { data: comment } = await supabase
          .from("community_comments")
          .insert({
            post_id: post.id,
            content: `${commenter.emoji} ${inter.text}`,
            anonymous_name: commenter.name,
            created_at: at.toISOString(),
          })
          .select("id")
          .single();
        if (!comment) continue;
        commentCount++;

        if (inter.reply_text && inter.reply_companion) {
          const replier = findCompanion(inter.reply_companion);
          if (replier) {
            const replyAt = new Date(at.getTime() + (10 + Math.floor(Math.random() * 90)) * 60000);
            if (replyAt.getTime() <= Date.now()) {
              const { data: reply } = await supabase
                .from("community_comments")
                .insert({
                  post_id: post.id,
                  parent_comment_id: comment.id,
                  content: `${replier.emoji} ${inter.reply_text}`,
                  anonymous_name: replier.name,
                  created_at: replyAt.toISOString(),
                })
                .select("id")
                .single();
              if (reply) commentCount++;
            }
          }
        }
      }

      if (commentCount > 0) {
        await supabase
          .from("community_posts")
          .update({ comments_count: commentCount })
          .eq("id", post.id);
      }

      // A handful of emoji reactions so posts don't all look identical
      const reactionCount = Math.max(0, Math.min(engagement.reactions ?? 0, 6));
      for (let r = 0; r < reactionCount; r++) {
        await supabase.from("community_reactions").insert({
          post_id: post.id,
          session_id: `companion-${companion.name.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
          emoji: REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)],
          created_at: new Date(postTime + 5 * 60000).toISOString(),
        });
      }

      await supabase
        .from("feed_content_queue")
        .update({
          status: "published",
          post_id: post.id,
          published_at: new Date().toISOString(),
          media_urls: mediaUrls,
        })
        .eq("id", item.id);

      published++;
    }

    await supabase.from("feed_job_state").upsert({ key: JOB_KEY, lease_until: null });

    console.log(`Published ${published} queued posts`);
    return new Response(JSON.stringify({ success: true, published, due: due?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-feed-queue error:", e);
    await supabase.from("feed_job_state").upsert({ key: JOB_KEY, lease_until: null });
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
