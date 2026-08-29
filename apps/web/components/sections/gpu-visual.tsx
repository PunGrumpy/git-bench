"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { clock, effect, frameLoop, init, surface } from "vgpu";

import { benchData, runnerMeta } from "@/lib/bench";
import { findScore, formatRatio, runnerScores } from "@/lib/bench/metrics";
import { cn } from "@/lib/utils";

const RUNNER_COLORS = {
  "git-cli": [0.62, 0.19, 0.11],
  gitoxide: [0.65, 0.15, 0.29],
  "isomorphic-git": [0.6, 0.15, 0.49],
  "libgit2-ffi": [0.58, 0.17, 0.83],
  ziggit: [0.56, 0.2, 0.79],
} as const;

const shader = `
struct Params {
  time: f32,
  pointer: vec2f,
  hover: f32,
  selected: f32,
};

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let columns = 6.0;
  let operation = floor(uv.x * columns);
  let localX = fract(uv.x * columns);
  let wave = sin((uv.x * 18.0) + params.time * 0.8) * 0.5 + 0.5;
  let gridY = abs(fract(uv.y * 12.0) - 0.5);
  let grid = 1.0 - min(gridY * 18.0, 1.0);
  let rowGlow = exp(-abs(uv.y - (0.5 + (wave - 0.5) * 0.18)) * 8.0);
  let highlightColumn = smoothstep(0.04, 0.0, abs(localX - 0.5));
  let hoverDistance = distance(uv, params.pointer);
  let hoverGlow = exp(-hoverDistance * 7.0) * params.hover;
  let selectedGlow = exp(-abs(uv.x - params.selected) * 10.0);
  let intensity = clamp(
    (0.08 + (grid * 0.18) + (rowGlow * 0.22) + (highlightColumn * 0.14)) +
    (hoverGlow * 0.16) + (selectedGlow * 0.12),
    0.0,
    1.0
  );
  let base = vec3f(0.24, 0.58, 0.46);
  let accent = vec3f(0.72, 0.82, 0.63);
  return vec4f(mix(base, accent, intensity) * intensity, 1.0);
}
`;

interface VisualPoint {
  readonly color: readonly [number, number, number];
  readonly label: string;
  readonly medianMs: number | null;
  readonly operationId: string;
  readonly operationLabel: string;
  readonly ratio: number | null;
  readonly x: number;
  readonly y: number;
}

const operationScores = findScore("git-cli")?.operations ?? [];
const operationCount = Math.max(operationScores.length, 1);
const operationLabels = new Map(
  benchData.operations.map((operation) => [operation.id, operation.label])
);

const visualPoints: VisualPoint[] = [];
for (const score of runnerScores) {
  for (const operation of score.operations) {
    const operationIndex = operationScores.findIndex(
      ({ operationId }) => operationId === operation.operationId
    );
    if (operationIndex === -1) {
      continue;
    }

    const speed = operation.ratio === null ? null : 1 / operation.ratio;
    visualPoints.push({
      color: RUNNER_COLORS[score.runnerId],
      label: runnerMeta[score.runnerId].label,
      medianMs: operation.medianMs,
      operationId: operation.operationId,
      operationLabel:
        operationLabels.get(operation.operationId) ?? operation.operationId,
      ratio: operation.ratio,
      x: (operationIndex + 0.5) / operationCount,
      y: speed === null ? 0.5 : 0.15 + Math.min(speed, 4) * 0.16,
    });
  }
}

const nearestPoint = (x: number, y: number): VisualPoint | null => {
  let nearest: { distance: number; point: VisualPoint } | null = null;
  for (const point of visualPoints) {
    const distance = (point.x - x) ** 2 + ((point.y - y) * 0.65) ** 2;
    if (!nearest || distance < nearest.distance) {
      nearest = { distance, point };
    }
  }
  return nearest?.point ?? null;
};

