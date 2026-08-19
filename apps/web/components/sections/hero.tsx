import { ArrowUpRightIcon } from "lucide-react";

import { trackAttributes } from "@/lib/analytics";
import {
  BASELINE_RUNNER,
  benchData,
  repoName,
  repoWebUrl,
  runnerMeta,
} from "@/lib/bench";
import {
  fastestRunner,
  formatSpeedup,
  slowestRunner,
} from "@/lib/bench/metrics";

const samples = benchData.results[0]?.samples ?? 0;

const activeRunners = benchData.runners.filter((runner) => !runner.comingSoon);

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

const spell = (count: number) => NUMBER_WORDS[count] ?? String(count);

/**
 * The headline claim is read off the data rather than written down, so adding a
 * runner or an operation can never leave the page asserting something stale.
 */
const claim = () => {
  const fastest = fastestRunner?.geomean ?? null;
  const slowest = slowestRunner?.geomean ?? null;

  if (!(fastest && slowest && fastestRunner)) {
    return null;
  }

  const spread = `${formatSpeedup(slowest / fastest)} separates the fastest runner from the slowest.`;

  if (fastestRunner.runnerId === BASELINE_RUNNER) {
    return `Nothing here beats the git CLI overall, and ${spread}`;
  }

  return `${runnerMeta[fastestRunner.runnerId].label} finishes ${formatSpeedup(fastest)} faster than the git CLI, and ${spread}`;
};

export const Hero = () => {
  const headlineClaim = claim();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <h1 className="max-w-prose text-3xl leading-tight font-semibold text-balance first-letter:uppercase sm:text-4xl">
          {spell(activeRunners.length)} git implementations, one repository, the
          same {spell(benchData.operations.length)} operations.
        </h1>
        <p className="text-muted-foreground max-w-prose text-base leading-relaxed">
          Every runner is held to the same work contract on a full clone of{" "}
          <a
            className="text-foreground decoration-muted-foreground/40 hover:decoration-muted-foreground underline decoration-dotted decoration-1 underline-offset-[3px] transition-colors"
            href={repoWebUrl}
            rel="noreferrer"
            target="_blank"
          >
            {repoName}
          </a>
          , so the numbers compare implementations rather than workloads.
          {headlineClaim && (
            <span className="text-foreground"> {headlineClaim}</span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a
          {...trackAttributes("cta_click", { cta: "methodology" })}
          className="bg-primary text-primary-foreground inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-90"
          href="#methodology"
        >
          Read the methodology
        </a>
        <a
          className="hover:bg-sidebar inline-flex h-9 items-center gap-1.5 rounded-full border border-dotted px-4 text-sm font-medium transition-colors"
          href="https://github.com/PunGrumpy/git-bench#running"
          rel="noreferrer"
          target="_blank"
        >
          Run it yourself
          <ArrowUpRightIcon aria-hidden className="size-3.5" />
        </a>
      </div>

      <p className="text-muted-foreground border-t border-dotted pt-4 text-xs tabular-nums">
        {activeRunners.length} runners · {benchData.operations.length}{" "}
        operations · {samples} timed samples each · last run{" "}
        {benchData.lastBenchmarked ?? "not yet"}
      </p>
    </section>
  );
};
