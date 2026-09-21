// Rolling community-feed planner.
// Plans a natural day of companion activity into feed_content_queue, ahead of time.
// Bounded per run, single-flight locked, and circuit-broken on AI credit/rate errors.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  COMPANIONS,
  CONTENT_TYPES,
  INTERACTION_PROFILES,
  resolveCompanion,
  selectCommenters,
} from "../_shared/feedCompanions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JOB_KEY = "feed_planner";
const BUFFER_DAYS = 95; // keep at least ~90 days of future content planned
const MAX_DAYS_PER_RUN = 3;

type PlannedPost = {
  companion_name: string;
  content_type: string;
  text: string;
  visual_concept: string;
  media_type: string;
  hour: number;
  minute: number;
  interactions: {
    companion_name: string;
    text: string;
    minutes_after: number;
    reply_companion: string | null;
    reply_text: string | null;
  }[];
};

function dateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function seasonFor(d: Date) {
  const m = d.getUTCMonth();
  if (m === 11 || m <= 1) return "harmattan / year-end season";
  if (m <= 4) return "hot dry season turning into early rains";
  if (m <= 8) return "rainy season";
  return "late rains easing into dry season";
}

async function hash(text: string) {
  const bytes = new TextEncoder().encode(text.toLowerCase().replace(/\s+/g, " ").trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}

/** Streams /v1/responses and returns the accumulated output text. */
async function callModel(apiKey: string, prompt: string, schema: unknown) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You plan the social feed of Uprising, a youth-focused African emotional-support community. The feed is populated by recurring AI companions who each keep a distinct personality. Output must be valid JSON matching the schema.",
            },
          ],
        },
        { role: "user", content: [{ type: "input_text", text: prompt }] },
      ],
      stream: true,
      reasoning: { effort: "low", summary: "auto" },
      text: { format: { type: "json_schema", name: "feed_plan", strict: true, schema } },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`AI gateway ${res.status}: ${body.slice(0, 300)}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          out += evt.delta;
        } else if (evt.type === "response.completed" && !out) {
          out = evt.response?.output_text ?? "";
        }
      } catch {
        // ignore keep-alive / partial frames
      }
    }
  }

  return out;
}

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["days"],
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["date", "posts"],
        properties: {
          date: { type: "string" },
          posts: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "companion_name",
                "content_type",
                "text",
                "visual_concept",
                "media_type",
                "hour",
                "minute",
                "interactions",
              ],
              properties: {
                companion_name: { type: "string" },
                content_type: { type: "string" },
                text: { type: "string" },
                visual_concept: { type: "string" },
                media_type: { type: "string", enum: ["text", "image", "video"] },
                hour: { type: "integer" },
                minute: { type: "integer" },
                interactions: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "companion_name",
                      "text",
                      "minutes_after",
                      "reply_companion",
                      "reply_text",
                    ],
                    properties: {
                      companion_name: { type: "string" },
                      text: { type: "string" },
                      minutes_after: { type: "integer" },
                      reply_companion: { type: ["string", "null"] },
                      reply_text: { type: ["string", "null"] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let body: { days?: number; from?: string; force?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // no body
    }

    // Circuit breaker
    const { data: state } = await supabase
      .from("feed_job_state")
      .select("paused_until, pause_reason")
      .eq("key", JOB_KEY)
      .maybeSingle();

    if (state?.paused_until && new Date(state.paused_until) > new Date() && !body.force) {
      return new Response(
        JSON.stringify({ paused: true, reason: state.pause_reason, until: state.paused_until }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Single-flight lease (5 minutes)
    const { data: gotLease } = await supabase.rpc("acquire_feed_job_lease", {
      _key: JOB_KEY,
      _seconds: 300,
    });
    if (!gotLease) {
      return new Response(JSON.stringify({ skipped: "another planning run is active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const requested = Math.min(Math.max(body.days ?? MAX_DAYS_PER_RUN, 1), MAX_DAYS_PER_RUN);

    // Where does the buffer currently end?
    const { data: lastRow } = await supabase
      .from("feed_content_queue")
      .select("scheduled_at")
      .order("scheduled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let start: Date;
    if (body.from) {
      start = new Date(`${body.from}T00:00:00Z`);
    } else {
      const last = lastRow?.scheduled_at ? new Date(lastRow.scheduled_at) : null;
      const base = last && last > now ? last : now;
      start = new Date(base);
      if (last && last > now) start.setUTCDate(start.getUTCDate() + 1);
      start.setUTCHours(0, 0, 0, 0);
    }

    const bufferEdge = new Date(now);
    bufferEdge.setUTCDate(bufferEdge.getUTCDate() + BUFFER_DAYS);
    if (!body.from && start > bufferEdge) {
      await supabase.from("feed_job_state").upsert({ key: JOB_KEY, lease_until: null });
      return new Response(
        JSON.stringify({ message: "Buffer already full", buffer_until: start.toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Days to plan this run
    const dates: string[] = [];
    for (let i = 0; i < requested; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      dates.push(dateStr(d));
    }

    // Skip dates already planned
    const { data: existing } = await supabase
      .from("feed_content_queue")
      .select("scheduled_at")
      .gte("scheduled_at", `${dates[0]}T00:00:00Z`)
      .lte("scheduled_at", `${dates[dates.length - 1]}T23:59:59Z`);
    const plannedDays = new Set((existing || []).map((r) => r.scheduled_at.slice(0, 10)));
    const todo = dates.filter((d) => !plannedDays.has(d));

    if (todo.length === 0) {
      await supabase.from("feed_job_state").upsert({ key: JOB_KEY, lease_until: null });
      return new Response(JSON.stringify({ message: "Nothing to plan", dates }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recent content to avoid repeating
    const { data: recent } = await supabase
      .from("feed_content_queue")
      .select("content")
      .order("scheduled_at", { ascending: false })
      .limit(120);
    const avoidList = (recent || [])
      .map((r) => r.content.replace(/\s+/g, " ").slice(0, 90))
      .join("\n- ");

    const roster = COMPANIONS.map((c) => {
      const p = INTERACTION_PROFILES[c.name];
      return `${c.name} ${c.emoji} — ${c.style}. Voice: ${c.voice}. Posting activity: ${
        c.activity >= 0.85 ? "high" : c.activity >= 0.65 ? "medium" : "low"
      }. Cares about: ${p.topics.join(", ")}. Rarely engages with: ${p.avoids.join(
        ", ",
      )}. Tone: ${p.tone}. Naturally bounces off: ${p.affinities.join(" and ")}.`;
    }).join("\n");

    const prompt = `Plan ${todo.length} day(s) of activity for the Uprising community feed.