export const GpuVisual = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const hoveredPointRef = useRef<VisualPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<VisualPoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<VisualPoint | null>(null);
  const selectedX = useMemo(() => selectedPoint?.x ?? 0.5, [selectedPoint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !navigator.gpu) {
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      try {
        const gpu = await init();
        if (disposed) {
          gpu.dispose();
          return;
        }

        const canvasSurface = surface(gpu, canvas, { dpr: [1, 2] });
        const visualEffect = effect(gpu, shader, {
          set: {
            params: {
              hover: 0,
              pointer: [0.5, 0.5],
              selected: selectedX,
              time: 0,
            },
          },
        });
        const time = clock(gpu);
        const loop = frameLoop(gpu, (frame) => {
          visualEffect.set({
            params: {
              hover: hoveredPointRef.current ? 1 : 0,
              pointer: [pointerRef.current.x, pointerRef.current.y],
              selected: selectedX,
              time: time.time,
            },
          });
          frame.pass(canvasSurface, visualEffect);
        });

        cleanup = () => {
          loop.stop();
          canvasSurface.dispose();
          gpu.dispose();
        };
      } catch {
        canvas.remove();
      }
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [selectedX]);

  const updatePointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const point = nearestPoint(x, y);

    pointerRef.current = { x, y };
    hoveredPointRef.current = point;
    setHoveredPoint(point);
  };

  const selectPoint = (offset: number) => {
    const currentPoint = selectedPoint ?? hoveredPoint;
    const currentIndex = currentPoint ? visualPoints.indexOf(currentPoint) : -1;
    const nextIndex =
      currentIndex === -1 && offset < 0
        ? visualPoints.length - 1
        : (currentIndex + offset + visualPoints.length) % visualPoints.length;

    setSelectedPoint(visualPoints[nextIndex] ?? null);
  };

  const activePoint = hoveredPoint ?? selectedPoint;
  const activeColor = activePoint
    ? `rgb(${activePoint.color.map((channel) => Math.round(channel * 255)).join(" ")})`
    : undefined;

  return (
    <section className="flex flex-col gap-3">
      <div className="relative">
        <canvas
          aria-label="Interactive git benchmark field"
          className="border-border/60 h-48 w-full touch-none rounded-lg border border-dotted"
          height={240}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              selectPoint(-1);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              selectPoint(1);
            }
            if (event.key === "Escape") {
              setSelectedPoint(null);
            }
          }}
          onPointerDown={(event) => {
            updatePointer(event);
            const nextPoint =
              selectedPoint === hoveredPoint ? null : hoveredPoint;
            setSelectedPoint(nextPoint);
          }}
          onPointerLeave={() => setHoveredPoint(null)}
          onPointerMove={updatePointer}
          ref={canvasRef}
          tabIndex={0}
          width={640}
        />

        <div aria-hidden className="pointer-events-none absolute inset-0">
          {visualPoints.map((point) => {
            const pointColor = `rgb(${point.color
              .map((channel) => Math.round(channel * 255))
              .join(" ")})`;
            const isActive = point === activePoint;

            return (
              <span
                className={cn(
                  "absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-transform",
                  isActive
                    ? "border-foreground scale-150"
                    : "border-background/80"
                )}
                key={`${point.label}-${point.operationId}`}
                style={{
                  backgroundColor: pointColor,
                  left: `${point.x * 100}%`,
                  top: `${point.y * 100}%`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="text-muted-foreground">
          Hover or use arrow keys to inspect · click to pin
        </span>
        {activePoint === null ? (
          <span className="text-muted-foreground">
            {visualPoints.length} benchmark measurements
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: activeColor }}
            />
            <span className="font-medium">{activePoint.label}</span>
            <span className="text-muted-foreground">
              {activePoint.operationLabel} ·{" "}
              {activePoint.medianMs === null
                ? "no result"
                : `${Math.round(activePoint.medianMs)} ms`}{" "}
              ·{" "}
              {activePoint.ratio === null
                ? "—"
                : formatRatio(activePoint.ratio)}
            </span>
          </span>
        )}
      </div>
    </section>
  );
};
