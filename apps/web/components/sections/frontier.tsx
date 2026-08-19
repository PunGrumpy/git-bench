"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import { SegmentedControl } from "@/components/segmented-control";
import { trackEvent } from "@/lib/analytics";
import { BASELINE_RUNNER, runnerMeta } from "@/lib/bench";
import type { RunnerBinding, RunnerId } from "@/lib/bench";
import type { RunnerScore } from "@/lib/bench/metrics";
import { formatRatio, runnerScores } from "@/lib/bench/metrics";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";

type XMetric = "spread" | "worst";
type GroupFilter = RunnerBinding | "all";

const X_METRICS = [
  { label: "Spread", value: "spread" },
  { label: "Worst operation", value: "worst" },
] as const satisfies readonly { label: string; value: XMetric }[];

const GROUPS = [
  { label: "All", value: "all" },
  { label: "In-process", value: "in-process" },
  { label: "Subprocess", value: "subprocess" },
] as const satisfies readonly { label: string; value: GroupFilter }[];

interface Point {
  readonly score: RunnerScore;
  readonly x: number;
  readonly y: number;
  readonly left: number;
  readonly top: number;
}

interface Domain {
  max: number;
  min: number;
}

const decadeCeil = (value: number) => 10 ** Math.ceil(Math.log10(value));
const decadeFloor = (value: number) => 10 ** Math.floor(Math.log10(value));

const ratiosOf = (score: RunnerScore) =>
  score.operations
    .map((operation) => operation.ratio)
    .filter((ratio): ratio is number => ratio !== null && ratio > 0);

const xValue = (score: RunnerScore, metric: XMetric) => {
  const ratios = ratiosOf(score);
  if (ratios.length === 0) {
    return null;
  }
  const worst = Math.max(...ratios);
  return metric === "worst" ? worst : worst / Math.min(...ratios);
};

const domainOf = (values: number[]) => {
  const min = decadeFloor(Math.min(...values, 1));
  const max = decadeCeil(Math.max(...values, 1));
  return { max, min: min === max ? max / 10 : min };
};

const decadesOf = ({ max, min }: { max: number; min: number }) => {
  const ticks: number[] = [];
  for (let tick = min; tick <= max * 1.000001; tick *= 10) {
    ticks.push(tick);
  }
  return ticks;
};

const positionIn = (
  value: number,
  { max, min }: { max: number; min: number }
) => {
  const span = Math.log10(max) - Math.log10(min);
  const clamped = Math.min(Math.max(value, min), max);
  return span <= 0 ? 0 : ((Math.log10(clamped) - Math.log10(min)) / span) * 100;
};

const vars = (style: CSSProperties, custom: Record<string, string>) =>
  ({ ...style, ...custom }) as CSSProperties;

const tickOffset = (position: number) => {
  if (position === 0) {
    return "translate-x-0";
  }
  return position === 100 ? "-translate-x-full" : "-translate-x-1/2";
};

/** Shape carries the binding, so the split survives without colour. */
const Marker = ({
  binding,
  className,
}: {
  binding: RunnerBinding;
  className?: string;
}) =>
  binding === "in-process" ? (
    <svg aria-hidden className={className} viewBox="0 0 10 10">
      <circle cx="5" cy="5" fill="currentColor" r="4" />
    </svg>
  ) : (
    <svg aria-hidden className={className} viewBox="0 0 10 10">
      <path d="M5 1 9 9H1Z" fill="currentColor" />
    </svg>
  );

interface PlotProps {
  readonly shown: readonly Point[];
  readonly activePoint: Point | undefined;
  readonly trails: readonly { binding: RunnerBinding; path: Point[] }[];
  readonly xDomain: Domain;
  readonly yDomain: Domain;
  readonly xTicks: readonly number[];
  readonly yTicks: readonly number[];
  readonly metric: XMetric;
  readonly onActivate: (runnerId: RunnerId | null) => void;
}