Dates (UTC): ${todo.join(", ")}. Current real date: ${dateStr(now)}. Season context: ${seasonFor(
      new Date(`${todo[0]}T00:00:00Z`),
    )}.

COMPANIONS (keep each voice distinct — never make them sound interchangeable):
${roster}

For EACH day plan between 6 and 12 posts. Vary the number between days.
Rules:
- Spread posts from 05:00 to 23:00 with irregular minute values (not :00).
- Higher-activity companions post more often; low-activity ones may skip days. Never give every companion the same number of posts.
- Rotate content types across this list: ${CONTENT_TYPES.join("; ")}.
- media_type: roughly 45% "text", 35% "image", 20% "video". visual_concept must be a specific, never-before-seen scene — name the place, the time of day, the light, the activity and the framing. Never describe the same scene twice across the plan.
- "text" is the full post body (2-5 sentences, plus a short hashtag line when it fits). Write it in that companion's voice, warm, culturally at home for young Africans. No markdown headings.
- interactions: 0 to 4 entries. A post with ZERO comments is normal and good — roughly a third should have none. Only include a companion whose listed interests genuinely match this post; a companion who "rarely engages" with the topic must stay silent. Never let one companion appear on most posts, and never repeat the same pair of companions across nearby posts. minutes_after between 3 and 600. Commenters must never be the post author.
- ALWAYS write companion_name as the bare name only (Seren, Atlas, Nova, Orion, Kai, Sol, Elias, Leo) — no emoji, no punctuation.
- Comments are 1-3 sentences in the commenter's own distinct voice: sometimes a different perspective, a respectful disagreement, a question, a joke, or a callback to an earlier theme. Never generic praise.
- Use reply_companion/reply_text (or null) for an occasional reply to a comment, so threads feel real. Most posts should leave these null.
- Roughly one post per day should openly invite the community to respond with their own experience.

