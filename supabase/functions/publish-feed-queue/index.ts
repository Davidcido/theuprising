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

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Records an asset in the permanent media history. Returns false if already used. */
async function claimAsset(
  supabase: any,
  assetHash: string,
  url: string,
  kind: string,
  concept: string | null,
) {
  const { error } = await supabase
    .from("feed_media_assets")
    .insert({ asset_hash: assetHash, url, kind, visual_concept: concept });
  return !error;
}

/** Picks a themed clip that has never been used before, if one is left. */
async function pickUnusedVideo(supabase: any, companion: any, seed: number) {
  const themes = companion.themes.filter((t: string) => THEMED_VIDEOS[t]?.length);
  const candidates: { url: string; theme: string }[] = [];
  for (const theme of themes.length ? themes : ["forest"]) {
    for (const url of THEMED_VIDEOS[theme] || []) candidates.push({ url, theme });
  }
  if (candidates.length === 0) return pickCompanionVideo(companion, seed);

  const { data: used } = await supabase
    .from("feed_media_assets")
    .select("url")
    .in("url", candidates.map((c) => c.url));
  const usedSet = new Set((used || []).map((u: any) => u.url));
  const fresh = candidates.filter((c) => !usedSet.has(c.url));
  if (fresh.length === 0) return null;
  return fresh[seed % fresh.length];
}

async function generateImage(
  apiKey: string,
  supabase: any,
  concept: string,
  fileName: string,
  seed: number,
): Promise<string | null> {
  const direction = buildVisualDirection(seed);
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      messages: [
        {
          role: "user",
          content: `Create an original cinematic image, unlike any stock photo: ${concept}. Visual direction: ${direction}. Include human life or lived-in detail where it fits. No text in image. Vertical 9:16 aspect ratio.`,
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

  // Reject an image that is byte-identical to one already published.
  const assetHash = await sha256Hex(bytes);
  const { data: seen } = await supabase
    .from("feed_media_assets")
    .select("id")
    .eq("asset_hash", assetHash)
    .maybeSingle();
  if (seen) {
    console.log("skipping duplicate generated image");
    return null;
  }

  const path = `${fileName}.${match[1]}`;
  const { error } = await supabase.storage
    .from("community-media")
    .upload(path, bytes, { contentType: `image/${match[1]}`, upsert: true });
  if (error) return null;

  const url =
    supabase.storage.from("community-media").getPublicUrl(path).data?.publicUrl || null;
  if (!url) return null;
  await claimAsset(supabase, assetHash, url, "image", concept);
  return url;
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

      const companion = resolveCompanion(item.companion_name) || COMPANIONS[0];
      const mediaSeed = seedFrom(item.id + item.content.slice(0, 40));
      let mediaUrls: string[] = [];

      // Never reuse media: anything already in the history is rejected.
      for (const url of (item.media_urls as string[]) || []) {
        const { data: seen } = await supabase
          .from("feed_media_assets")
          .select("id")
          .eq("url", url)
          .maybeSingle();
        if (!seen && (await claimAsset(supabase, `url:${url}`, url, item.media_type, null))) {
          mediaUrls.push(url);
        }
      }

      if (item.media_type !== "text" && mediaUrls.length === 0) {
        if (apiKey && imagesMade < MAX_IMAGES_PER_RUN) {
          const url = await generateImage(
            apiKey,
            supabase,
            item.visual_concept || item.content.slice(0, 120),
            `feed-${item.id}`,
            mediaSeed,
          );
          if (url) {
            mediaUrls = [url];
            imagesMade++;
          }
        }
        if (mediaUrls.length === 0) {
          // Fall back to a themed clip, but only one that has never been used.
          const pick = await pickUnusedVideo(supabase, companion, mediaSeed % 97);
          if (pick && (await claimAsset(supabase, `url:${pick.url}`, pick.url, "video", pick.theme))) {
            mediaUrls = [pick.url];
          }
          // Otherwise the post simply publishes as text — better than recycled media.
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

      // Comments and occasional replies, timed after the post.
      // The cast is re-decided here from each companion's interest profile, so
      // queued rows planned before the profiles existed are rebalanced too.
      const rawInteractions = (Array.isArray(item.interactions) ? item.interactions : []).filter(
        (i: any) => i && i.text,
      );
      const cast = selectCommenters(
        item.content || "",
        companion.name,
        item.content_type || "",
        Math.min(rawInteractions.length, 4),
        mediaSeed,
      );
      const interactions = cast.map((name, idx) => ({
        ...rawInteractions[idx],
        companion_name: name,
      }));
      let commentCount = 0;
      const postTime = new Date(item.scheduled_at).getTime();

      for (const inter of interactions) {
        const commenter = resolveCompanion(inter.companion_name);
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
          const replier = resolveCompanion(inter.reply_companion);
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
