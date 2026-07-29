export interface Stats {
  readonly maxMs: number;
  readonly meanMs: number;
  readonly medianMs: number;
  readonly minMs: number;
  readonly samples: number;
}

export const stats = (samples: number[]): Stats => {
  if (samples.length === 0) {
    return { maxMs: 0, meanMs: 0, medianMs: 0, minMs: 0, samples: 0 };
  }
  const sorted = [...samples].toSorted((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const lastIndex = sorted.length - 1;
  const mid = Math.floor(sorted.length / 2);
  const medianMs =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
      : (sorted[mid] as number);
  return {
    maxMs: sorted[lastIndex] as number,
    meanMs: sum / sorted.length,
    medianMs,
    minMs: sorted[0] as number,
    samples: sorted.length,
  };
};
