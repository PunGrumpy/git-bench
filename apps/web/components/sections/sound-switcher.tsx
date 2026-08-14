"use client";

import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Badge } from "@/components/ui/badge";
import { sfx } from "@/lib/sfx";

export const SoundSwitcher = () => {
  const enabled = useSyncExternalStore(
    sfx.subscribe,
    sfx.isEnabled,
    sfx.isEnabledOnServer
  );

  const toggle = () => {
    const next = !enabled;
    sfx.setEnabled(next);
    // Play on the way back in, so turning sound on demonstrates itself.
    if (next) {
      sfx.play("toggle-on");
    }
  };

  const Icon = enabled ? Volume2Icon : VolumeXIcon;

  return (
    <button
      aria-label={enabled ? "Mute interface sounds" : "Unmute interface sounds"}
      aria-pressed={enabled}
      className="text-muted-foreground hover:text-foreground transition-colors"
      onClick={toggle}
      type="button"
    >
      <span className="hover:bg-sidebar flex size-9 items-center justify-center rounded-full border border-dotted transition-colors sm:hidden">
        <Icon className="size-4" />
      </span>
      <Badge
        className="hover:bg-sidebar hidden h-auto items-center gap-2 border-dotted bg-transparent px-4 py-2 transition-colors sm:inline-flex"
        variant="outline"
      >
        <Icon className="size-3.5" />
        {enabled ? "Sound" : "Muted"}
      </Badge>
    </button>
  );
};
