import { ArrowRightIcon } from "lucide-react";
import type { CSSProperties } from "react";

import { RunnerLogo } from "@/components/runner-logo";
import { trackAttributes } from "@/lib/analytics";
import { benchData, findResult } from "@/lib/bench";
import type { BenchOperation, RunnerId } from "@/lib/bench";
import { formatRatio } from "@/lib/bench/metrics";
import { heatAt, logProgress } from "@/lib/heat";
import { cn, formatMs } from "@/lib/utils";

const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 md:grid-cols-[minmax(220px,2fr)_minmax(112px,1fr)_6rem]";

const ROW_STAGGER_MS = 50;
const WHISKER_OFFSET_MS = 150;
const MIN_BAR_PERCENT = 0.5;

const activeRunners = benchData.runners.filter((runner) => !runner.comingSoon);

interface OperationSpread {
  readonly operation: BenchOperation;
  readonly fastest: RunnerId;
  /** Slowest median divided by fastest: how much the choice of runner matters. */
  readonly spread: number;
  /** The same ratio at its most and least favourable across the samples. */
  readonly low: number;
  readonly high: number;
  readonly fastestMs: number;
}

const measure = (operation: BenchOperation): OperationSpread | null => {
  const timings = activeRunners.flatMap(({ id }) => {
    const result = findResult(id, operation.id);
    return result && !result.error ? [{ ...result, runnerId: id }] : [];
  });

  const sorted = timings.toSorted((a, b) => a.medianMs - b.medianMs);
  const [fastest] = sorted;
  const slowest = sorted.at(-1);
  if (!(fastest && slowest) || fastest.medianMs <= 0) {
    return null;
  }

  return {
    fastest: fastest.runnerId,
    fastestMs: fastest.medianMs,
    high: fastest.minMs > 0 ? slowest.maxMs / fastest.minMs : 1,
    low: fastest.maxMs > 0 ? slowest.minMs / fastest.maxMs : 1,
    operation,
    spread: slowest.medianMs / fastest.medianMs,
  };
};

const spreads = benchData.operations
  .map(measure)
  .filter((row): row is OperationSpread => row !== null)
  .toSorted((a, b) => b.spread - a.spread);

const decadeCeil = (value: number) => 10 ** Math.ceil(Math.log10(value));

/** 1× (every runner agrees) to the next whole decade past the widest spread. */
const AXIS = {
  max: decadeCeil(Math.max(...spreads.map((row) => row.high), 10)),
  min: 1,
};

const axisTicks = (() => {
  const ticks: number[] = [];
  for (let tick = AXIS.min; tick <= AXIS.max * 1.000001; tick *= 10) {
    ticks.push(tick);
  }
  return ticks;
})();

const positionAt = (value: number) =>
  logProgress(value, AXIS.min, AXIS.max) * 100;

const vars = (style: CSSProperties, custom: Record<string, string>) =>
  ({ ...style, ...custom }) as CSSProperties;

const tickOffset = (position: number) => {
  if (position === 0) {
    return "none";
  }
  return position === 100 ? "translateX(-100%)" : "translateX(-50%)";
};

