"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ErrorBar,
  LabelList,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import type { BarShapeProps, XAxisTickContentProps } from "recharts";

import { BenchResultsTable } from "@/components/bench-table";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { benchData, findResult, chartConfig } from "@/lib/bench";
import type { OperationId, RunnerId } from "@/lib/bench";
import { cn, formatMs } from "@/lib/utils";

interface ChartEntry {
  runnerId: RunnerId;
  fill: string;
  medianMs: number;
  minMs: number;
  maxMs: number;
  whisker: [number, number];
  isPenalty: boolean;
}

const formatEntryMedian = (entry: ChartEntry) =>
  entry.isPenalty ? "err" : formatMs(entry.medianMs);

const buildSeries = (operationId: OperationId): ChartEntry[] => {
  const ok = benchData.runners
    .filter((r) => !r.comingSoon)
    .map(({ id }) => findResult(id, operationId))
    .filter((r): r is NonNullable<typeof r> => !!r && !r.error);
  const penaltyMs =
    ok.length === 0 ? 1000 : Math.max(...ok.map((r) => r.medianMs)) * 2;

  return benchData.runners
    .filter((r) => !r.comingSoon)
    .map(({ id: runnerId }) => {
      const result = findResult(runnerId, operationId);
      const fill = chartConfig[runnerId].color;

      if (!result || result.error) {
        return {
          fill,
          isPenalty: true,
          maxMs: penaltyMs,
          medianMs: penaltyMs,
          minMs: penaltyMs,
          runnerId,
          whisker: [0, 0] as [number, number],
        };
      }

      return {
        fill,
        isPenalty: false,
        maxMs: result.maxMs,
        medianMs: result.medianMs,
        minMs: result.minMs,
        runnerId,
        whisker: [
          Math.max(result.medianMs - result.minMs, 0),
          Math.max(result.maxMs - result.medianMs, 0),
        ] as [number, number],
      };
    })
    .toSorted((a, b) => a.medianMs - b.medianMs);
};

const BenchTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartEntry }[];
}) => {
  if (!active || !payload?.[0]) {
    return null;
  }

  const row = payload[0].payload;

  return (
    <div className="rounded-md border border-dotted bg-background px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{chartConfig[row.runnerId].label}</p>
      <p className="text-muted-foreground">
        Median:{" "}
        <span className="font-medium text-foreground">
          {formatEntryMedian(row)}
        </span>
      </p>
      {!row.isPenalty && row.minMs !== row.maxMs && (
        <p className="text-muted-foreground">
          Min–max: {formatMs(row.minMs)} – {formatMs(row.maxMs)}
        </p>
      )}
    </div>
  );
};

const OperationChart = ({ operationId }: { operationId: OperationId }) => {
  const data = buildSeries(operationId);
  const msValues = data.flatMap((p) => [p.medianMs, p.minMs, p.maxMs]);

  return (
    <ChartContainer
      className="aspect-5/4 w-full sm:aspect-2/1"
      config={chartConfig}
    >
      <BarChart data={data} margin={{ bottom: 0, left: 0, right: 0, top: 36 }}>
        <CartesianGrid
          className="stroke-border/40"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          axisLine={false}
          dataKey="runnerId"
          height={50}
          interval={0}
          tick={({ payload, x, y }: XAxisTickContentProps) => {
            const entry = data[payload?.index ?? -1];
            if (
              !entry ||
              !Number.isFinite(Number(x)) ||
              !Number.isFinite(Number(y))
            ) {
              return null;
            }

            const Icon = chartConfig[entry.runnerId].icon;

            return (
              <g transform={`translate(${Number(x)},${Number(y) + 14})`}>
                <foreignObject
                  height={24}
                  style={{ overflow: "visible" }}
                  width={120}
                  x={-60}
                  y={-12}
                >
                  <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                    <Icon />
                    <span className="hidden max-w-22 truncate sm:inline">
                      {chartConfig[entry.runnerId].label}
                    </span>
                  </div>
                </foreignObject>
              </g>
            );
          }}
          tickLine={false}
          type="category"
        />
        <YAxis
          allowDataOverflow
          axisLine={false}
          domain={[
            Math.min(...msValues.map((v) => Math.max(v, 0.001))) * 0.8,
            Math.max(...msValues) * 1.15,
          ]}
          scale="log"
          tick={{ fontSize: 10 }}
          tickFormatter={(ms) => formatMs(ms, true)}
          tickLine={false}
          width={52}
        />
        <ChartTooltip content={<BenchTooltip />} cursor={false} />
        <Bar
          dataKey="medianMs"
          maxBarSize={48}
          radius={[3, 3, 0, 0]}
          shape={(props: BarShapeProps) => (
            <Rectangle {...props} fill={props.payload?.fill ?? props.fill} />
          )}
        >
          <ErrorBar
            dataKey="whisker"
            direction="y"
            opacity={0.5}
            stroke="var(--foreground)"
            strokeWidth={1.5}
            width={6}
          />
          <LabelList
            fontSize={10}
            fontWeight={500}
            offset={12}
            pointerEvents="none"
            position="top"
            valueAccessor={(entry) =>
              formatEntryMedian(entry.payload as ChartEntry)
            }
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
};

export const BenchChart = () => {
  const [operation, setOperation] = useState<OperationId>(
    benchData.operations[0]?.id ?? "status"
  );
  const tabRefs = useRef<Map<OperationId, HTMLButtonElement | null> | null>(
    null
  );
  if (tabRefs.current === null) {
    tabRefs.current = new Map();
  }

  useEffect(() => {
    tabRefs.current?.get(operation)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [operation]);

  return (
    <Tabs
      className="w-full gap-3"
      onValueChange={(value) => setOperation(value as OperationId)}
      value={operation}
    >
      <div className="-mx-4 max-w-full overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
        <TabsList
          className="w-full gap-x-3 justify-between border-b border-dotted bg-transparent p-0"
          variant="line"
        >
          {benchData.operations.map((op) => (
            <TabsTrigger
              className={cn(
                "shrink-0 flex-none px-0 text-sm text-muted-foreground",
                "transition-[color,opacity] duration-150 ease-(--ease-out-strong)",
                "data-active:font-medium data-active:text-foreground",
                "group-data-horizontal/tabs:after:bottom-[-2.5px] group-data-horizontal/tabs:after:h-0.25",
                "group-data-horizontal/tabs:after:ease-(--ease-out-strong)",
                "focus-visible:outline-none focus-visible:ring-0"
              )}
              key={op.id}
              ref={(element) => {
                tabRefs.current?.set(op.id, element);
              }}
              value={op.id}
            >
              {op.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {benchData.operations.map((op) => (
        <TabsContent className="space-y-2" key={op.id} value={op.id}>
          <p className="text-muted-foreground text-xs italic">
            {op.description}
          </p>
          <OperationChart operationId={op.id} />
        </TabsContent>
      ))}

      <BenchResultsTable
        activeOperation={operation}
        onOperationChange={setOperation}
      />
    </Tabs>
  );
};
