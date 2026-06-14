import type { AudioManifest as SunoAudioManifest } from "@joycostudio/suno";

export const AUDIO_MANIFEST: SunoAudioManifest = {
  click: { src: "/audio/click.ogg" },
} as const;

export type AudioManifest = typeof AUDIO_MANIFEST;
