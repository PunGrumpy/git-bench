"use client";

import { useEffect, useRef } from "react";
import { clock, effect, frameLoop, init, surface } from "vgpu";

const shader = `
struct FragmentInput {
  @builtin(position) position: vec4f,
};

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
  let uv = input.position.xy / vec2f(640.0, 160.0);
  let wave = sin((uv.x * 12.0) + clock.time * 1.5) * 0.5 + 0.5;
  let grid = abs(fract(uv * vec2f(18.0, 4.0)) - vec2f(0.5));
  let line = 1.0 - min(min(grid.x, grid.y) * 18.0, 1.0);
  let intensity = mix(0.12, 0.55, wave) * line;
  return vec4f(vec3f(0.32, 0.72, 0.51) * intensity, 1.0);
}
`;

export const GpuVisual = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
        const visualEffect = effect(gpu, shader);
        const time = clock(gpu);
        const loop = frameLoop(gpu, (frame) => {
          visualEffect.set({ time: time.time });
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
  }, []);

  return (
    <canvas
      aria-hidden
      className="border-border/60 h-40 w-full rounded-lg border border-dotted"
      height={160}
      ref={canvasRef}
      width={640}
    />
  );
};
