"use client";

import { SunoProvider, useSuno } from "@joycostudio/suno/react";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { AUDIO_MANIFEST } from "@/lib/audio/manifest";
import type { AudioManifest } from "@/lib/audio/manifest";

interface AudioProviderProps {
  readonly children: ReactNode;
}

const AudioLoader = ({ children }: AudioProviderProps) => {
  const suno = useSuno<AudioManifest>();

  useEffect(() => {
    const load = async () => {
      try {
        await suno.loadAll();
      } catch {
        // Ignore load errors in environments without AudioContext support
      }
    };
    load();
  }, [suno]);

  return <>{children}</>;
};

export const AudioProvider = ({ children }: AudioProviderProps) => (
  <SunoProvider manifest={AUDIO_MANIFEST}>
    <AudioLoader>{children}</AudioLoader>
  </SunoProvider>
);