DO NOT reuse or lightly reword any of these existing posts:
- ${avoidList}`;

    let raw: string;
    try {
      raw = await callModel(LOVABLE_API_KEY, prompt, PLAN_SCHEMA);
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 402 || status === 403 || status === 429) {
        const pauseMinutes = status === 429 ? 60 : 24 * 60;
        const until = new Date(Date.now() + pauseMinutes * 60000).toISOString();
        await supabase.from("feed_job_state").upsert({
          key: JOB_KEY,
          paused_until: until,
          pause_reason:
            status === 429
              ? "AI rate limit reached — planning will retry later."
              : "AI credits or access unavailable — planning paused until resolved.",
          lease_until: null,
        });
        return new Response(
          JSON.stringify({ paused: true, status, reason: (e as Error).message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw e;
    }

    let parsed: { days: { date: string; posts: PlannedPost[] }[] };
    try {
      parsed = JSON.parse(raw.replace(/```json?/g, "").replace(/```/g, "").trim());
    } catch {
      throw new Error(`Could not parse plan: ${raw.slice(0, 200)}`);
    }

    let queued = 0;
    let seed = Math.floor(Math.random() * 1000);

    for (const day of parsed.days || []) {
      const date = todo.includes(day.date) ? day.date : todo[0];
      for (const post of day.posts || []) {
        const companion = resolveCompanion(post.companion_name) || COMPANIONS[seed % COMPANIONS.length];
        const hour = Math.min(Math.max(post.hour ?? 9, 5), 23);
        const minute = Math.min(Math.max(post.minute ?? seed % 60, 0), 59);
        const scheduledAt = `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(
          2,
          "0",
        )}:00+00:00`;

        const mediaType = ["text", "image", "video"].includes(post.media_type)
          ? post.media_type
          : "text";

        // Media is assigned at publish time so it can be checked against the
        // permanent media history and never repeat an already-used asset.
        const mediaUrls: string[] = [];
        const theme: string | null = null;

        // The model proposes a conversation; the interaction engine decides who
        // would realistically show up. Plenty of posts end up with nobody.
        const proposed = (post.interactions || []).filter(
          (i) => i && i.text && resolveCompanion(i.companion_name)?.name !== companion.name,
        );
        const cast = selectCommenters(
          post.text || "",
          companion.name,
          post.content_type || "",
          Math.min(proposed.length, 4),
          seed,
        );
        const interactions = cast.map((name, idx) => {
          const src = proposed[idx];
          return {
            companion_name: name,
            text: src.text,
            minutes_after: Math.min(Math.max(src.minutes_after ?? 20, 2), 900),
            reply_companion:
              src.reply_text && Math.random() < 0.35
                ? resolveCompanion(src.reply_companion || "")?.name ||
                  COMPANIONS.filter((c) => c.name !== name && c.name !== companion.name)[
                    seed % 6
                  ].name
                : null,
            reply_text: src.reply_text && Math.random() < 0.85 ? src.reply_text : null,
          };
        });

        const engagement = {
          likes: 3 + Math.floor(Math.random() * 60) + interactions.length * 4,
          views: 40 + Math.floor(Math.random() * 500),
          reactions: Math.floor(Math.random() * 6),
        };

        const contentHash = await hash(post.text);

        const { error } = await supabase.from("feed_content_queue").insert({
          scheduled_at: scheduledAt,
          companion_name: companion.name,
          content: post.text,
          content_type: post.content_type || "reflection",
          media_type: mediaType,
          media_urls: mediaUrls,
          visual_concept: post.visual_concept || null,
          theme,
          interactions,
          engagement,
          content_hash: contentHash,
        });

        if (!error) queued++;
        seed++;
      }
    }

    await supabase
      .from("feed_job_state")
      .upsert({ key: JOB_KEY, lease_until: null, paused_until: null, pause_reason: null });

    console.log(`Planned ${queued} posts for ${todo.join(", ")}`);

    return new Response(JSON.stringify({ success: true, dates: todo, queued }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("plan-feed-content error:", e);
    await supabase.from("feed_job_state").upsert({ key: JOB_KEY, lease_until: null });
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
