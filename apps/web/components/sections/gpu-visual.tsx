"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { effect, frameLoop, init, storage, surface } from "vgpu";
import type { Effect } from "vgpu";

import { runnerMeta } from "@/lib/bench";
import { formatRatio, ratioPosition, runnerScores } from "@/lib/bench/metrics";
import { cn } from "@/lib/utils";

import shader from "./gpu-visual.wgsl";

const RUNNER_COLORS = {
  "git-cli": [0.62, 0.19, 0.11],
  gitoxide: [0.65, 0.15, 0.29],
  "isomorphic-git": [0.6, 0.15, 0.49],
  "libgit2-ffi": [0.58, 0.17, 0.83],
  ziggit: [0.56, 0.2, 0.79],
} as const;

const BAR_HALF_WIDTH = 1 / 11;
const FLOOR_Y = 0.86;
/** Room above the floor line for a bar at the top of the ratio axis. */
const PLOT_HEIGHT = FLOOR_Y - 0.06;
/** Past the end of `bars`, which is how the shader reads "nothing selected". */
const NO_ACTIVE_BAR = 0xff_ff_ff_ff;
const DEFAULT_ACCENT = [0.6, 0.2, 0.1] as const;

interface VisualPoint {
  readonly color: readonly [number, number, number];
  readonly label: string;
  readonly ratio: number | null;
  readonly x: number;
  readonly y: number;
}

/**
 * Bar top on the same log ratio axis the operation charts use. A linear scale
 * cannot hold this data: the runners span four decades, so anything past a few
 * multiples of `git` flattens into one indistinguishable height.
 */
const barTop = (ratio: number | null) =>
  ratio === null
    ? FLOOR_Y
    : FLOOR_Y - (ratioPosition(ratio) / 100) * PLOT_HEIGHT;

const visualPoints: VisualPoint[] = runnerScores.map((score, index) => ({
  color: RUNNER_COLORS[score.runnerId],
  label: runnerMeta[score.runnerId].label,
  ratio: score.geomean,
  x: (index + 0.5) / runnerScores.length,
  y: barTop(score.geomean),
}));

/** `Bar` is a 32-byte stride: `center`, `top`, then a 16-byte-aligned `color`. */
const BAR_FLOATS = 8;
const BAR_COLOR_OFFSET = 4;

const barData = new Float32Array(visualPoints.length * BAR_FLOATS);
for (const [index, point] of visualPoints.entries()) {
  const offset = index * BAR_FLOATS;
  barData[offset] = point.x;
  barData[offset + 1] = point.y;
  barData.set(point.color, offset + BAR_COLOR_OFFSET);
}

const rgb = (color: readonly number[]) =>
  `rgb(${color.map((channel) => Math.round(channel * 255)).join(" ")})`;

const describeRatio = (ratio: number | null) =>
  ratio === null ? "no result" : `${formatRatio(ratio)} the median of git`;

/** The canvas is decorative; this sentence is what the figure caption reads out. */
const chartSummary = `Median benchmark time relative to git, log scale: ${visualPoints
  .map((point) => `${point.label} ${describeRatio(point.ratio)}`)
  .join("; ")}.`;

