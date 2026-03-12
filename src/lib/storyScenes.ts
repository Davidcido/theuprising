/**
 * Story scene definitions: video backgrounds + matched ambient audio
 * Each scene pairs a looping video with a thematically matched audio track.
 *
 * Videos: mix of local files + free Pexels stock loops
 * Audio:  royalty-free ambient loops from Pixabay
 */

export type StoryScene = {
  id: string;
  label: string;
  video: string;
  audio: string;
  gradient: string; // fallback while video loads
};

// ── Ambient audio pool ────────────────────────────────────────────────
const AUDIO = {
  forest:     "https://cdn.pixabay.com/audio/2022/01/20/audio_ba6c0fee7f.mp3",
  ocean:      "https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3",
  meditation: "https://cdn.pixabay.com/audio/2022/05/16/audio_3b8e5c2eb1.mp3",
  piano:      "https://cdn.pixabay.com/audio/2022/02/22/audio_d1718ab41b.mp3",
  rain:       "https://cdn.pixabay.com/audio/2022/02/07/audio_8a7a8030a6.mp3",
  crickets:   "https://cdn.pixabay.com/audio/2022/09/01/audio_e0c9e7a28d.mp3",
  wind:       "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3",
  stream:     "https://cdn.pixabay.com/audio/2022/01/31/audio_46eb6a9029.mp3",
  campfire:   "https://cdn.pixabay.com/audio/2022/10/30/audio_452ade9a6c.mp3",
  chimes:     "https://cdn.pixabay.com/audio/2022/03/15/audio_942de19019.mp3",
  birds:      "https://cdn.pixabay.com/audio/2022/03/09/audio_c0c0d3ce46.mp3",
  thunder:    "https://cdn.pixabay.com/audio/2022/06/07/audio_4f43600e20.mp3",
} as const;

// ── Video backgrounds ─────────────────────────────────────────────────
// Local files in public/videos/stories/
const L = "/videos/stories";

// Free Pexels CDN loops (720p, short, loop-friendly nature clips)
const PEXELS = {
  waterfall:    "https://videos.pexels.com/video-files/1448735/1448735-hd_1920_1080_24fps.mp4",
  clouds:       "https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4",
  fog:          "https://videos.pexels.com/video-files/3571264/3571264-uhd_1440_2560_30fps.mp4",
  river:        "https://videos.pexels.com/video-files/2491284/2491284-hd_1920_1080_24fps.mp4",
  aurora:       "https://videos.pexels.com/video-files/3194277/3194277-hd_1920_1080_30fps.mp4",
  nebula:       "https://videos.pexels.com/video-files/1851190/1851190-hd_1920_1080_25fps.mp4",
  bamboo:       "https://videos.pexels.com/video-files/3571264/3571264-uhd_1440_2560_30fps.mp4",
  particles:    "https://videos.pexels.com/video-files/3141207/3141207-uhd_1440_2560_25fps.mp4",
  candles:      "https://videos.pexels.com/video-files/1494296/1494296-hd_1920_1080_24fps.mp4",
} as const;

/**
 * All available scenes – unique video + audio pairings.
 * Organized by category for variety.
 */
