import { BUILTIN_PERSONAS } from "@/lib/builtinPersonas";

// Map AI companion names to their avatar images and colors
const COMPANION_NAMES = ["Seren", "Atlas", "Orion", "Nova", "Elias", "Kai", "Leo", "Sol", "Uprising Daily"];

export function isAICompanion(name: string): boolean {
  return COMPANION_NAMES.some(c => c.toLowerCase() === name?.toLowerCase());
}

export function getCompanionAvatar(name: string): { avatarUrl: string; color: string } | null {
  if (name === "Uprising Daily") {
    return { avatarUrl: "", color: "#2E8B57" };
  }
  const persona = BUILTIN_PERSONAS.find(p => p.name.toLowerCase() === name?.toLowerCase());
  if (!persona) return null;
  return { avatarUrl: persona.avatar_image, color: persona.color };
}

export function getCompanionEmoji(name: string): string {
  const persona = BUILTIN_PERSONAS.find(p => p.name.toLowerCase() === name?.toLowerCase());
  return persona?.avatar_emoji || "🌿";
}