/** The plot itself, kept apart from the controls that drive it. */
const Plot = ({
  activePoint,
  metric,
  onActivate,
  shown,
  trails,
  xDomain,
  xTicks,
  yDomain,
  yTicks,
}: PlotProps) => (
  <figure className="flex min-w-0 flex-col gap-2">
    <div className="flex gap-2">
      <div
        aria-hidden
        className="text-muted-foreground flex w-12 shrink-0 flex-col justify-between text-right text-xs tabular-nums"
      >
        {[...yTicks].toReversed().map((tick) => (
          <span
            className={cn(
              activePoint &&
                Math.abs(100 - positionIn(tick, yDomain) - activePoint.top) <
                  6 &&
                "opacity-0"
            )}
            key={tick}
          >
            {formatRatio(tick)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative h-64 border border-dotted">
          {xTicks.map((tick) => (
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-0 border-l border-dotted",
                tick === 1 ? "border-muted-foreground/50" : "border-border"
              )}
              key={tick}
              style={{ left: `${positionIn(tick, xDomain)}%` }}
            />
          ))}
          {yTicks.map((tick) => (
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-0 border-t border-dotted",
                tick === 1 ? "border-muted-foreground/50" : "border-border"
              )}
              key={tick}
              style={{ top: `${100 - positionIn(tick, yDomain)}%` }}
            />
          ))}

          <svg
            aria-hidden
            className="text-muted-foreground/45 absolute inset-0 size-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <title>Runners joined by binding</title>
            {trails.map((trail) => (
              <polyline
                fill="none"
                key={trail.binding}
                points={trail.path
                  .map((point) => `${point.left},${point.top}`)
                  .join(" ")}
                stroke="currentColor"
                strokeDasharray="2 2"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {activePoint && (
            <>
              <span
                aria-hidden
                className="bg-foreground/25 absolute inset-y-0 w-px"
                style={{ left: `${activePoint.left}%` }}
              />
              <span
                aria-hidden
                className="bg-foreground/25 absolute inset-x-0 h-px"
                style={{ top: `${activePoint.top}%` }}
              />
              <span
                aria-hidden
                className="bg-background absolute -left-12 w-12 -translate-y-1/2 pr-2 text-right text-xs font-medium tabular-nums"
                style={{ top: `${activePoint.top}%` }}
              >
                {formatRatio(activePoint.y)}
              </span>
            </>
          )}

          <span
            aria-hidden
            className="text-muted-foreground absolute right-2 bottom-1.5 text-[11px] italic"
          >
            fast and predictable ↙
          </span>

          {shown.map((point) => {
            const meta = runnerMeta[point.score.runnerId];
            const isActive =
              activePoint?.score.runnerId === point.score.runnerId;
            const flip = point.left > 62;

            return (
              <button
                className={cn(
                  "absolute flex -translate-y-1/2 items-center gap-1.5 transition-opacity",
                  flip
                    ? "-translate-x-[calc(100%-0.3rem)] flex-row-reverse"
                    : "-translate-x-1.5",
                  activePoint && !isActive && "opacity-30"
                )}
                key={point.score.runnerId}
                onBlur={() => onActivate(null)}
                onFocus={() => onActivate(point.score.runnerId)}
                onMouseEnter={() => onActivate(point.score.runnerId)}
                onMouseLeave={() => onActivate(null)}
                style={vars(
                  { left: `${point.left}%`, top: `${point.top}%` },
                  { "--row-c": meta.color }
                )}
                type="button"
              >
                <Marker
                  binding={meta.binding}
                  className="size-2.5 shrink-0 text-(--row-c)"
                />
                <span
                  className={cn(
                    "text-[11px] whitespace-nowrap",
                    isActive || point.score.runnerId === BASELINE_RUNNER
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {meta.label}
                </span>
                <span className="sr-only">
                  score {formatRatio(point.y)},{" "}
                  {metric === "spread" ? "spread" : "worst operation"}{" "}
                  {formatRatio(point.x)}
                </span>
              </button>
            );
          })}
        </div>

        <div
          aria-hidden
          className="text-muted-foreground relative mt-1 h-4 text-xs tabular-nums"
        >
          {xTicks.map((tick) => {
            const at = positionIn(tick, xDomain);
            return (
              <span
                className={cn(
                  "absolute",
                  tickOffset(at),
                  activePoint &&
                    Math.abs(at - activePoint.left) < 8 &&
                    "opacity-0"
                )}
                key={tick}
                style={{ left: `${at}%` }}
              >
                {formatRatio(tick)}
              </span>
            );
          })}
          {activePoint && (
            <span
              className="bg-background text-foreground absolute top-0 -translate-x-1/2 px-1 font-medium whitespace-nowrap"
              style={{ left: `${activePoint.left}%` }}
            >
              {formatRatio(activePoint.x)}
            </span>
          )}
        </div>

        <p
          aria-hidden
          className="text-muted-foreground mt-2 text-center text-xs"
        >
          {metric === "spread"
            ? "spread — worst operation ÷ best"
            : "worst single operation (×git CLI)"}
        </p>
      </div>
    </div>

    <figcaption className="text-muted-foreground text-xs leading-relaxed">
      Score, lower is faster, against{" "}
      {metric === "spread"
        ? "how far the same runner drifts between its best and worst operation"
        : "its worst single operation"}
      . Both axes logarithmic; the brighter lines mark parity with git.
    </figcaption>
  </figure>
);

export const Frontier = () => {
  const [metric, setMetric] = useState<XMetric>("spread");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [active, setActive] = useState<RunnerId | null>(null);

  const measured = runnerScores.flatMap((score) => {
    const x = xValue(score, metric);
    return x !== null && score.geomean !== null
      ? [{ score, x, y: score.geomean }]
      : [];
  });

  const xDomain = domainOf(measured.map((point) => point.x));
  const yDomain = domainOf(measured.map((point) => point.y));
  const xTicks = decadesOf(xDomain);
  const yTicks = decadesOf(yDomain);

  const points: Point[] = measured.map((point) => ({
    ...point,
    left: positionIn(point.x, xDomain),
    top: 100 - positionIn(point.y, yDomain),
  }));

  const shown = points.filter(
    (point) =>
      group === "all" || runnerMeta[point.score.runnerId].binding === group
  );
  const activePoint = shown.find((point) => point.score.runnerId === active);

  /** One polyline per binding, so the two families read as families. */
  const trails = (["in-process", "subprocess"] as const)
    .map((binding) => ({
      binding,
      path: shown
        .filter((point) => runnerMeta[point.score.runnerId].binding === binding)
        .toSorted((a, b) => a.left - b.left),
    }))
    .filter((trail) => trail.path.length > 1);

  return (
    <section className="flex flex-col gap-4" id="frontier">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-xl font-semibold">Speed against consistency</h2>
        <SegmentedControl
          label="Horizontal axis"
          onChange={(next: XMetric) => {
            sfx.play("select");
            trackEvent("frontier_axis_change", { metric: next });
            setMetric(next);
          }}
          options={X_METRICS}
          value={metric}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {GROUPS.map((option) => (
          <button
            aria-pressed={group === option.value}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              group === option.value
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={option.value}
            onClick={() => {
              sfx.play("select");
              trackEvent("frontier_filter_change", { binding: option.value });
              setGroup(option.value);
            }}
            type="button"
          >
            {option.value !== "all" && (
              <Marker binding={option.value} className="size-2.5" />
            )}
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_11rem]">
        <Plot
          activePoint={activePoint}
          metric={metric}
          onActivate={setActive}
          shown={shown}
          trails={trails}
          xDomain={xDomain}
          xTicks={xTicks}
          yDomain={yDomain}
          yTicks={yTicks}
        />

        <dl className="text-muted-foreground flex flex-col gap-3 text-xs leading-relaxed italic">
          <div>
            <dt className="inline font-medium not-italic">Score:</dt>{" "}
            <dd className="inline">
              the geometric mean of the six operations, each as a multiple of
              the git CLI.
            </dd>
          </div>
          <div>
            <dt className="inline font-medium not-italic">Spread:</dt>{" "}
            <dd className="inline">
              the worst operation divided by the best. A point far to the right
              hides at least one operation you would not want in a request path.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
};