const activeParams = (point: VisualPoint | null) => ({
  accent: point?.color ?? DEFAULT_ACCENT,
  activeBar: point ? visualPoints.indexOf(point) : NO_ACTIVE_BAR,
});

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
  const effectRef = useRef<Effect | null>(null);
  const pointerRef = useRef({ hover: 0, x: 0.5, y: 0.5 });
  const activePointRef = useRef<VisualPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<VisualPoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<VisualPoint | null>(null);
  const [webgpuFailed, setWebgpuFailed] = useState(false);

  const activePoint = hoveredPoint ?? selectedPoint;

  useEffect(() => {
    activePointRef.current = activePoint;
    effectRef.current?.set({ params: activeParams(activePoint) });
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

        // WGSL and pipeline failures are delivered here rather than thrown, so
        // without this listener a shader that stops compiling would silently
        // leave the canvas blank instead of falling back.
        const unlisten = gpu.onError(() => setWebgpuFailed(true));

        const canvasSurface = surface(gpu, canvas, { dpr: [1, 2] });
        const bars = storage(gpu, barData.byteLength, "read");
        bars.write(barData);

        const visualEffect = effect(gpu, shader, {
          label: "benchmark-bars",
          set: {
            bars,
            params: {
              ...activeParams(activePointRef.current),
              aspect: canvasSurface.size[0] / canvasSurface.size[1],
              floorY: FLOOR_Y,
              halfWidth: BAR_HALF_WIDTH,
              hover: 0,
              pointer: [0.5, 0.5],
            },
          },
        });
        effectRef.current = visualEffect;

        const unsubscribe = canvasSurface.onResize(({ width, height }) => {
          visualEffect.set({ params: { aspect: width / height } });
        });

        const loop = frameLoop(gpu, (frame) => {
          const pointer = pointerRef.current;

          visualEffect.set({
            params: { hover: pointer.hover, pointer: [pointer.x, pointer.y] },
          });
          frame.pass(canvasSurface, visualEffect);
        });

        cleanup = () => {
          effectRef.current = null;
          unlisten();
          unsubscribe();
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

    pointerRef.current = { hover: 1, x, y };
    setHoveredPoint(point);
    return point;
  };

  const leavePointer = () => {
    pointerRef.current = { ...pointerRef.current, hover: 0 };
    setHoveredPoint(null);
  };

  return (
    <figure className="flex flex-col gap-3">
      <div className="relative h-48">
        <canvas
          aria-hidden
          className="h-full w-full touch-none rounded-lg border border-dotted"
          height={240}
          onPointerDown={(event) => {
            const point = updatePointer(event);
            setSelectedPoint(point === selectedPoint ? null : point);
          }}
          onPointerLeave={leavePointer}
          onPointerMove={updatePointer}
          ref={canvasRef}
          width={640}
        />

        {webgpuFailed ? (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {visualPoints.map((point) => (
              <div
                className="absolute -translate-x-1/2 rounded-t-sm opacity-70"
                key={point.label}
                style={{
                  backgroundColor: rgb(point.color),
                  height: `${(FLOOR_Y - point.y) * 100}%`,
                  left: `${point.x * 100}%`,
                  top: `${point.y * 100}%`,
                  width: `${BAR_HALF_WIDTH * 200}%`,
                }}
              />
            ))}
          </div>
        ) : null}

        {/* Not a pointer target: the canvas already tracks the nearest bar, so
            these exist to give the chart a keyboard and screen reader path. */}
        <div className="pointer-events-none absolute inset-0">
          {visualPoints.map((point) => (
            <button
              aria-label={`${point.label}, ${describeRatio(point.ratio)}`}
              aria-pressed={point === selectedPoint}
              className={cn(
                "absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-transform",
                "focus-visible:outline-foreground focus-visible:outline-2 focus-visible:outline-offset-2",
                point === activePoint
                  ? "border-foreground scale-150"
                  : "border-background/80"
              )}
              key={point.label}
              onBlur={() => setHoveredPoint(null)}
              onClick={() =>
                setSelectedPoint(point === selectedPoint ? null : point)
              }
              onFocus={() => setHoveredPoint(point)}
              style={{
                backgroundColor: rgb(point.color),
                left: `${point.x * 100}%`,
                top: `${point.y * 100}%`,
              }}
              type="button"
            />
          ))}
        </div>
      </div>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="sr-only">{chartSummary}</span>

        <span className="text-muted-foreground">
          Median vs git · log scale · shorter is faster
        </span>

        <span aria-atomic aria-live="polite" className="flex items-center">
          {activePoint === null ? (
            <span className="text-muted-foreground">Select a runner</span>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: rgb(activePoint.color) }}
              />
              <span className="font-medium">{activePoint.label}</span>
              <span className="text-muted-foreground">
                {activePoint.ratio === null
                  ? "—"
                  : formatRatio(activePoint.ratio)}
              </span>
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );
};
