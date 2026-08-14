import { createUISFX } from "uisfx";
import type { CueName, UISFXPlayer } from "uisfx";

const STORAGE_KEY = "git-bench:sfx";

/** Quiet enough to sit under a page people come to read numbers on. */
const VOLUME = 0.35;

let player: UISFXPlayer | null = null;
let unlocking: Promise<boolean> | null = null;
let enabled = true;
let restored = false;

const listeners = new Set<() => void>();

/**
 * uisfx persists the preference itself, but the mute control has to render the
 * right icon before anything has touched the audio engine, so the stored value
 * is read once on its own.
 */
const currentEnabled = () => {
  if (!restored && typeof window !== "undefined") {
    restored = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      enabled = raw ? JSON.parse(raw).enabled !== false : true;
    } catch {
      enabled = true;
    }
  }
  return enabled;
};

const getPlayer = () => {
  if (typeof window === "undefined") {
    return null;
  }
  player ??= createUISFX({
    enabled: currentEnabled(),
    pack: "zen",
    preferences: { key: STORAGE_KEY },
    volume: VOLUME,
  });
  return player;
};

/**
 * A small store around the uisfx player: sound is a preference, so the mute
 * control has to re-render when it changes and the choice has to survive a
 * reload.
 */
export const sfx = {
  isEnabled: () => currentEnabled(),

  /** The server has no stored preference; sound is on unless muted. */
  isEnabledOnServer: () => true,

  play(cue: CueName) {
    if (!currentEnabled()) {
      return;
    }
    const active = getPlayer();
    if (!active) {
      return;
    }

    const start = async () => {
      try {
        // Browsers only let audio start from a gesture; every caller is one.
        unlocking ??= active.unlock();
        await unlocking;
        active.play(cue);
      } catch {
        // Audio is a garnish; a blocked context never blocks the UI.
      }
    };
    start();
  },

  setEnabled(next: boolean) {
    // Resolve the player before assigning, or creating it would restore the
    // stored value over the one being set.
    const active = getPlayer();
    restored = true;
    enabled = next;
    active?.setEnabled(next);
    for (const listener of listeners) {
      listener();
    }
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
