export type StoryVideoLibraryItem = {
  id: string;
  label: string;
  video: string;
  gradient: string;
};

export type StoryAudioLibraryItem = {
  id: string;
  label: string;
  audio: string;
};

const LOCAL_STORIES_PATH = "/videos/stories";

const pexelsDownload = (id: number) => `https://www.pexels.com/download/video/${id}/`;
const mixkitTrack = (id: number) => `https://assets.mixkit.co/music/${id}/${id}.mp3`;

export const STORY_VIDEO_LIBRARY: StoryVideoLibraryItem[] = [
  {
    id: "forest-sunrise",
    label: "Forest Mist Sunrise",
    video: `${LOCAL_STORIES_PATH}/sunrise.mp4`,
    gradient: "from-orange-900/90 via-amber-900/80 to-rose-900/90",
  },
  {
    id: "ocean-waves",
    label: "Ocean Waves",
    video: `${LOCAL_STORIES_PATH}/ocean.mp4`,
    gradient: "from-cyan-900/90 via-blue-900/80 to-teal-900/90",
  },
  {
    id: "night-sky-stars",
    label: "Night Sky Stars",
    video: `${LOCAL_STORIES_PATH}/nightsky.mp4`,
    gradient: "from-indigo-950/90 via-blue-950/80 to-slate-950/90",
  },
  {
    id: "rain-window",
    label: "Rain on Window",
    video: `${LOCAL_STORIES_PATH}/rain.mp4`,
    gradient: "from-slate-900/90 via-gray-900/80 to-zinc-900/90",
  },
  {
    id: "bamboo-forest-wind",
    label: "Bamboo Forest Wind",
    video: `${LOCAL_STORIES_PATH}/forest.mp4`,
    gradient: "from-green-900/90 via-emerald-900/80 to-lime-900/90",
  },
  {
    id: "waterfall-stream",
    label: "Waterfall Stream",
    video: pexelsDownload(2098989),
    gradient: "from-teal-900/90 via-cyan-900/80 to-emerald-900/90",
  },
  {
    id: "mountain-clouds",
    label: "Mountain Clouds",
    video: pexelsDownload(857251),
    gradient: "from-slate-800/90 via-gray-800/80 to-blue-900/90",
  },
  {
    id: "slow-drifting-fog",
    label: "Slow Drifting Fog",
    video: pexelsDownload(3571264),
    gradient: "from-gray-900/90 via-slate-900/80 to-zinc-900/90",
  },
  {
    id: "flowing-river",
    label: "Flowing River",
    video: pexelsDownload(2491284),
    gradient: "from-sky-900/90 via-blue-900/80 to-cyan-900/90",
  },
  {
    id: "aurora-lights",
    label: "Aurora Lights",
    video: pexelsDownload(3194277),
    gradient: "from-emerald-950/90 via-teal-950/80 to-cyan-950/90",
  },
  {
    id: "cosmic-nebula",
    label: "Cosmic Nebula Clouds",
    video: pexelsDownload(1851190),
    gradient: "from-violet-950/90 via-purple-950/80 to-indigo-950/90",
  },
  {
    id: "light-particles",
    label: "Light Particles",
    video: pexelsDownload(3141207),
    gradient: "from-indigo-900/90 via-blue-900/80 to-violet-900/90",
  },
  {
    id: "campfire-glow",
    label: "Campfire Glow",
    video: pexelsDownload(1494296),
    gradient: "from-orange-950/90 via-amber-950/80 to-red-950/90",
  },
  {
    id: "forest-waterfall",
    label: "Forest Waterfall",
    video: pexelsDownload(6394054),
    gradient: "from-emerald-900/90 via-teal-900/80 to-cyan-900/90",
  },
  {
    id: "misty-forest-road",
    label: "Misty Forest",
    video: pexelsDownload(19136000),
    gradient: "from-emerald-950/90 via-green-950/80 to-slate-950/90",
  },
  {
    id: "sunlight-through-trees",
    label: "Sunlight Through Trees",
    video: pexelsDownload(31807864),
    gradient: "from-amber-900/90 via-yellow-900/70 to-emerald-900/90",
  },
  {
    id: "autumn-forest-sunrise",
    label: "Autumn Forest Sunrise",
    video: pexelsDownload(31646575),
    gradient: "from-orange-950/90 via-amber-900/80 to-emerald-900/90",
  },
  {
    id: "aerial-misty-forest",
    label: "Aerial Mist Forest",
    video: pexelsDownload(29792653),
    gradient: "from-slate-900/90 via-emerald-900/70 to-cyan-900/90",
  },
  {
    id: "beach-horizon-calm",
    label: "Calm Beach Horizon",
    video: pexelsDownload(32029197),
    gradient: "from-sky-900/90 via-blue-900/80 to-teal-900/90",
  },
  {
    id: "starry-night-cosmos",
    label: "Starry Night Cosmos",
    video: pexelsDownload(9341381),
    gradient: "from-indigo-950/90 via-slate-950/80 to-black/90",
  },
  {
    id: "slow-cloud-timelapse",
    label: "Slow Cloud Timelapse",
    video: pexelsDownload(12512826),
    gradient: "from-sky-900/90 via-cyan-900/70 to-blue-900/90",
  },
  {
    id: "desert-sunset-sky",
    label: "Desert Sunset Sky",
    video: pexelsDownload(35284291),
    gradient: "from-orange-950/90 via-red-900/80 to-indigo-900/90",
  },
];

