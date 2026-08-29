"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { DRAW_MS, drawCommitGraph, STAGES } from "./commit-graph-draw";

export const CommitGraph = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const redrawRef = useRef<(() => void) | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!(canvas && ctx)) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let frame = 0;
    let started = 0;
    let progress = reduceMotion ? 1 : 0;
    let width = 0;
    let height = 0;

    const render = () => {
      if (width === 0 || height === 0) {
        return;
      }

      // Read at draw time rather than at mount: the tokens follow the theme,
      // and the canvas inherits them like any other element.
      const styles = getComputedStyle(canvas);
      drawCommitGraph(ctx, {
        dpr: window.devicePixelRatio || 1,
        height,
        palette: {
          ink: styles.getPropertyValue("--foreground").trim() || styles.color,
          page: styles.getPropertyValue("--background").trim() || "transparent",
        },
        progress,
        width,
      });
    };

    redrawRef.current = render;

    const tick = (now: number) => {
      started ||= now;
      progress = Math.min((now - started) / DRAW_MS, 1);
      render();
      frame = progress < 1 ? requestAnimationFrame(tick) : 0;
    };

    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (!(box?.width && box.height)) {
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      ({ height, width } = box);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Resizing never replays the draw-in. It starts the loop the first time
      // the canvas has a size, and after that just redraws where the figure is.
      if (frame === 0 && progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        render();
      }
    });

    observer.observe(canvas);

    return () => {
      redrawRef.current = null;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    redrawRef.current?.();
  }, [resolvedTheme]);

  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border border-dotted">
        <canvas
          aria-hidden
          className="block h-40 w-full sm:h-52"
          ref={canvasRef}
        />
      </div>

      <figcaption className="text-muted-foreground text-xs">
        <span className="sr-only">
          A git history drawn in four stages: a single commit, a linear history,
          a branch off it, and the merge that closes the branch.
        </span>

        <ol className="grid grid-cols-4 gap-2">
          {STAGES.map((stage) => (
            <li
              className="flex items-baseline justify-center gap-1.5 tracking-[0.14em] uppercase"
              key={stage.label}
            >
              <span className="tabular-nums opacity-50">{stage.index}</span>
              {stage.label}
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
};
