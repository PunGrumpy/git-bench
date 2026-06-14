"use client";

import type { AudioManifest } from "@joycostudio/suno";
import { SunoProvider } from "@joycostudio/suno/react";
import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const AUDIO_MANIFEST: AudioManifest = {
  click: { src: "/audio/click.ogg" },
} as const;

export const DesignSystemProvider = ({ children }: PropsWithChildren) => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    disableTransitionOnChange
    enableSystem
  >
    <TooltipProvider delayDuration={0}>
      <SunoProvider manifest={AUDIO_MANIFEST}>{children}</SunoProvider>
      <Toaster />
    </TooltipProvider>
  </ThemeProvider>
);
