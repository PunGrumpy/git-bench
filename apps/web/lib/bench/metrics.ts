import { BASELINE_RUNNER, benchData, findResult } from ".";
import type { OperationId, RunnerId } from ".";

export interface OperationScore {
  readonly operationId: OperationId;
  readonly medianMs: number | null;
  readonly minMs: number | null;
  readonly maxMs: number | null;
  /** Median relative to the baseline runner. `1` is parity with `git`. */
  readonly ratio: number | null;
  readonly error?: string;
}

export interface RunnerScore {
  readonly runnerId: RunnerId;
  readonly rank: number;
  /** Another runner posted the same score, so the rank is shared. */
  readonly tied?: boolean;
  /**
   * Geometric mean of the per-operation ratios. The geometric mean is the
   * standard aggregate for normalized benchmark scores: every operation
   * contributes equally regardless of its absolute duration, so a 70-second
   * blob read cannot drown out a 30-microsecond branch lookup.
   */
  readonly geomean: number | null;
  readonly operations: readonly OperationScore[];
  /** Operations where this runner posted the fastest median of all runners. */
  readonly wins: number;
  readonly failures: number;
}

const baselineMs = (operationId: OperationId): number | null => {
  const result = findResult(BASELINE_RUNNER, operationId);
  return result && !result.error ? result.medianMs : null;
};

const activeRunners = benchData.runners.filter((runner) => !runner.comingSoon);

const fastestByOperation = new Map<OperationId, RunnerId>();
for (const operation of benchData.operations) {
  let fastest: { runnerId: RunnerId; medianMs: number } | null = null;
  for (const { id } of activeRunners) {
    const result = findResult(id, operation.id);
    if (!result || result.error) {
      continue;
    }
    if (!fastest || result.medianMs < fastest.medianMs) {
      fastest = { medianMs: result.medianMs, runnerId: id };
    }
  }
  if (fastest) {
    fastestByOperation.set(operation.id, fastest.runnerId);
  }
}

const scoreRunner = (
  runnerId: RunnerId
): Omit<RunnerScore, "rank" | "tied"> => {
  const operations = benchData.operations.map<OperationScore>((operation) => {
    const result = findResult(runnerId, operation.id);
    const base = baselineMs(operation.id);

    if (!result || result.error) {
      return {
        error: result?.error ?? "No result",
        maxMs: null,
        medianMs: null,
        minMs: null,
        operationId: operation.id,
        ratio: null,
      };
    }

    return {
      maxMs: result.maxMs,
      medianMs: result.medianMs,
      minMs: result.minMs,
      operationId: operation.id,
      ratio: base === null || base <= 0 ? null : result.medianMs / base,
    };
  });

  const ratios = operations
    .map((operation) => operation.ratio)
    .filter((ratio): ratio is number => ratio !== null && ratio > 0);

  const geomean =
    ratios.length > 0
      ? Math.exp(
          ratios.reduce((sum, ratio) => sum + Math.log(ratio), 0) /
            ratios.length
        )
      : null;

  return {
    failures: operations.filter((operation) => operation.error).length,
    geomean,
    operations,
    runnerId,
    wins: benchData.operations.filter(
      (operation) => fastestByOperation.get(operation.id) === runnerId
    ).length,
  };
};

const sortedScores = activeRunners
  .map(({ id }) => scoreRunner(id))
  .toSorted((a, b) => (a.geomean ?? Infinity) - (b.geomean ?? Infinity));

/**
 * Every active runner, fastest first. Runners with no comparable result sort
 * last. Equal scores share a rank rather than being ordered arbitrarily.
 */
export const runnerScores: readonly RunnerScore[] = sortedScores.map(
  (score, index) => ({
    ...score,
    rank:
      1 +
      sortedScores.filter(
        (other) => (other.geomean ?? Infinity) < (score.geomean ?? Infinity)
      ).length,
    tied: sortedScores.some(
      (other, otherIndex) =>
        otherIndex !== index && other.geomean === score.geomean
    ),
  })
);

export const findScore = (runnerId: RunnerId): RunnerScore | undefined =>
  runnerScores.find((score) => score.runnerId === runnerId);

export const [fastestRunner] = runnerScores;

export const slowestRunner = runnerScores.at(-1);

const allRatios = runnerScores.flatMap((score) =>
  score.operations
    .map((operation) => operation.ratio)
    .filter((ratio): ratio is number => ratio !== null && ratio > 0)
);

const decade = (value: number, direction: "down" | "up") =>
  10 ** (direction === "down" ? Math.floor : Math.ceil)(Math.log10(value));

/**
 * Shared log-scale domain for the per-operation spread strips, snapped to whole
 * decades so the tick labels read as powers of ten.
 */
export const ratioDomain = {
  max: allRatios.length > 0 ? decade(Math.max(...allRatios), "up") : 10,
  min: allRatios.length > 0 ? decade(Math.min(...allRatios), "down") : 0.1,
};

export const ratioDecades = (() => {
  const ticks: number[] = [];
  for (
    let tick = ratioDomain.min;
    tick <= ratioDomain.max * 1.000001;
    tick *= 10
  ) {
    ticks.push(tick);
  }
  return ticks;
})();

/** Position of a ratio on the shared log axis, as a percentage from the left. */
export const ratioPosition = (ratio: number): number => {
  const span = Math.log10(ratioDomain.max) - Math.log10(ratioDomain.min);
  if (span <= 0) {
    return 0;
  }
  const clamped = Math.min(Math.max(ratio, ratioDomain.min), ratioDomain.max);
  return ((Math.log10(clamped) - Math.log10(ratioDomain.min)) / span) * 100;
};

/** `0.30×`, `4.2×`, `89×` — precision that shrinks as the number grows. */
export const formatRatio = (ratio: number): string => {
  if (ratio < 0.01) {
    return `${ratio.toFixed(3)}×`;
  }
  if (ratio < 1) {
    return `${ratio.toFixed(2)}×`;
  }
  if (ratio < 10) {
    return `${ratio.toFixed(1)}×`;
  }
  if (ratio < 1000) {
    return `${Math.round(ratio)}×`;
  }
  return `${Math.round(ratio).toLocaleString("en-US")}×`;
};

/** How much faster than the baseline, phrased from the reader's side. */
export const formatSpeedup = (ratio: number): string =>
  formatRatio(ratio < 1 ? 1 / ratio : ratio);
