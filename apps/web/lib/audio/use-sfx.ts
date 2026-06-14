"use client";

import { useSuno, useUnlock } from "@joycostudio/suno/react";

import type { AudioManifest } from "./manifest";

export const useSfx = () => {
  const suno = useSuno<AudioManifest>();
  const { unlock, unlocked } = useUnlock();

  const play = async (key: keyof AudioManifest) => {
    try {
      if (!unlocked) {
        await unlock();
      }
      const source = await suno.load(key);
      source.play();
    } catch {
      // Ignore errors if audio context is blocked or fails to load/play
    }
  };

  return { play };
};
