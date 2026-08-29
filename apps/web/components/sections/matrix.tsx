"use client";

import { formatBenchError } from "@git-bench/bench/format-error";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useState } from "react";

import { RunnerLogo } from "@/components/runner-logo";
import { SegmentedControl } from "@/components/segmented-control";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trackEvent } from "@/lib/analytics";
import {
  BASELINE_RUNNER,
  benchData,
  findResult,
  runnerMeta,
} from "@/lib/bench";
import type {
  BenchOperation,
  BenchResult,
  OperationId,
  RunnerId,
} from "@/lib/bench";
import { formatRatio } from "@/lib/bench/metrics";
import { sfx } from "@/lib/sfx";
import { cn, formatMs } from "@/lib/utils";

type Unit = "ms" | "ratio";

const UNITS = [
  { label: "ms", value: "ms" },
  { label: "×git CLI", value: "ratio" },
] as const satisfies readonly { label: string; value: Unit }[];
type Sort = { runnerId: RunnerId; direction: "asc" | "desc" } | null;

const activeRunners = benchData.runners.filter((runner) => !runner.comingSoon);

/** The unit that is not currently selected, so both are always on screen. */
const secondaryValue = (
  unit: Unit,
  medianMs: number,
  ratio: number | null
): string | null => {
  if (unit === "ratio") {
    return formatMs(medianMs);
  }
  return ratio === null ? null : formatRatio(ratio);
};

const varianceLabel = (result: BenchResult) =>
  result.samples > 0
    ? `${formatMs(result.minMs)}–${formatMs(result.maxMs)}`
    : null;

const parityLabel = (parity: BenchResult["parity"] | undefined) =>
  parity === "mismatch" ? "parity mismatch" : null;

/** Ascending, then descending, then back to the published order. */
const nextSort = (current: Sort, runnerId: RunnerId): Sort => {
  if (current?.runnerId !== runnerId) {
    return { direction: "asc", runnerId };
  }
  return current.direction === "asc" ? { direction: "desc", runnerId } : null;
};

const ariaSort = (sort: Sort, runnerId: RunnerId) => {
  if (sort?.runnerId !== runnerId) {
    return "none";
  }
  return sort.direction === "asc" ? "ascending" : "descending";
};

const allRatios = benchData.operations.flatMap((operation) => {
  const baseline = findResult(BASELINE_RUNNER, operation.id);
  const baseMs = baseline && !baseline.error ? baseline.medianMs : null;
  if (baseMs === null || baseMs <= 0) {
    return [];
  }
  return activeRunners.flatMap(({ id }) => {
    const result = findResult(id, operation.id);
    return result && !result.error ? [result.medianMs / baseMs] : [];
  });
});

const heatCeiling = Math.log10(Math.max(...allRatios, 10));

/**
 * Warmth is how far past the git CLI a cell lands, on the same single-hue ramp
 * the operations list uses. Parity or faster stays untinted, so the colour says
 * "slower than the baseline" and nothing else, and it tops out low enough that
 * the number on top keeps its contrast.
 */
const heatOf = (ratio: number | null) => {
  if (ratio === null || ratio <= 1 || heatCeiling <= 0) {
    return;
  }
  const t = Math.sqrt(Math.min(Math.log10(ratio) / heatCeiling, 1));
  return `color-mix(in oklab, var(--heat-slow) ${Math.round(t * 22)}%, transparent)`;
};

const baselineOf = (operationId: OperationId) => {
  const baseline = findResult(BASELINE_RUNNER, operationId);
  return baseline && !baseline.error ? baseline.medianMs : null;
};