const Row = ({ index, row }: { index: number; row: OperationSpread }) => {
  const width = Math.max(positionAt(row.spread), MIN_BAR_PERCENT);
  const low = positionAt(row.low);
  const high = positionAt(row.high);
  const color = heatAt(logProgress(row.spread, AXIS.min, AXIS.max));
  const delay = index * ROW_STAGGER_MS;
  const uncertainty = Math.round(((row.high - row.low) / 2 / row.spread) * 100);

  return (
    <li
      className={cn(
        ROW_GRID,
        "gap-y-2 border-b border-dotted py-2.5 transition-colors md:h-12.5 md:gap-y-0 md:py-0",
        "hover:bg-[color-mix(in_oklab,var(--row-c)_6%,transparent)]"
      )}
      style={vars({}, { "--row-c": color })}
    >
      <span className="col-start-1 row-start-1 flex min-w-0 flex-col md:col-auto md:row-auto">
        <span className="text-sm leading-5 md:truncate">
          {row.operation.label}
        </span>
        <span className="text-muted-foreground text-xs leading-snug md:truncate">
          {row.operation.description}
        </span>
      </span>

      <span className="col-span-2 col-start-1 row-start-2 md:col-auto md:col-span-1 md:row-auto">
        <span aria-hidden className="bg-muted/40 relative block h-4.5 w-full">
          {axisTicks.map((tick) => (
            <span
              className="border-border absolute inset-y-0 border-l border-dotted"
              key={tick}
              style={{ left: `${positionAt(tick)}%` }}
            />
          ))}
          <span
            className="bar-grow-x absolute inset-y-0 left-0 block"
            style={vars(
              { backgroundColor: color, width: `${width}%` },
              { "--grow-delay": `${delay}ms` }
            )}
          />
          <span
            className="bar-fade-in absolute inset-0 block"
            style={vars(
              {},
              { "--grow-delay": `${delay + WHISKER_OFFSET_MS}ms` }
            )}
          >
            <span
              className="bg-foreground/70 absolute top-1/2 h-[0.5px] -translate-y-1/2"
              style={{ left: `${low}%`, width: `${Math.max(high - low, 0)}%` }}
            />
            <span
              className="bg-foreground/70 absolute inset-y-0 w-[0.5px]"
              style={{ left: `${low}%` }}
            />
            <span
              className="bg-foreground/70 absolute inset-y-0 w-[0.5px]"
              style={{ left: `${high}%` }}
            />
          </span>
        </span>
      </span>

      <span className="col-start-2 row-start-1 flex flex-col items-end md:col-auto md:row-auto">
        <span className="text-[15px] tabular-nums" style={{ color }}>
          {formatRatio(row.spread)}{" "}
          {uncertainty > 0 && (
            <span className="text-muted-foreground">±{uncertainty}%</span>
          )}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs tabular-nums">
          <RunnerLogo
            className="size-3 shrink-0 rounded-full"
            runnerId={row.fastest}
          />
          {formatMs(row.fastestMs)}
        </span>
      </span>
    </li>
  );
};

export const Operations = () => (
  <section className="flex flex-col gap-4" id="operations">
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">Operations</h2>
      <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
        How far apart the implementations land on each operation: the bar is the
        slowest median divided by the fastest, and the whisker is that ratio at
        its most and least favourable across the samples.
      </p>
    </div>

    <div className="flex flex-col">
      <div
        className={cn(
          ROW_GRID,
          "text-muted-foreground h-9 border-b border-dotted text-xs"
        )}
      >
        <span>Operation</span>
        <span className="hidden md:block" />
        <span className="text-right">Spread</span>
      </div>

      <ul className="flex flex-col">
        {spreads.map((row, index) => (
          <Row index={index} key={row.operation.id} row={row} />
        ))}
      </ul>

      <div aria-hidden className={ROW_GRID}>
        <span className="hidden md:block" />
        <span className="relative col-span-2 block h-8 md:col-auto md:col-span-1">
          {axisTicks.map((tick) => (
            <span
              className="absolute top-0 flex flex-col"
              key={tick}
              style={{
                left: `${positionAt(tick)}%`,
                transform: tickOffset(positionAt(tick)),
              }}
            >
              <span className="border-border h-1.5 border-l border-dotted" />
              <span className="text-muted-foreground pt-1 text-xs whitespace-nowrap tabular-nums">
                {formatRatio(tick)}
              </span>
            </span>
          ))}
        </span>
        <span className="hidden md:block" />
      </div>

      <a
        {...trackAttributes("cta_click", { cta: "full_results" })}
        className="hover:bg-sidebar flex min-h-12.5 items-center justify-between gap-4 border-b border-dotted text-sm transition-colors"
        href="#results"
      >
        <span>See every runner and number</span>
        <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
      </a>
    </div>
  </section>
);
