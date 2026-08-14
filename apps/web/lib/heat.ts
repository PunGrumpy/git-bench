const STOPS = 6;

/**
 * A colour from the six-stop heat ramp, mixing the two stops a value falls
 * between rather than snapping to the nearest one. `t` is clamped to 0–1.
 */
export const heatAt = (t: number): string => {
  const clamped = Math.min(Math.max(t, 0), 1);
  const scaled = clamped * (STOPS - 1);
  const lower = Math.min(Math.floor(scaled), STOPS - 2);
  const mix = Math.round((scaled - lower) * 100);

  return `color-mix(in oklab, var(--hm-r${lower + 1}) ${mix}%, var(--hm-r${lower}))`;
};

/** Where a value sits on a logarithmic scale, as 0–1 for {@link heatAt}. */
export const logProgress = (
  value: number,
  min: number,
  max: number
): number => {
  const span = Math.log10(max) - Math.log10(min);
  if (span <= 0) {
    return 0;
  }
  const clamped = Math.min(Math.max(value, min), max);
  return (Math.log10(clamped) - Math.log10(min)) / span;
};
