import type { CSSProperties } from "react";

import { RunnerLogo } from "@/components/runner-logo";
import { trackAttributes } from "@/lib/analytics";
import { BASELINE_RUNNER, runnerMeta } from "@/lib/bench";
import type { RunnerScore } from "@/lib/bench/metrics";
import {
  formatRatio,
  ratioDecades,
  ratioDomain,
  ratioPosition,
  runnerScores,
} from "@/lib/bench/metrics";
import { cn } from "@/lib/utils";

/** Copy and value stack above the bar until there is room for three columns. */
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 md:grid-cols-[minmax(150px,1.1fr)_minmax(200px,1.5fr)_5rem]";

/** Rows enter top-down; each whisker follows its own bar by a beat. */
const ROW_STAGGER_MS = 50;
const WHISKER_OFFSET_MS = 150;

const MIN_BAR_PERCENT = 0.5;

/** Parity with the git CLI: every bar grows from this line. */
const PARITY_AT = ratioPosition(1);

/** `--grow-delay` and `--row-c` drive CSS and are not typed CSS properties. */
const vars = (style: CSSProperties, custom: Record<string, string>) =>
  ({ ...style, ...custom }) as CSSProperties;

const comparableRatios = (score: RunnerScore) =>
  score.operations
    .map((operation) => operation.ratio)
    .filter((ratio): ratio is number => ratio !== null && ratio > 0);

const tickOffset = (tick: number) => {
  if (tick === ratioDomain.min) {
    return "none";
  }
  return tick === ratioDomain.max ? "translateX(-100%)" : "translateX(-50%)";
};

const Gridlines = () => (
  <div aria-hidden className="absolute inset-0">
    {ratioDecades.map((tick) => (
      <span
        className={cn(
          "absolute inset-y-0 border-l border-dotted",
          tick === 1 ? "border-muted-foreground/60" : "border-border"
        )}
        key={tick}
        style={{ left: `${ratioPosition(tick)}%` }}
      />
    ))}
  </div>
);

/**
 * The bar runs from parity to the runner's score, so distance from the line is
 * how far off the git CLI it lands and which side it lands on. The whisker
 * spans its fastest and slowest operation, carrying what an aggregate hides: a
 * runner can sit at parity on five operations and be three orders of magnitude
 * off on the sixth.
 */
const ScoreBar = ({ index, score }: { index: number; score: RunnerScore }) => {
  const ratios = comparableRatios(score);

  if (ratios.length === 0 || score.geomean === null) {
    return (
      <div aria-hidden className="bg-muted/40 relative h-4.5 w-full">
        <Gridlines />
      </div>
    );
  }

  const scoreAt = ratioPosition(score.geomean);
  const barLeft = Math.min(PARITY_AT, scoreAt);
  const barWidth = Math.max(Math.abs(scoreAt - PARITY_AT), MIN_BAR_PERCENT);
  const whiskerLeft = ratioPosition(Math.min(...ratios));
  const whiskerRight = ratioPosition(Math.max(...ratios));
  const delay = index * ROW_STAGGER_MS;

  return (
    <div aria-hidden className="bg-muted/40 relative h-4.5 w-full">
      <Gridlines />

      <div
        className="bar-grow-x absolute inset-y-0"
        style={vars(
          {
            backgroundColor: runnerMeta[score.runnerId].color,
            left: `${barLeft}%`,
            opacity: 0.9,
            transformOrigin:
              scoreAt < PARITY_AT ? "right center" : "left center",
            width: `${barWidth}%`,
          },
          { "--grow-delay": `${delay}ms` }
        )}
      />

      <div
        className="bar-fade-in absolute inset-0"
        style={vars({}, { "--grow-delay": `${delay + WHISKER_OFFSET_MS}ms` })}
      >
        <span
          className="bg-foreground/60 absolute top-1/2 h-[0.5px] -translate-y-1/2"
          style={{
            left: `${whiskerLeft}%`,
            width: `${Math.max(whiskerRight - whiskerLeft, 0)}%`,
          }}
        />
        <span
          className="bg-foreground/60 absolute inset-y-0 w-[0.5px]"
          style={{ left: `${whiskerLeft}%` }}
        />
        <span
          className="bg-foreground/60 absolute inset-y-0 w-[0.5px]"
          style={{ left: `${whiskerRight}%` }}
        />
      </div>
    </div>
  );
};

