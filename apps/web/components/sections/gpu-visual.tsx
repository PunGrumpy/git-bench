"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { effect, frameLoop, init, surface } from "vgpu";

import { runnerMeta } from "@/lib/bench";
import { findScore, formatRatio, runnerScores } from "@/lib/bench/metrics";
import { cn } from "@/lib/utils";

const RUNNER_COLORS = {
  "git-cli": [0.62, 0.19, 0.11],
  gitoxide: [0.65, 0.15, 0.29],
  "isomorphic-git": [0.6, 0.15, 0.49],
  "libgit2-ffi": [0.58, 0.17, 0.83],
  ziggit: [0.56, 0.2, 0.79],
} as const;

const BAR_WIDTH = 1 / 11;
const FLOOR_Y = 0.86;

const shader = `
struct Params {
  pointer: vec2f,
  hover: f32,
  center: f32,
  ratio: f32,
  color: vec3f,
};

@group(0) @binding(0) var<uniform> params: Params;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let barDistance = abs(uv.x - params.center);
  let barTop = ${FLOOR_Y} - clamp(params.ratio, 0.2, 3.0) * 0.19;
  let inBar = uv.y > barTop && uv.y < ${FLOOR_Y};
  let floorDistance = abs(uv.y - ${FLOOR_Y});
  let floorGlow = exp(-floorDistance * 18.0);
  let pointerDistance = distance(uv, params.pointer);
  let hoverGlow = exp(-pointerDistance * 5.5) * params.hover;
  let edgeGlow = exp(-min(abs(barDistance - ${BAR_WIDTH}), abs(uv.y - barTop)) * 14.0);
  let intensity = clamp(
    (floorGlow * 0.24) + (edgeGlow * 0.2 * inBar) + (hoverGlow * 0.28) + (0.35 * inBar),
    0.0,
    1.0
  );
  let surface = vec3f(0.07, 0.1, 0.09);
  let glow = params.color * 1.35;
  return vec4f(mix(surface, glow, intensity), 1.0);
}
`;

interface VisualPoint {
  readonly color: readonly [number, number, number];
  readonly label: string;
  readonly operation: string;
  readonly ratio: number | null;
  readonly x: number;
  readonly y: number;
}

const operationScores = findScore("git-cli")?.operations ?? [];
const operationCount = Math.max(operationScores.length, 1);

const visualPoints: VisualPoint[] = runnerScores.map((score, index) => ({
  color: RUNNER_COLORS[score.runnerId],
  label: runnerMeta[score.runnerId].label,
  operation: "overall",
  ratio: score.geomean,
  x: (index + 0.5) / runnerScores.length,
  y: FLOOR_Y - Math.min(Math.max(score.geomean ?? 1, 0.2), 3) * 0.19,
}));

const benchmarkPoints: VisualPoint[] = [];
for (const score of runnerScores) {
  for (const operation of score.operations) {
    const operationIndex = operationScores.findIndex(
      ({ operationId }) => operationId === operation.operationId
    );
    if (operationIndex === -1) {
      continue;
    }

    const speed = operation.ratio === null ? null : 1 / operation.ratio;
    benchmarkPoints.push({
      color: RUNNER_COLORS[score.runnerId],
      label: runnerMeta[score.runnerId].label,
      operation: operation.operationId,
      ratio: operation.ratio,
      x: (operationIndex + 0.5) / operationCount,
      y: speed === null ? 0.5 : 0.15 + Math.min(speed, 4) * 0.16,
    });
  }
}

const nearestPoint = (x: number, y: number): VisualPoint | null => {
  let nearest: { distance: number; point: VisualPoint } | null = null;
  for (const point of [...visualPoints, ...benchmarkPoints]) {
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
  const activePointRef = useRef<VisualPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<VisualPoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<VisualPoint | null>(null);
  const [webgpuFailed, setWebgpuFailed] = useState(false);

  const activePoint = hoveredPoint ?? selectedPoint;

  useEffect(() => {
    activePointRef.current = activePoint;
  }, [activePoint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !navigator.gpu) {
      setWebgpuFailed(true);
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
              center: activePointRef.current?.x ?? 0.5,
              color: [
                activePointRef.current?.color[0] ?? 0.6,
                activePointRef.current?.color[1] ?? 0.2,
                activePointRef.current?.color[2] ?? 0.1,
              ],
              hover: 0,
              pointer: [0.5, 0.5],
              ratio: activePointRef.current?.ratio ?? 1,
            },
          },
        });
        const loop = frameLoop(gpu, (frame) => {
          const point = activePointRef.current;

          visualEffect.set({
            params: {
              center: point?.x ?? 0.5,
              color: [
                point?.color[0] ?? 0.6,
                point?.color[1] ?? 0.2,
                point?.color[2] ?? 0.1,
              ],
              hover: hoveredPointRef.current ? 1 : 0,
              pointer: [pointerRef.current.x, pointerRef.current.y],
              ratio: point?.ratio ?? 1,
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
        setWebgpuFailed(true);
      }
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

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

  const activeColor = activePoint
    ? `rgb(${activePoint.color.map((channel) => Math.round(channel * 255)).join(" ")})`
    : undefined;

  return (
    <section className="flex flex-col gap-3">
      <div className="relative">
        <canvas
          aria-hidden
          className="absolute inset-0 h-full w-full"
          height={240}
          ref={canvasRef}
          width={640}
        />

        <canvas
          aria-label="Git benchmark performance"
          className="relative h-48 w-full touch-none rounded-lg border border-dotted"
          height={240}
          style={
            webgpuFailed
              ? {
                  background: `radial-gradient(circle at 50% ${FLOOR_Y * 100}%, ${activeColor ?? "rgb(153 51 26)"}33, transparent 65%)`,
                }
              : undefined
          }
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
                key={`${point.label}-${point.operation}`}
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
        <span className="sr-only">
          Use the left and right arrow keys to inspect runners. Press Escape to
          clear the selection.
        </span>

        <span className="text-muted-foreground">
          Runner score · lower is faster
        </span>

        {activePoint === null ? (
          <span className="text-muted-foreground">
            Select a runner or operation
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: activeColor }}
            />
            <span className="font-medium">{activePoint.label}</span>
            <span className="text-muted-foreground">
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
