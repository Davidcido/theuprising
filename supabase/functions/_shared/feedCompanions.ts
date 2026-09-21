// Shared companion identity + media pools for the rolling community feed engine.
// Personalities mirror the established Uprising companions used elsewhere in the app.

export type Companion = {
  name: string;
  emoji: string;
  style: string;
  voice: string;
  themes: string[];
  /** Relative posting frequency — some companions are simply more active than others. */
  activity: number;
};

export const COMPANIONS: Companion[] = [
  {
    name: "Seren",
    emoji: "💚",
    style: "calm and compassionate",
    voice: "soft, steady, emotionally safe; speaks like someone sitting beside you",
    themes: ["ocean", "calm_water", "rain", "mist"],
    activity: 1.0,
  },
  {
    name: "Atlas",
    emoji: "🧠",
    style: "philosophical and thoughtful",
    voice: "asks big quiet questions, reframes pain as perspective, never preachy",
    themes: ["mountains", "clouds", "sky", "cosmic", "canyon"],
    activity: 0.8,
  },
  {
    name: "Nova",
    emoji: "✨",
    style: "curious and imaginative",
    voice: "playful wonder, 'what if', sees possibility in ordinary things",
    themes: ["night_sky", "stars", "aurora", "underwater"],
    activity: 0.9,
  },
  {
    name: "Orion",
    emoji: "🔥",
    style: "bold and motivating",
    voice: "direct, energising, challenges gently, hates self-pity but never shames",
    themes: ["sunrise", "sunset", "campfire", "volcano", "lightning"],
    activity: 0.7,
  },
  {
    name: "Kai",
    emoji: "🌿",
    style: "grounded and nature-focused",
    voice: "slow, practical, body-and-breath focused, uses nature imagery",
    themes: ["forest", "meadow", "fog", "jungle", "moss"],
    activity: 0.6,
  },
  {
    name: "Sol",
    emoji: "🌅",
    style: "optimistic and warm",
    voice: "bright, affectionate, celebrates small wins loudly",
    themes: ["sunrise", "golden_hour", "beach", "meadow"],
    activity: 0.85,
  },
  {
    name: "Elias",
    emoji: "📚",
    style: "reflective storyteller",
    voice: "tells short stories and parables, lets the lesson land on its own",
    themes: ["rain", "fog", "rivers", "library", "snow"],
    activity: 0.5,
  },
  {
    name: "Leo",
    emoji: "🛠",
    style: "practical encourager",
    voice: "gives one concrete doable step, plain language, no fluff",
    themes: ["waterfalls", "rivers", "desert", "savanna", "forest"],
    activity: 0.55,
  },
];

export const COMPANION_NAMES = COMPANIONS.map((c) => c.name);

export function findCompanion(name?: string): Companion | null {
  if (!name) return null;
  return COMPANIONS.find((c) => c.name.toLowerCase() === name.toLowerCase()) || null;
}

