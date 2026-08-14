import { useCallback, useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * Reads the media query as an external store rather than mirroring it into
 * state from an effect, so the first client render already has the right
 * answer and a resize costs one render instead of two.
 */
export const useIsMobile = () => {
  const subscribe = useCallback((onChange: () => void) => {
    const query = window.matchMedia(QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    // The server has no viewport; desktop is the safer assumption for layout.
    () => false
  );
};
