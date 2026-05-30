"use client";

import Image from "next/image";
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
import type {
  BarShapeProps,
  LabelProps,
  XAxisTickContentProps,
} from "recharts";

import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { benchData, findResult } from "@/lib/bench";
import type { OperationId, RunnerId } from "@/lib/bench";
import { cn, formatMs } from "@/lib/utils";
import GitLogo from "@/public/git.png";
import GitoxideLogo from "@/public/gitoxide.png";
import IsomorphicGitLogo from "@/public/isomorphic-git.png";
import Libgit2Logo from "@/public/libgit2.png";

const chartConfig = {
  "git-cli": {
    color: "hsl(24 95% 53%)",
    icon: () => (
      <Image alt="" className="size-3.5 rounded-full" src={GitLogo} />
    ),
    label: "git CLI",
  },
  gitoxide: {
    color: "hsl(38 92% 50%)",
    icon: () => (
      <Image alt="" className="size-3.5 rounded-full" src={GitoxideLogo} />
    ),
    label: "gitoxide",
  },
  "isomorphic-git": {
    color: "hsl(142 71% 45%)",
    icon: () => (
      <Image alt="" className="size-3.5 rounded-full" src={IsomorphicGitLogo} />
    ),
    label: "isomorphic-git",
  },
  "libgit2-ffi": {
    color: "hsl(217 91% 60%)",
    icon: () => (
      <Image alt="" className="size-3.5 rounded-full" src={Libgit2Logo} />
    ),
    label: "bun:ffi + libgit2",
  },
} satisfies ChartConfig;

interface ChartEntry {
  runnerId: RunnerId;
  fill: string;
  medianMs: number;
  minMs: number;
  maxMs: number;
  whisker: [number, number];
  isPenalty: boolean;
}

const buildSeries = (operationId: OperationId): ChartEntry[] => {
  const ok = benchData.runners
    .map(({ id }) => findResult(id, operationId))
    .filter((r): r is NonNullable<typeof r> => !!r && !r.error);
  const penaltyMs =
    ok.length === 0 ? 1000 : Math.max(...ok.map((r) => r.medianMs)) * 2;

  return benchData.runners
    .map(({ id: runnerId }) => {
      const result = findResult(runnerId, operationId);

      if (!result || result.error) {
        return {
          fill: chartConfig[runnerId].color,
          isPenalty: true,
          maxMs: penaltyMs,
          medianMs: penaltyMs,
          minMs: penaltyMs,
          runnerId,
          whisker: [0, 0] as [number, number],
        };
      }

      return {
        fill: chartConfig[runnerId].color,
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
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{chartConfig[row.runnerId].label}</p>
      <p className="text-muted-foreground">
        Median:{" "}
        <span className="font-medium text-foreground">
          {row.isPenalty ? "err" : formatMs(row.medianMs)}
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

  return (
    <ChartContainer
      className="aspect-5/4 w-full sm:aspect-2/1"
      config={chartConfig}
    >
      <BarChart data={data} margin={{ bottom: 0, left: 0, right: 0, top: 24 }}>
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
            Math.min(
              ...data
                .flatMap((p) => [p.medianMs, p.minMs, p.maxMs])
                .map((v) => Math.max(v, 0.001))
            ) * 0.8,
            Math.max(...data.flatMap((p) => [p.medianMs, p.minMs, p.maxMs])) *
              1.15,
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
            content={({
              payload,
              width,
              x,
              y,
            }: LabelProps & { payload?: ChartEntry }) =>
              x !== undefined &&
              y !== undefined &&
              width !== undefined &&
              payload ? (
                <text
                  dy={-12}
                  fill={payload.fill}
                  fontSize={10}
                  fontWeight={500}
                  pointerEvents="none"
                  textAnchor="middle"
                  x={Number(x) + Number(width) / 2}
                  y={y}
                >
                  {payload.isPenalty ? "err" : formatMs(payload.medianMs)}
                </text>
              ) : null
            }
            position="top"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
};

export const BenchChart = () => (
  <Tabs
    className="w-full gap-3"
    defaultValue={benchData.operations[0]?.id ?? "status"}
  >
    <TabsList
      className="gap-x-5 gap-y-0.5 border-b bg-transparent p-0"
      variant="line"
    >
      {benchData.operations.map((op) => (
        <TabsTrigger
          className={cn(
            "px-0 text-sm text-muted-foreground transition-colors duration-150 ease-out",
            "data-active:font-medium data-active:text-foreground",
            "group-data-horizontal/tabs:after:bottom-[-2.5px] group-data-horizontal/tabs:after:h-0.25",
            "focus-visible:outline-none focus-visible:ring-0"
          )}
          key={op.id}
          value={op.id}
        >
          {op.label}
        </TabsTrigger>
      ))}
    </TabsList>

    {benchData.operations.map((op) => (
      <TabsContent className="space-y-2" key={op.id} value={op.id}>
        <p className="text-muted-foreground text-xs italic">{op.description}</p>
        <OperationChart operationId={op.id} />
      </TabsContent>
    ))}
  </Tabs>
);