export const THEMED_VIDEOS: Record<string, string[]> = {
  ocean: [
    "https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/2499611/2499611-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/1739010/1739010-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/1918465/1918465-hd_1920_1080_30fps.mp4",
  ],
  calm_water: [
    "https://videos.pexels.com/video-files/2491284/2491284-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/2421545/2421545-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/3015510/3015510-hd_1920_1080_24fps.mp4",
  ],
  mist: [
    "https://videos.pexels.com/video-files/4763824/4763824-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/6394054/6394054-hd_1920_1080_25fps.mp4",
  ],
  fog: [
    "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/4763824/4763824-hd_1920_1080_24fps.mp4",
  ],
  waterfalls: [
    "https://videos.pexels.com/video-files/2611510/2611510-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/3629519/3629519-hd_1920_1080_24fps.mp4",
  ],
  forest: [
    "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/4625518/4625518-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/2611510/2611510-hd_1920_1080_24fps.mp4",
  ],
  jungle: ["https://videos.pexels.com/video-files/4625518/4625518-hd_1920_1080_24fps.mp4"],
  moss: ["https://videos.pexels.com/video-files/3629519/3629519-hd_1920_1080_24fps.mp4"],
  rain: [
    "https://videos.pexels.com/video-files/4255925/4255925-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/3402795/3402795-hd_1920_1080_24fps.mp4",
  ],
  snow: [
    "https://videos.pexels.com/video-files/856237/856237-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/855564/855564-hd_1920_1080_30fps.mp4",
  ],
  sunrise: [
    "https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4",
    "https://videos.pexels.com/video-files/1585619/1585619-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/2886380/2886380-hd_1920_1080_24fps.mp4",
  ],
  sunset: [
    "https://videos.pexels.com/video-files/1721294/1721294-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4",
  ],
  golden_hour: [
    "https://videos.pexels.com/video-files/1585619/1585619-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/2886380/2886380-hd_1920_1080_24fps.mp4",
  ],
  beach: [
    "https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/4925382/4925382-hd_1920_1080_24fps.mp4",
  ],
  clouds: [
    "https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4",
    "https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_24fps.mp4",
  ],
  mountains: [
    "https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4",
  ],
  canyon: ["https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_24fps.mp4"],
  sky: ["https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4"],
  cosmic: [
    "https://videos.pexels.com/video-files/1826896/1826896-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/4065924/4065924-hd_1920_1080_24fps.mp4",
  ],
  rivers: [
    "https://videos.pexels.com/video-files/2491284/2491284-hd_1920_1080_24fps.mp4",
    "https://videos.pexels.com/video-files/1448735/1448735-hd_1920_1080_24fps.mp4",
  ],
  night_sky: [
    "https://videos.pexels.com/video-files/1826896/1826896-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/4065919/4065919-hd_1920_1080_24fps.mp4",
  ],
  stars: ["https://videos.pexels.com/video-files/4065924/4065924-hd_1920_1080_24fps.mp4"],
  aurora: ["https://videos.pexels.com/video-files/4065919/4065919-hd_1920_1080_24fps.mp4"],
  underwater: ["https://videos.pexels.com/video-files/2499611/2499611-hd_1920_1080_24fps.mp4"],
  meadow: [
    "https://videos.pexels.com/video-files/1580455/1580455-hd_1920_1080_30fps.mp4",
    "https://videos.pexels.com/video-files/2886380/2886380-hd_1920_1080_24fps.mp4",
  ],
  campfire: ["https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4"],
  volcano: ["https://videos.pexels.com/video-files/1585619/1585619-hd_1920_1080_30fps.mp4"],
  lightning: ["https://videos.pexels.com/video-files/3402795/3402795-hd_1920_1080_24fps.mp4"],
  desert: ["https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_24fps.mp4"],
  savanna: ["https://videos.pexels.com/video-files/1580455/1580455-hd_1920_1080_30fps.mp4"],
  library: ["https://videos.pexels.com/video-files/4255925/4255925-hd_1920_1080_24fps.mp4"],
};

export function pickCompanionVideo(
  companion: Companion,
  seed: number,
): { url: string; theme: string } {
  const themes = companion.themes.filter((t) => THEMED_VIDEOS[t]?.length);
  const theme = themes.length ? themes[seed % themes.length] : "forest";
  const pool = THEMED_VIDEOS[theme] || THEMED_VIDEOS.forest;
  return { url: pool[seed % pool.length], theme };
}

/** Rotating content formats so the feed never feels like one repeated template. */
export const CONTENT_TYPES = [
  "short motivational thought",
  "emotional support post",
  "mental health / wellbeing reflection",
  "personal growth discussion",
  "open question to the community",
  "very short story (3-5 sentences)",
  "life lesson",
  "positive challenge for the day",
  "daily encouragement",
  "friendship or relationships reflection",
  "confidence and self-worth topic",
  "failure and resilience reflection",
  "career or life-direction reflection",
  "gratitude prompt",
  "gentle check-in with the community",
];

// ---------------------------------------------------------------------------
// Interaction profiles — each companion is a distinct social personality.
// Used to decide, per post, who would realistically care enough to comment.
// ---------------------------------------------------------------------------

export type InteractionProfile = {
  /** 0-1 — how often this companion comments at all. */
  commentRate: number;
  /** Topics that pull them into a conversation. */
  topics: string[];
  /** Topics they rarely engage with. */
  avoids: string[];
  tone: string;
  /** Companions they naturally bounce off (soft preference, never a fixed pair). */
  affinities: string[];
  /** Post formats they gravitate to. */
  prefers: string[];
};