const Row = ({ index, score }: { index: number; score: RunnerScore }) => {
  const meta = runnerMeta[score.runnerId];
  const ratios = comparableRatios(score);

  let caption = "no data";
  if (score.runnerId === BASELINE_RUNNER) {
    caption = "baseline";
  } else if (ratios.length > 0) {
    caption = `${formatRatio(Math.min(...ratios))}–${formatRatio(Math.max(...ratios))}`;
  }

  return (
    <li>
      <a
        {...trackAttributes("runner_open", {
          rank: score.rank,
          runner: score.runnerId,
        })}
        className={cn(
          ROW_GRID,
          "gap-y-2 border-b border-dotted py-2.5",
          "transition-colors hover:bg-[color-mix(in_oklab,var(--row-c)_7%,transparent)]",
          "md:h-12.5 md:gap-y-0 md:py-0"
        )}
        href={meta.url}
        rel="noreferrer"
        target="_blank"
        style={vars({}, { "--row-c": meta.color })}
      >
        <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2.5 md:col-auto md:row-auto">
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            <span className="sr-only">Rank </span>
            <span className="inline-block w-4 text-right">{score.rank}</span>
            <span aria-hidden className="inline-block w-2 text-left">
              {score.tied ? "=" : ""}
            </span>
            {score.tied && <span className="sr-only">, tied</span>}
          </span>
          <RunnerLogo runnerId={score.runnerId} />
          {/* The runner name is what the row is about, so the language and
              binding are what give way when the column gets tight. Held back
              to `lg`: between `md` and there, the three-column grid leaves the
              name 62px for 99px of "isomorphic-git". */}
          <span className="flex min-w-0 items-baseline">
            <span className="truncate text-[15px]">{meta.label}</span>
            <span className="text-muted-foreground hidden shrink-0 pl-2 text-xs whitespace-nowrap lg:inline">
              {meta.language} · {meta.binding}
            </span>
          </span>
        </span>

        <span className="col-span-2 col-start-1 row-start-2 md:col-auto md:col-span-1 md:row-auto">
          <ScoreBar index={index} score={score} />
        </span>

        <span className="col-start-2 row-start-1 text-right tabular-nums md:col-auto md:row-auto">
          <span className="text-[15px]">
            {score.geomean === null ? "—" : formatRatio(score.geomean)}
          </span>
          <span className="text-muted-foreground block text-xs">{caption}</span>
        </span>
      </a>
    </li>
  );
};

const Axis = () => (
  <div aria-hidden className={ROW_GRID}>
    <span className="hidden md:block" />
    <span className="relative col-span-2 block h-8 md:col-auto md:col-span-1">
      {ratioDecades.map((tick) => {
        const isParity = tick === 1;
        const isLabelled =
          isParity || tick === ratioDomain.min || tick === ratioDomain.max;

        return (
          <span
            className="absolute top-0 flex flex-col"
            key={tick}
            style={{
              left: `${ratioPosition(tick)}%`,
              transform: tickOffset(tick),
            }}
          >
            <span
              className={cn(
                "h-1.5 border-l border-dotted",
                isParity ? "border-muted-foreground/60" : "border-border"
              )}
            />
            {isLabelled && (
              <span
                className={cn(
                  "pt-1 text-xs whitespace-nowrap tabular-nums",
                  isParity ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {formatRatio(tick)}
                {isParity ? " parity" : ""}
              </span>
            )}
          </span>
        );
      })}
    </span>
    <span className="hidden md:block" />
  </div>
);

export const Leaderboard = () => (
  <section className="flex flex-col gap-4" id="leaderboard">
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">Overall ranking</h2>
      <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
        Geometric mean of the six operations against the git CLI, on a
        logarithmic axis: lower is faster, a bar left of parity beats git, and
        the whisker spans the runner&rsquo;s best and worst operation.
      </p>
    </div>

    <div className="flex flex-col">
      <div
        className={cn(
          ROW_GRID,
          "text-muted-foreground h-9 border-b border-dotted text-xs"
        )}
      >
        <span>Runner</span>
        <span className="hidden md:block" />
        <span className="text-right">Score</span>
      </div>

      <ol className="flex flex-col">
        {runnerScores.map((score, index) => (
          <Row index={index} key={score.runnerId} score={score} />
        ))}
      </ol>

      <Axis />
    </div>
  </section>
);