export const STORY_AUDIO_LIBRARY: StoryAudioLibraryItem[] = [
  {
    id: "soft-piano-ambience",
    label: "Soft Piano Ambience",
    audio: mixkitTrack(748),
  },
  {
    id: "deep-ambient-pads",
    label: "Deep Ambient Pads",
    audio: mixkitTrack(749),
  },
  {
    id: "rain-with-piano",
    label: "Rain with Piano",
    audio: mixkitTrack(750),
  },
  {
    id: "slow-cinematic-strings",
    label: "Slow Cinematic Strings",
    audio: mixkitTrack(751),
  },
  {
    id: "aurora-ambient-pads",
    label: "Aurora Ambient Pads",
    audio: mixkitTrack(752),
  },
  {
    id: "space-ambient-hum",
    label: "Space Ambient Hum",
    audio: mixkitTrack(753),
  },
  {
    id: "singing-bowl-meditation",
    label: "Singing Bowl Meditation",
    audio: mixkitTrack(754),
  },
  {
    id: "soft-meditation-drones",
    label: "Soft Meditation Drones",
    audio: mixkitTrack(755),
  },
  {
    id: "forest-birds",
    label: "Forest Birds",
    audio: "https://cdn.pixabay.com/audio/2022/03/09/audio_c0c0d3ce46.mp3",
  },
  {
    id: "ocean-waves-ambience",
    label: "Ocean Waves",
    audio: "https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3",
  },
  {
    id: "rain-ambience",
    label: "Rain Ambience",
    audio: "https://cdn.pixabay.com/audio/2022/02/07/audio_8a7a8030a6.mp3",
  },
  {
    id: "wind-through-trees",
    label: "Wind Through Trees",
    audio: "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3",
  },
  {
    id: "night-crickets",
    label: "Night Crickets",
    audio: "https://cdn.pixabay.com/audio/2022/09/01/audio_e0c9e7a28d.mp3",
  },
  {
    id: "fireplace-crackling",
    label: "Fireplace Crackling",
    audio: "https://cdn.pixabay.com/audio/2022/10/30/audio_452ade9a6c.mp3",
  },
  {
    id: "gentle-chimes",
    label: "Gentle Chimes",
    audio: "https://cdn.pixabay.com/audio/2022/03/15/audio_942de19019.mp3",
  },
  {
    id: "river-flowing-ambience",
    label: "River Flowing Ambience",
    audio: "https://cdn.pixabay.com/audio/2022/01/31/audio_46eb6a9029.mp3",
  },
  {
    id: "calm-meditation-pad",
    label: "Calm Meditation Pad",
    audio: "https://cdn.pixabay.com/audio/2022/05/16/audio_3b8e5c2eb1.mp3",
  },
  {
    id: "soft-piano-night",
    label: "Soft Piano Night",
    audio: "https://cdn.pixabay.com/audio/2022/02/22/audio_d1718ab41b.mp3",
  },
  {
    id: "forest-air-ambience",
    label: "Forest Air Ambience",
    audio: "https://cdn.pixabay.com/audio/2022/01/20/audio_ba6c0fee7f.mp3",
  },
  {
    id: "distant-thunder-soft",
    label: "Distant Thunder",
    audio: "https://cdn.pixabay.com/audio/2022/06/07/audio_4f43600e20.mp3",
  },
];