export const INTERACTION_PROFILES: Record<string, InteractionProfile> = {
  Seren: {
    commentRate: 0.26,
    topics: ["grief", "anxiety", "loneliness", "healing", "rest", "heartbreak", "fear", "burnout"],
    avoids: ["career", "hustle", "productivity", "challenge", "money", "competition"],
    tone: "soft, steady, emotionally safe",
    affinities: ["Kai", "Elias"],
    prefers: ["emotional support post", "gentle check-in", "mental health"],
  },
  Atlas: {
    commentRate: 0.3,
    topics: ["meaning", "purpose", "identity", "doubt", "philosophy", "change", "time", "failure"],
    avoids: ["small talk", "gratitude prompt", "daily encouragement"],
    tone: "thoughtful, asks the bigger question",
    affinities: ["Nova", "Elias"],
    prefers: ["personal growth discussion", "life lesson", "open question"],
  },
  Nova: {
    commentRate: 0.34,
    topics: ["creativity", "curiosity", "dreams", "imagination", "wonder", "friendship", "self-worth", "new starts"],
    avoids: ["grief", "career", "discipline"],
    tone: "playful, imaginative, asks 'what if'",
    affinities: ["Sol", "Atlas"],
    prefers: ["open question to the community", "short story", "positive challenge"],
  },
  Orion: {
    commentRate: 0.24,
    topics: ["fear", "discipline", "courage", "failure", "resilience", "goals", "procrastination", "confidence"],
    avoids: ["rest", "grief", "gratitude prompt"],
    tone: "direct, energising, never shaming",
    affinities: ["Leo", "Sol"],
    prefers: ["positive challenge", "failure and resilience", "career reflection"],
  },
  Kai: {
    commentRate: 0.18,
    topics: ["body", "breath", "rest", "overwhelm", "nature", "sleep", "slowing down", "burnout"],
    avoids: ["career", "competition", "money", "goals"],
    tone: "slow, grounded, practical about the body",
    affinities: ["Seren", "Elias"],
    prefers: ["wellbeing reflection", "gentle check-in"],
  },
  Sol: {
    commentRate: 0.32,
    topics: ["small wins", "friendship", "joy", "gratitude", "self-worth", "encouragement", "community", "beginnings"],
    avoids: ["philosophy", "failure", "grief"],
    tone: "bright, affectionate, celebrates loudly",
    affinities: ["Nova", "Leo"],
    prefers: ["daily encouragement", "gratitude prompt", "open question"],
  },
  Elias: {
    commentRate: 0.15,
    topics: ["memory", "family", "patience", "lessons", "time", "regret", "forgiveness", "stories"],
    avoids: ["challenge", "productivity", "hype"],
    tone: "reflective storyteller, lets the lesson land",
    affinities: ["Atlas", "Kai"],
    prefers: ["very short story", "life lesson"],
  },
  Leo: {
    commentRate: 0.21,
    topics: ["practical steps", "money", "school", "career", "habits", "planning", "stuck", "decisions"],
    avoids: ["grief", "philosophy", "dreams"],
    tone: "plain language, one doable step",
    affinities: ["Orion", "Sol"],
    prefers: ["career or life-direction reflection", "positive challenge"],
  },
};

const NAME_LOOKUP = new Map(COMPANIONS.map((c) => [c.name.toLowerCase(), c]));

/**
 * Forgiving companion lookup. Model output often carries an emoji, punctuation
 * or a wrapper ("Nova ✨", "@Kai:"), which an exact match silently dropped —
 * that is what made every comment collapse onto a single fallback companion.
 */
export function resolveCompanion(raw?: string | null): Companion | null {
  if (!raw) return null;
  const cleaned = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return null;
  const exact = NAME_LOOKUP.get(cleaned);
  if (exact) return exact;
  return COMPANIONS.find((c) => cleaned.includes(c.name.toLowerCase())) || null;
}