const ErrorCell = ({
  error,
  operationId,
  runnerId,
}: {
  error?: string;
  operationId: OperationId;
  runnerId: RunnerId;
}) => {
  const { detail, summary } = formatBenchError(
    error ?? "No result",
    benchData.repo.path
  );

  return (
    <TableCell className="text-center text-xs">
      <Popover>
        <PopoverTrigger
          className="text-muted-foreground decoration-muted-foreground/60 hover:text-foreground underline decoration-dotted underline-offset-2"
          type="button"
        >
          failed
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className="bg-popover w-80 gap-0 rounded-md border border-dotted p-3 text-xs"
          sideOffset={6}
        >
          <p className="mb-2 font-medium">{runnerMeta[runnerId].label}</p>
          <p className="text-foreground text-sm leading-snug">{summary}</p>
          {detail && (
            <Collapsible
              className="mt-2"
              onOpenChange={(open) => {
                if (open) {
                  trackEvent("result_error_open", {
                    operation: operationId,
                    runner: runnerId,
                  });
                }
              }}
            >
              <CollapsibleTrigger className="text-muted-foreground decoration-muted-foreground/60 hover:text-foreground text-xs underline decoration-dotted underline-offset-2">
                Technical details
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p
                  className="text-muted-foreground mt-2 max-h-32 overflow-y-auto text-xs leading-snug"
                  // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                  tabIndex={0}
                >
                  {detail}
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}
        </PopoverContent>
      </Popover>
    </TableCell>
  );
};

export const Matrix = () => {
  const [unit, setUnit] = useState<Unit>("ms");
  const [sort, setSort] = useState<Sort>(null);

  const toggleSort = (runnerId: RunnerId) => {
    const next = nextSort(sort, runnerId);
    sfx.play("press");
    trackEvent("matrix_sort", {
      direction: next?.direction ?? "none",
      runner: runnerId,
    });
    setSort(next);
  };

  const selectUnit = (next: Unit) => {
    sfx.play("select");
    trackEvent("matrix_unit_change", { unit: next });
    setUnit(next);
  };

  const operations: readonly BenchOperation[] = sort
    ? benchData.operations.toSorted((a, b) => {
        const left = findResult(sort.runnerId, a.id);
        const right = findResult(sort.runnerId, b.id);
        const leftMs = left && !left.error ? left.medianMs : Infinity;
        const rightMs = right && !right.error ? right.medianMs : Infinity;
        return sort.direction === "asc" ? leftMs - rightMs : rightMs - leftMs;
      })
    : benchData.operations;

  return (
    <section className="flex flex-col gap-4" id="results">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Full results</h2>
          <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
            Median time per operation; sort by any runner to find what it
            handles worst.
          </p>
        </div>

        <SegmentedControl
          label="Unit"
          onChange={selectUnit}
          options={UNITS}
          value={unit}
        />
      </div>

      <div className="no-scrollbar relative overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <TableHeader>
            <TableRow className="border-b border-dotted hover:bg-transparent">
              <TableHead className="bg-background sticky left-0 z-30 w-28 min-w-28 border-r border-dotted shadow-[4px_0_8px_-4px_oklch(0_0_0/0.06)] sm:w-44 sm:min-w-44 dark:shadow-[4px_0_8px_-4px_oklch(0_0_0/0.35)]">
                Operation
              </TableHead>
              {activeRunners.map(({ id }) => {
                const isSorted = sort?.runnerId === id;
                const Icon =
                  sort?.direction === "desc" ? ArrowDownIcon : ArrowUpIcon;

                return (
                  <TableHead
                    aria-sort={ariaSort(sort, id)}
                    className="min-w-20 text-center sm:min-w-24"
                    key={id}
                  >
                    <button
                      className={cn(
                        "mx-auto flex items-center justify-center gap-1.5 rounded-sm px-1 py-0.5 transition-colors",
                        isSorted
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => toggleSort(id)}
                      type="button"
                    >
                      <RunnerLogo runnerId={id} />
                      <span className="hidden sm:inline">
                        {runnerMeta[id].label}
                      </span>
                      <span className="sm:hidden">
                        {runnerMeta[id].shortLabel}
                      </span>
                      <Icon
                        aria-hidden
                        className={cn(
                          "size-3",
                          isSorted ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="sr-only">
                        Sort operations by {runnerMeta[id].label}
                      </span>
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {operations.map((operation) => {
              const baselineMs = baselineOf(operation.id);

              return (
                <TableRow
                  className="border-b border-dotted hover:bg-transparent"
                  key={operation.id}
                >
                  <TableCell className="bg-background sticky left-0 z-20 w-28 min-w-28 shadow-[4px_0_8px_-4px_oklch(0_0_0/0.06)] after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:border-l after:border-dotted sm:w-44 sm:min-w-44 dark:shadow-[4px_0_8px_-4px_oklch(0_0_0/0.35)]">
                    <p className="text-sm">{operation.label}</p>
                    <p className="text-muted-foreground hidden text-xs leading-snug sm:block">
                      {operation.description}
                    </p>
                  </TableCell>

                  {activeRunners.map(({ id }) => {
                    const result = findResult(id, operation.id);

                    if (!result || result.error) {
                      return (
                        <ErrorCell
                          error={result?.error}
                          key={id}
                          operationId={operation.id}
                          runnerId={id}
                        />
                      );
                    }

                    const ratio =
                      baselineMs === null || baselineMs <= 0
                        ? null
                        : result.medianMs / baselineMs;

                    return (
                      <TableCell
                        className="text-center text-xs tabular-nums"
                        key={id}
                        style={{ backgroundColor: heatOf(ratio) }}
                      >
                        <span className="font-medium">
                          {unit === "ms" || ratio === null
                            ? formatMs(result.medianMs)
                            : formatRatio(ratio)}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          {secondaryValue(unit, result.medianMs, ratio)}
                        </span>
                        <span className="text-muted-foreground/80 mt-0.5 block text-[10px]">
                          {varianceLabel(result)}
                        </span>
                        {parityLabel(result.parity) && (
                          <span className="text-foreground/70 mt-0.5 block text-[10px]">
                            {parityLabel(result.parity)}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </table>
      </div>
    </section>
  );
};
