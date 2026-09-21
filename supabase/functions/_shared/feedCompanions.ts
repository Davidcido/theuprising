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