/** Deterministic 32-bit hash — keeps behaviour reproducible per post. */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Small deterministic PRNG so a given post always yields the same cast. */
export function makeRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function topicScore(profile: InteractionProfile, text: string) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const t of profile.topics) if (lower.includes(t.split(" ")[0])) score += 1;
  for (const a of profile.avoids) if (lower.includes(a.split(" ")[0])) score -= 0.8;
  return score;
}

/**
 * Decides which companions would realistically engage with a given post.
 * Returns 0-4 names. Plenty of posts legitimately get nobody.
 */
export function selectCommenters(
  postText: string,
  authorName: string,
  contentType: string,
  maxWanted: number,
  extraSeed = 0,
): string[] {
  const rand = makeRandom(seedFrom(`${authorName}|${postText}`) + extraSeed);
  const ctx = `${postText} ${contentType}`;

  // Overall conversation size — many posts stay quiet.
  const roll = rand();
  let capacity: number;
  if (roll < 0.28) capacity = 0;
  else if (roll < 0.62) capacity = 1;
  else if (roll < 0.9) capacity = 2;
  else if (roll < 0.98) capacity = 3;
  else capacity = 4;
  capacity = Math.min(capacity, maxWanted);
  if (capacity === 0) return [];

  const candidates = COMPANIONS.filter((c) => c.name !== authorName).map((c) => {
    const p = INTERACTION_PROFILES[c.name];
    const relevance = topicScore(p, ctx);
    const fit = p.prefers.some((f) => ctx.toLowerCase().includes(f.split(" ")[0])) ? 0.6 : 0;
    // Probability of showing up at all, tilted by how much the post is "theirs".
    const weight = p.commentRate * (1 + relevance * 0.7 + fit) * (0.55 + rand() * 0.9);
    return { name: c.name, weight };
  });

  const chosen: string[] = [];
  const pool = [...candidates];
  while (chosen.length < capacity && pool.length) {
    const total = pool.reduce((s, c) => s + Math.max(c.weight, 0.001), 0);
    let target = rand() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      target -= Math.max(pool[i].weight, 0.001);
      if (target <= 0) {
        idx = i;
        break;
      }
    }
    const [picked] = pool.splice(idx, 1);
    chosen.push(picked.name);

    // A friend sometimes joins the thread — but only sometimes, and never as a fixed duo.
    const affinity = INTERACTION_PROFILES[picked.name].affinities;
    for (const other of pool) {
      if (affinity.includes(other.name)) other.weight *= rand() < 0.5 ? 1.35 : 0.7;
    }
  }

  return chosen;
}

/** Rotating visual direction so generated imagery never repeats a look. */
export const VISUAL_VARIATIONS = {
  lighting: [
    "golden hour backlight",
    "soft overcast diffusion",
    "blue hour dusk",
    "harsh midday sun with deep shadows",
    "warm lamplight at night",
    "dappled light through leaves",
    "misty dawn haze",
    "neon-tinged evening glow",
  ],
  angle: [
    "low angle looking up",
    "high overhead view",
    "eye-level intimate framing",
    "wide establishing shot",
    "tight macro detail",
    "over-the-shoulder perspective",
    "dutch tilt",
    "reflection in water or glass",
  ],
  setting: [
    "rooftop above a busy city",
    "quiet village road",
    "coastal cliff path",
    "market street at closing time",
    "a small room with an open window",
    "riverbank at the edge of town",
    "open savanna under wide sky",
    "rain-wet courtyard",
    "forest clearing",
    "train platform between journeys",
  ],
  style: [
    "documentary film still",
    "soft painterly realism",
    "high-contrast editorial photography",
    "dreamlike long-exposure",
    "warm analogue film grain",
    "clean minimal composition",
  ],
  timeOfDay: ["dawn", "mid-morning", "afternoon", "late afternoon", "sunset", "night"],
};

export function buildVisualDirection(seed: number) {
  const pick = <T,>(arr: T[], offset: number) => arr[(seed + offset) % arr.length];
  return [
    pick(VISUAL_VARIATIONS.setting, 0),
    pick(VISUAL_VARIATIONS.timeOfDay, 1),
    pick(VISUAL_VARIATIONS.lighting, 2),
    pick(VISUAL_VARIATIONS.angle, 3),
    pick(VISUAL_VARIATIONS.style, 4),
  ].join(", ");
}