export const ALL_SCENES: StoryScene[] = [
  // ── Nature ────────────────────────────────────
  {
    id: "forest",
    label: "Misty Forest",
    video: `${L}/forest.mp4`,
    audio: AUDIO.forest,
    gradient: "from-emerald-900/90 via-emerald-800/80 to-teal-900/90",
  },
  {
    id: "ocean",
    label: "Ocean Waves",
    video: `${L}/ocean.mp4`,
    audio: AUDIO.ocean,
    gradient: "from-cyan-900/90 via-blue-900/80 to-teal-900/90",
  },
  {
    id: "sunrise",
    label: "Mountain Sunrise",
    video: `${L}/sunrise.mp4`,
    audio: AUDIO.birds,
    gradient: "from-orange-900/90 via-amber-900/80 to-rose-900/90",
  },
  {
    id: "waterfall",
    label: "Waterfall Stream",
    video: PEXELS.waterfall,
    audio: AUDIO.stream,
    gradient: "from-teal-900/90 via-cyan-900/80 to-emerald-900/90",
  },
  {
    id: "clouds",
    label: "Mountain Clouds",
    video: PEXELS.clouds,
    audio: AUDIO.wind,
    gradient: "from-slate-800/90 via-gray-800/80 to-blue-900/90",
  },
  {
    id: "bamboo",
    label: "Bamboo Forest Wind",
    video: PEXELS.bamboo,
    audio: AUDIO.chimes,
    gradient: "from-green-900/90 via-emerald-900/80 to-lime-900/90",
  },
  {
    id: "river",
    label: "Flowing River",
    video: PEXELS.river,
    audio: AUDIO.stream,
    gradient: "from-sky-900/90 via-blue-900/80 to-cyan-900/90",
  },

  // ── Calm environments ─────────────────────────
  {
    id: "rain",
    label: "Rain on Window",
    video: `${L}/rain.mp4`,
    audio: AUDIO.rain,
    gradient: "from-slate-900/90 via-gray-900/80 to-zinc-900/90",
  },
  {
    id: "campfire",
    label: "Campfire Glow",
    video: PEXELS.candles,
    audio: AUDIO.campfire,
    gradient: "from-orange-950/90 via-amber-950/80 to-red-950/90",
  },
  {
    id: "fog",
    label: "Slow Drifting Fog",
    video: PEXELS.fog,
    audio: AUDIO.meditation,
    gradient: "from-gray-900/90 via-slate-900/80 to-zinc-900/90",
  },
  {
    id: "thunder",
    label: "Distant Thunder",
    video: `${L}/rain.mp4`,
    audio: AUDIO.thunder,
    gradient: "from-gray-950/90 via-slate-950/80 to-zinc-950/90",
  },

  // ── Cosmic ────────────────────────────────────
  {
    id: "nightsky",
    label: "Night Sky Stars",
    video: `${L}/nightsky.mp4`,
    audio: AUDIO.crickets,
    gradient: "from-indigo-950/90 via-purple-950/80 to-blue-950/90",
  },
  {
    id: "nebula",
    label: "Nebula Clouds",
    video: PEXELS.nebula,
    audio: AUDIO.meditation,
    gradient: "from-violet-950/90 via-purple-950/80 to-indigo-950/90",
  },
  {
    id: "aurora",
    label: "Aurora Lights",
    video: PEXELS.aurora,
    audio: AUDIO.piano,
    gradient: "from-emerald-950/90 via-teal-950/80 to-cyan-950/90",
  },
  {
    id: "deepspace",
    label: "Deep Space Glow",
    video: `${L}/nightsky.mp4`,
    audio: AUDIO.chimes,
    gradient: "from-fuchsia-950/90 via-pink-950/80 to-purple-950/90",
  },

  // ── Abstract calm ─────────────────────────────
  {
    id: "particles",
    label: "Light Particles",
    video: PEXELS.particles,
    audio: AUDIO.piano,
    gradient: "from-indigo-900/90 via-blue-900/80 to-violet-900/90",
  },
  {
    id: "gentlewind",
    label: "Gentle Wind",
    video: `${L}/forest.mp4`,
    audio: AUDIO.wind,
    gradient: "from-emerald-900/90 via-teal-900/80 to-green-900/90",
  },
  {
    id: "morningbirds",
    label: "Morning Birds",
    video: `${L}/sunrise.mp4`,
    audio: AUDIO.birds,
    gradient: "from-sky-900/90 via-blue-900/80 to-cyan-900/90",
  },
  {
    id: "singingbowls",
    label: "Singing Bowls",
    video: PEXELS.nebula,
    audio: AUDIO.chimes,
    gradient: "from-purple-950/90 via-violet-950/80 to-indigo-950/90",
  },
];

/**
 * Pick N unique scenes for a companion, ensuring no two frames share
 * the same video OR audio track. Uses a seeded shuffle based on
 * companion id + date for daily rotation.
 */
export function pickScenesForCompanion(companionId: string, count: number): StoryScene[] {
  const today = new Date().toDateString();
  const seed = hashString(`${companionId}-${today}`);
  const shuffled = [...ALL_SCENES].sort((a, b) => {
    const ha = hashString(`${seed}-${a.id}`) % 10000;
    const hb = hashString(`${seed}-${b.id}`) % 10000;
    return ha - hb;
  });

  // Greedily pick scenes with no duplicate video or audio
  const picked: StoryScene[] = [];
  const usedVideos = new Set<string>();
  const usedAudio = new Set<string>();

  for (const scene of shuffled) {
    if (picked.length >= count) break;
    if (usedVideos.has(scene.video) || usedAudio.has(scene.audio)) continue;
    picked.push(scene);
    usedVideos.add(scene.video);
    usedAudio.add(scene.audio);
  }

  // Fallback if not enough unique combos
  if (picked.length < count) {
    for (const scene of shuffled) {
      if (picked.length >= count) break;
      if (!picked.includes(scene)) picked.push(scene);
    }
  }

  return picked;
}

/**
 * Get a random fallback scene that differs from the failed one.
 * Used when a video fails to load.
 */
export function getFallbackScene(failedSceneId: string): StoryScene {
  const candidates = ALL_SCENES.filter(s => s.id !== failedSceneId);
  return candidates[Math.floor(Math.random() * candidates.length)] || ALL_SCENES[0];
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
