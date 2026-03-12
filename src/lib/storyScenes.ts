import {
  STORY_AUDIO_LIBRARY,
  STORY_VIDEO_LIBRARY,
  type StoryAudioLibraryItem,
  type StoryVideoLibraryItem,
} from "@/lib/storySceneLibraries";

export type StoryScene = {
  id: string;
  label: string;
  video: string;
  audio: string;
  gradient: string;
  videoId: string;
  audioId: string;
};

type PickSceneOptions = {
  excludeVideoIds?: Iterable<string>;
  excludeAudioIds?: Iterable<string>;
  dayKey?: string;
};

const DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

const getDayKey = () => DAY_FORMATTER.format(new Date());

const toSet = (items?: Iterable<string>) => new Set(items ?? []);

const buildScene = (
  video: StoryVideoLibraryItem,
  audio: StoryAudioLibraryItem,
  companionId: string,
  index: number
): StoryScene => ({
  id: `${companionId}-${video.id}-${audio.id}-${index}`,
  label: video.label,
  video: video.video,
  audio: audio.audio,
  gradient: video.gradient,
  videoId: video.id,
  audioId: audio.id,
});

const seededShuffle = <T extends { id: string }>(items: T[], seedKey: string) => {
  return [...items].sort((a, b) => {
    const scoreA = hashString(`${seedKey}-${a.id}`);
    const scoreB = hashString(`${seedKey}-${b.id}`);
    return scoreA - scoreB;
  });
};

const pickUniqueFromPool = <T extends { id: string }>(
  pool: T[],
  count: number,
  excludedIds: Set<string>
): T[] => {
  const picked: T[] = [];
  const used = new Set<string>();

  for (const item of pool) {
    if (picked.length >= count) break;
    if (excludedIds.has(item.id) || used.has(item.id)) continue;
    picked.push(item);
    used.add(item.id);
  }

  for (const item of pool) {
    if (picked.length >= count) break;
    if (used.has(item.id)) continue;
    picked.push(item);
    used.add(item.id);
  }

  for (const item of pool) {
    if (picked.length >= count) break;
    picked.push(item);
  }

  return picked;
};

/**
 * Prebuilt cinematic combinations for quick previews/fallbacks.
 */
export const ALL_SCENES: StoryScene[] = STORY_VIDEO_LIBRARY.map((video, index) =>
  buildScene(video, STORY_AUDIO_LIBRARY[index % STORY_AUDIO_LIBRARY.length], "library", index)
);

/**
 * Picks N cinematic scenes for a companion.
 * - Uses day + companion seeded shuffles so stories rotate daily.
 * - Guarantees different video/audio between frame 1 and frame 2 when count=2.
 */
export function pickScenesForCompanion(
  companionId: string,
  count: number,
  options: PickSceneOptions = {}
): StoryScene[] {
  if (count <= 0) return [];

  const dayKey = options.dayKey ?? getDayKey();
  const videoPool = seededShuffle(STORY_VIDEO_LIBRARY, `video-${dayKey}-${companionId}`);
  const audioPool = seededShuffle(STORY_AUDIO_LIBRARY, `audio-${dayKey}-${companionId}`);

  const pickedVideos = pickUniqueFromPool(videoPool, count, toSet(options.excludeVideoIds));
  const pickedAudios = pickUniqueFromPool(audioPool, count, toSet(options.excludeAudioIds));

  if (pickedVideos.length === 0 || pickedAudios.length === 0) {
    return [];
  }

  const audioOffset = hashString(`${dayKey}-${companionId}-audio-offset`) % pickedAudios.length;

  return Array.from({ length: count }, (_, index) => {
    const video = pickedVideos[index % pickedVideos.length];
    const audio = pickedAudios[(index + audioOffset) % pickedAudios.length];
    return buildScene(video, audio, companionId, index);
  });
}

/**
 * Group scene planner to reduce repetition across companions shown in one story row.
 */
export function pickScenesForCompanions(
  companionIds: string[],
  framesPerCompanion: number
): Record<string, StoryScene[]> {
  const dayKey = getDayKey();
  const globalUsedVideos = new Set<string>();
  const globalUsedAudios = new Set<string>();

  return companionIds.reduce<Record<string, StoryScene[]>>((acc, companionId) => {
    const scenes = pickScenesForCompanion(companionId, framesPerCompanion, {
      dayKey,
      excludeVideoIds: globalUsedVideos,
      excludeAudioIds: globalUsedAudios,
    });

    scenes.forEach((scene) => {
      globalUsedVideos.add(scene.videoId);
      globalUsedAudios.add(scene.audioId);
    });

    acc[companionId] = scenes;
    return acc;
  }, {});
}

/**
 * Selects a replacement scene when a video fails to load.
 * Keeps current audio when possible and swaps to a different video loop.
 */
export function getFallbackScene(
  failedScene: StoryScene,
  options: PickSceneOptions = {}
): StoryScene {
  const excludedVideoIds = toSet(options.excludeVideoIds);
  excludedVideoIds.add(failedScene.videoId);

  const excludedAudioIds = toSet(options.excludeAudioIds);

  const fallbackVideos = STORY_VIDEO_LIBRARY.filter((video) => !excludedVideoIds.has(video.id));
  const safeVideos = fallbackVideos.length > 0
    ? fallbackVideos
    : STORY_VIDEO_LIBRARY.filter((video) => video.id !== failedScene.videoId);

  const fallbackVideo = safeVideos[hashString(`${failedScene.id}-${Date.now()}`) % safeVideos.length];

  const currentAudio = STORY_AUDIO_LIBRARY.find((audio) => audio.id === failedScene.audioId);
  const fallbackAudioPool = STORY_AUDIO_LIBRARY.filter((audio) => !excludedAudioIds.has(audio.id));

  const fallbackAudio =
    currentAudio && !excludedAudioIds.has(currentAudio.id)
      ? currentAudio
      : fallbackAudioPool[hashString(`audio-${failedScene.id}-${Date.now()}`) % fallbackAudioPool.length] ??
        STORY_AUDIO_LIBRARY[0];

  return buildScene(fallbackVideo, fallbackAudio, `fallback-${failedScene.id}`, 0);
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
