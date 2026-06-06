"use client";

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

import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { benchData, chartConfig, findResult } from "@/lib/bench";
import type { OperationId, RunnerId } from "@/lib/bench";
import { formatMs } from "@/lib/utils";

interface ChartEntry {
  runnerId: RunnerId;
  fill: string;
  medianMs: number;
  minMs: number;
  maxMs: number;
  whisker: [number, number];
  isPenalty: boolean;
}

const formatEntryMedian = (entry: ChartEntry): string =>
  entry.isPenalty ? "err" : formatMs(entry.medianMs);

const buildSeries = (operationId: OperationId): ChartEntry[] => {
  const activeRunners = benchData.runners.filter(
    (runner) => !runner.comingSoon
  );
  const okMedians = activeRunners.flatMap((runner) => {
    const result = findResult(runner.id, operationId);
    return result && !result.error ? [result.medianMs] : [];
  });
  const penaltyMs = okMedians.length === 0 ? 1000 : Math.max(...okMedians) * 2;

  return activeRunners
    .flatMap(({ id: runnerId }) => {
      const result = findResult(runnerId, operationId);
      const fill = chartConfig[runnerId].color;

      if (!result || result.error) {
        return [
          {
            fill,
            isPenalty: true,
            maxMs: penaltyMs,
            medianMs: penaltyMs,
            minMs: penaltyMs,
            runnerId,
            whisker: [0, 0] as [number, number],
          },
        ];
      }

      return [
        {
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
        },
      ];
    })
    .toSorted((a, b) => a.medianMs - b.medianMs);
};

interface BenchTooltipProps {
  active?: boolean;
  payload?: { payload: ChartEntry }[];
}

const BenchTooltip = ({ active, payload }: BenchTooltipProps) => {
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

interface XAxisTickProps extends Partial<XAxisTickContentProps> {
  data: ChartEntry[];
}

const XAxisTick = ({ payload, x, y, data }: XAxisTickProps) => {
  const entry = data[payload?.index ?? -1];
  if (!entry || !Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
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
};

const BarShape = (props: BarShapeProps) => (
  <Rectangle {...props} fill={props.payload?.fill ?? props.fill} />
);

interface OperationChartProps {
  operationId: OperationId;
}

export const OperationChart = ({ operationId }: OperationChartProps) => {
  const data = buildSeries(operationId);
  const msValues = data.flatMap((p) => [p.medianMs, p.minMs, p.maxMs]);

  return (
    <ChartContainer
      className="aspect-5/4 w-full sm:aspect-2/1"
      initialDimension={{ height: 150, width: 200 }}
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
          tick={<XAxisTick data={data} />}
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
          shape={BarShape}
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
