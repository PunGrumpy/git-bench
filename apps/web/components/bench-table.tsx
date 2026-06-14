"use client";

import { formatBenchError } from "@git-bench/bench/format-error";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BenchResult, OperationId, RunnerId } from "@/lib/bench";
import {
  BASELINE_RUNNER,
  benchData,
  CHANGE_THRESHOLD_PERCENT,
  findResult,
  chartConfig,
} from "@/lib/bench";
import { cn, formatMs } from "@/lib/utils";

interface BenchResultsTableProps {
  activeOperation: OperationId;
  onOperationChange: (operationId: OperationId) => void;
}

const heatmap = (ms: number, fastest: number, range: number) => {
  if (range <= 0) {
    return "transparent";
  }
  const position = (ms - fastest) / range;
  const opacity = 0.06 + Math.abs(position * 2 - 1) * 0.14;
  return position <= 0.5
    ? `rgba(100, 200, 150, ${opacity})`
    : `rgba(240, 120, 120, ${opacity})`;
};

const changeLabel = (ms: number, baseline: number) => {
  if (baseline <= 0) {
    return null;
  }
  const change = ((ms - baseline) / baseline) * 100;
  if (Math.abs(change) < CHANGE_THRESHOLD_PERCENT) {
    return null;
  }
  return `${change <= 0 ? "\u2193" : "\u2191"}${Math.round(Math.abs(change))}%`;
};

const BenchErrorCell = ({
  error,
  runnerId,
}: {
  error?: string;
  runnerId: RunnerId;
}) => {
  const { detail, summary } = formatBenchError(
    error ?? "No result",
    benchData.repo.path
  );

  return (
    <TableCell className="text-center text-xs">
      <HoverCard closeDelay={80} openDelay={200}>
        <HoverCardTrigger className="cursor-help text-muted-foreground underline decoration-dotted underline-offset-2">
          err
        </HoverCardTrigger>
        <HoverCardContent
          align="center"
          className="t-dropdown w-80 rounded-md border border-dotted bg-popover p-3 text-xs data-open:animate-none data-closed:animate-none"
          sideOffset={6}
          data-origin="bottom-center"
        >
          <p className="mb-2 font-medium">{chartConfig[runnerId].label}</p>
          <p className="text-sm leading-snug text-foreground">{summary}</p>
          {detail && (
            <Collapsible className="mt-2">
              <CollapsibleTrigger className="text-[10px] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground">
                Technical details
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="mt-2 max-h-32 overflow-y-auto text-[10px] leading-snug text-muted-foreground no-scrollbar">
                  {detail}
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}
        </HoverCardContent>
      </HoverCard>
    </TableCell>
  );
};

export const BenchResultsTable = ({
  activeOperation,
  onOperationChange,
}: BenchResultsTableProps) => (
  <div className="border-border/60">
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
        <TableHeader>
          <TableRow className="border-dotted hover:bg-transparent">
            <TableHead className="sticky left-0 z-30 min-w-36 bg-background shadow-[4px_0_8px_-4px_oklch(0_0_0/0.06)] after:pointer-events-none after:absolute dark:shadow-[4px_0_8px_-4px_oklch(0_0_0/0.35)]">
              Operation
            </TableHead>
            {benchData.runners.map(({ id }) => {
              const Icon = chartConfig[id].icon;

              return (
                <TableHead className="min-w-24 text-center" key={id}>
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                    {Icon && <Icon />}
                    <span className="hidden sm:inline">
                      {chartConfig[id].label}
                    </span>
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {benchData.operations.map((operation) => {
            const isActive = operation.id === activeOperation;
            const results = benchData.runners.map(({ id }) => ({
              id,
              result: findResult(id, operation.id),
            }));
            const medians = results
              .map(({ result }) => result)
              .filter((r): r is BenchResult => !!r && !r.error)
              .map((r) => r.medianMs);
            const fastest = medians.length > 0 ? Math.min(...medians) : 0;
            const range =
              medians.length > 0 ? Math.max(...medians) - fastest : 0;
            const baseline = findResult(BASELINE_RUNNER, operation.id);
            const baselineMs =
              baseline && !baseline.error ? baseline.medianMs : null;

            return (
              <TableRow
                className="cursor-pointer border-dotted hover:bg-transparent"
                data-active={isActive || undefined}
                key={operation.id}
                onClick={() => onOperationChange(operation.id)}
              >
                <TableCell
                  className={cn(
                    "sticky left-0 z-20 min-w-36 border-foreground/0 border-dotted border-l bg-background shadow-[4px_0_8px_-4px_oklch(0_0_0/0.06)] after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:border-l after:border-dotted dark:shadow-[4px_0_8px_-4px_oklch(0_0_0/0.35)]",
                    isActive && "border-l-foreground bg-muted"
                  )}
                >
                  <p className={cn("text-sm", isActive && "font-medium")}>
                    {operation.label}
                  </p>
                  <p className="text-muted-foreground text-xs leading-snug">
                    {operation.description}
                  </p>
                </TableCell>
                {results.map(({ id, result }) => {
                  const runner = benchData.runners.find((r) => r.id === id);
                  if (runner?.comingSoon) {
                    return (
                      <TableCell
                        className="text-center text-[11px] text-muted-foreground/40 italic bg-muted/10 font-normal"
                        key={id}
                      >
                        coming soon
                      </TableCell>
                    );
                  }

                  if (!result || result.error) {
                    return (
                      <BenchErrorCell
                        error={result?.error}
                        key={id}
                        runnerId={id}
                      />
                    );
                  }

                  const delta =
                    id === BASELINE_RUNNER || baselineMs === null
                      ? null
                      : changeLabel(result.medianMs, baselineMs);

                  return (
                    <TableCell
                      className="text-center text-xs tabular-nums"
                      key={id}
                      style={{
                        backgroundColor: heatmap(
                          result.medianMs,
                          fastest,
                          range
                        ),
                      }}
                    >
                      <span className="font-medium">
                        {formatMs(result.medianMs)}
                      </span>
                      {delta && (
                        <span
                          className={cn(
                            "mt-0.5 block text-[10px] tracking-tight",
                            delta.startsWith("\u2193")
                              ? "text-emerald-700/65 dark:text-emerald-400/65"
                              : "text-red-700/65 dark:text-red-400/65"
                          )}
                        >
                          {delta}
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
  </div>
);
