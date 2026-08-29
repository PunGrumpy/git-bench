import type { RunnerId } from "@/lib/bench";

import { BASELINE_RUNNER, benchData } from ".";
import { runnerScores } from "./metrics";

interface Recommendation {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly runnerId: RunnerId;
}

const successfulOperations = (runnerId: RunnerId): number => {
  let count = 0;
  for (const result of benchData.results) {
    if (result.runner === runnerId && !result.error) {
      count += 1;
    }
  }
  return count;
};

const parityMismatches = (runnerId: RunnerId): number => {
  let count = 0;
  for (const result of benchData.results) {
    if (result.runner === runnerId && result.parity === "mismatch") {
      count += 1;
    }
  }
  return count;
};

const averageSpread = (runnerId: RunnerId): number | null => {
  const spreads: number[] = [];
  for (const result of benchData.results) {
    if (result.runner === runnerId && !result.error && result.medianMs > 0) {
      spreads.push((result.maxMs - result.minMs) / result.medianMs);
    }
  }

  if (spreads.length === 0) {
    return null;
  }
  let total = 0;
  for (const spread of spreads) {
    total += spread;
  }
  return total / spreads.length;
};

const bestInProcess = benchData.runners.find(
  (runner) =>
    !runner.comingSoon &&
    runner.id !== BASELINE_RUNNER &&
    runner.id !== "ziggit"
);

const reliabilityScores = benchData.runners.map((runner) => ({
  failures: benchData.operations.length - successfulOperations(runner.id),
  mismatches: parityMismatches(runner.id),
  runnerId: runner.id,
  spread: averageSpread(runner.id) ?? Number.POSITIVE_INFINITY,
}));

const mostReliable = reliabilityScores.toSorted(
  (a, b) =>
    a.mismatches - b.mismatches ||
    a.failures - b.failures ||
    a.spread - b.spread
);

const [mostReliableRunner] = mostReliable;

export const recommendations: readonly Recommendation[] = [
  {
    description:
      "Lowest geometric mean across all six operations, normalized against the git CLI.",
    id: "overall",
    runnerId: runnerScores[0]?.runnerId ?? BASELINE_RUNNER,
    title: "Best overall",
  },
  {
    description:
      "Avoids subprocess startup when the benchmark work is embedded in your application.",
    id: "in-process",
    runnerId: bestInProcess?.id ?? BASELINE_RUNNER,
    title: "Best in-process option",
  },
  {
    description:
      "Fewest parity mismatches and failed operations, with the smallest average sample spread.",
    id: "reliable",
    runnerId: mostReliableRunner?.runnerId ?? BASELINE_RUNNER,
    title: "Most reliable",
  },
];
