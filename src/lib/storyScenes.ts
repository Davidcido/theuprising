/**
 * Story scene definitions: video backgrounds + matched ambient audio
 * Each scene pairs a looping video with a thematically matched audio track.
 */

export type StoryScene = {
  id: string;
  label: string;
  video: string;
  audio: string;
  gradient: string; // fallback while video loads
};

// Ambient audio pool – royalty-free loops from Pixabay
const AUDIO_POOL = {
  forest: "https://cdn.pixabay.com/audio/2022/01/20/audio_ba6c0fee7f.mp3",
  ocean: "https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3",
  meditation: "https://cdn.pixabay.com/audio/2022/05/16/audio_3b8e5c2eb1.mp3",
  piano: "https://cdn.pixabay.com/audio/2022/02/22/audio_d1718ab41b.mp3",
  rain: "https://cdn.pixabay.com/audio/2022/02/07/audio_8a7a8030a6.mp3",
  crickets: "https://cdn.pixabay.com/audio/2022/09/01/audio_e0c9e7a28d.mp3",
  wind: "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3",
  stream: "https://cdn.pixabay.com/audio/2022/01/31/audio_46eb6a9029.mp3",
  campfire: "https://cdn.pixabay.com/audio/2022/10/30/audio_452ade9a6c.mp3",
  chimes: "https://cdn.pixabay.com/audio/2022/03/15/audio_942de19019.mp3",
  birds: "https://cdn.pixabay.com/audio/2022/03/09/audio_c0c0d3ce46.mp3",
  thunder: "https://cdn.pixabay.com/audio/2022/06/07/audio_4f43600e20.mp3",
  bamboo: "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3",
  synth: "https://cdn.pixabay.com/audio/2022/05/16/audio_3b8e5c2eb1.mp3",
  bowls: "https://cdn.pixabay.com/audio/2022/03/15/audio_942de19019.mp3",
} as const;

// Video backgrounds stored in public/videos/stories/
const VIDEO_BASE = "/videos/stories";

/**
 * All available scenes – video + matched audio.
 * Each scene guarantees a unique video+audio pairing.
 */
export const ALL_SCENES: StoryScene[] = [
  {
    id: "forest",
    label: "Misty Forest",
    video: `${VIDEO_BASE}/forest.mp4`,
    audio: AUDIO_POOL.forest,
    gradient: "from-emerald-900/90 via-emerald-800/80 to-teal-900/90",
  },
  {
    id: "ocean",
    label: "Ocean Waves",
    video: `${VIDEO_BASE}/ocean.mp4`,
    audio: AUDIO_POOL.ocean,
    gradient: "from-cyan-900/90 via-blue-900/80 to-teal-900/90",
  },
  {
    id: "nightsky",
    label: "Night Sky",
    video: `${VIDEO_BASE}/nightsky.mp4`,
    audio: AUDIO_POOL.crickets,
    gradient: "from-indigo-950/90 via-purple-950/80 to-blue-950/90",
  },
  {
    id: "rain",
    label: "Rain on Window",
    video: `${VIDEO_BASE}/rain.mp4`,
    audio: AUDIO_POOL.rain,
    gradient: "from-slate-900/90 via-gray-900/80 to-zinc-900/90",
  },
  {
    id: "sunrise",
    label: "Mountain Sunrise",
    video: `${VIDEO_BASE}/sunrise.mp4`,
    audio: AUDIO_POOL.piano,
    gradient: "from-orange-900/90 via-amber-900/80 to-rose-900/90",
  },
  // Extra scenes with reused videos but different audio pairings
  {
    id: "stream",
    label: "Gentle Stream",
    video: `${VIDEO_BASE}/forest.mp4`,
    audio: AUDIO_POOL.stream,
    gradient: "from-emerald-900/90 via-teal-900/80 to-green-900/90",
  },
  {
    id: "campfire",
    label: "Campfire Glow",
    video: `${VIDEO_BASE}/nightsky.mp4`,
    audio: AUDIO_POOL.campfire,
    gradient: "from-orange-950/90 via-amber-950/80 to-red-950/90",
  },
  {
    id: "wind",
    label: "Wind Through Trees",
    video: `${VIDEO_BASE}/forest.mp4`,
    audio: AUDIO_POOL.wind,
    gradient: "from-green-900/90 via-emerald-900/80 to-teal-900/90",
  },
  {
    id: "chimes",
    label: "Meditation Chimes",
    video: `${VIDEO_BASE}/sunrise.mp4`,
    audio: AUDIO_POOL.chimes,
    gradient: "from-amber-900/90 via-yellow-900/80 to-orange-900/90",
  },
  {
    id: "birds",
    label: "Morning Birds",
    video: `${VIDEO_BASE}/sunrise.mp4`,
    audio: AUDIO_POOL.birds,
    gradient: "from-sky-900/90 via-blue-900/80 to-cyan-900/90",
  },
  {
    id: "thunder",
    label: "Distant Thunder",
    video: `${VIDEO_BASE}/rain.mp4`,
    audio: AUDIO_POOL.thunder,
    gradient: "from-gray-950/90 via-slate-950/80 to-zinc-950/90",
  },
  {
    id: "bowls",
    label: "Singing Bowls",
    video: `${VIDEO_BASE}/nightsky.mp4`,
    audio: AUDIO_POOL.bowls,
    gradient: "from-violet-950/90 via-purple-950/80 to-indigo-950/90",
  },
  {
    id: "synth",
    label: "Soft Synth Pads",
    video: `${VIDEO_BASE}/nightsky.mp4`,
    audio: AUDIO_POOL.synth,
    gradient: "from-fuchsia-950/90 via-pink-950/80 to-purple-950/90",
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

  // Fallback if not enough unique combos (shouldn't happen with 5 videos × 15 audio)
  if (picked.length < count) {
    for (const scene of shuffled) {
      if (picked.length >= count) break;
      if (!picked.includes(scene)) picked.push(scene);
    }
  }

  return picked;
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
