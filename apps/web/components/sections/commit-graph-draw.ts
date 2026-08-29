/**
 * A drawn figure, not a chart: four construction stages of a git history in the
 * register of an engineering drawing — hatched margin, dashed centrelines,
 * hairline strokes. The numbers live in the sections below it.
 *
 * Kept apart from the component so it is a plain function over a 2D context:
 * the same call renders in the browser and in a headless canvas.
 */

export const STAGES = [
  { branch: false, index: "01", label: "Commit", merge: false, trunk: 1 },
  { branch: false, index: "02", label: "History", merge: false, trunk: 3 },
  { branch: true, index: "03", label: "Branch", merge: false, trunk: 3 },
  { branch: true, index: "04", label: "Merge", merge: true, trunk: 3 },
] as const;

/** Milliseconds for the whole figure to draw itself in. */
export const DRAW_MS = 1500;

const FRAME_INSET = 18;
const HATCH_STEP = 6;
const NODE_RADIUS = 5;
const MERGE_RADIUS = 7.5;
/** Head start each stage gets over the one before it, in global progress. */
const STAGE_STAGGER = 0.13;

const ALPHA = {
  edge: 0.62,
  frame: 0.32,
  guide: 0.24,
  hatch: 0.16,
  node: 1,
} as const;

type Point = readonly [number, number];

export interface Palette {
  readonly ink: string;
  readonly page: string;
}

export interface DrawOptions {
  readonly dpr: number;
  readonly height: number;
  readonly palette: Palette;
  /** 0 to 1 across the whole figure; 1 is the finished drawing. */
  readonly progress: number;
  readonly width: number;
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

/** How far into its own reveal window `progress` has travelled. */
const phase = (progress: number, start: number, length: number) =>
  clamp01((progress - start) / length);

const easeOut = (t: number) => 1 - (1 - t) ** 3;

const lerp = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/** Half-pixel offset so an axis-aligned hairline lands on one device pixel. */
const snap = (value: number, dpr: number) =>
  Math.round(value * dpr) / dpr + 0.5 / dpr;

const strokeLine = (
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  t: number
) => {
  if (t <= 0) {
    return;
  }
  const [x, y] = lerp(from, to, t);
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(x, y);
  ctx.stroke();
};

/** Sweeps from twelve o'clock, the way a compass draws a circle. */
const strokeArc = (
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  t: number
) => {
  if (t <= 0) {
    return;
  }
  const start = -Math.PI / 2;
  // Never let a full sweep land exactly on its start angle: some 2D backends
  // normalise that to a zero-length arc and draw nothing at all.
  const sweep = Math.min(Math.PI * 2 * t, Math.PI * 2 - 1e-4);
  ctx.beginPath();
  ctx.arc(center[0], center[1], radius, start, start + sweep);
  ctx.stroke();
};

/** de Casteljau split: strokes the [0, t] piece of a cubic. */
const strokeCurve = (
  ctx: CanvasRenderingContext2D,
  points: readonly [Point, Point, Point, Point],
  t: number
) => {
  if (t <= 0) {
    return;
  }
  const [p0, p1, p2, p3] = points;
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const c = lerp(p2, p3, t);
  const d = lerp(a, b, t);
  const e = lerp(b, c, t);
  const f = lerp(d, e, t);

  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.bezierCurveTo(a[0], a[1], d[0], d[1], f[0], f[1]);
  ctx.stroke();
};

/** Filled against the page so an edge passing underneath is knocked out. */
const drawNode = (
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  t: number,
  palette: Palette
) => {
  if (t <= 0) {
    return;
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(center[0], center[1], radius * easeOut(t), 0, Math.PI * 2);
  ctx.fillStyle = palette.page;
  ctx.fill();
  ctx.globalAlpha = ALPHA.node;
  ctx.stroke();
};

const drawHatch = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.rect(
    FRAME_INSET,
    FRAME_INSET,
    width - FRAME_INSET * 2,
    height - FRAME_INSET * 2
  );
  ctx.clip("evenodd");

  ctx.globalAlpha = ALPHA.hatch;
  ctx.beginPath();
  for (let x = -height; x < width + height; x += HATCH_STEP) {
    ctx.moveTo(x, height);
    ctx.lineTo(x + height, 0);
  }
  ctx.stroke();
  ctx.restore();
};

export const drawCommitGraph = (
  ctx: CanvasRenderingContext2D,
  { dpr, height, palette, progress, width }: DrawOptions
) => {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1 / dpr;
  ctx.lineJoin = "round";
  ctx.setLineDash([]);

  drawHatch(ctx, width, height);

  const left = FRAME_INSET;
  const top = FRAME_INSET;
  const innerWidth = width - FRAME_INSET * 2;
  const innerHeight = height - FRAME_INSET * 2;

  ctx.globalAlpha = ALPHA.frame;
  ctx.strokeRect(
    snap(left, dpr),
    snap(top, dpr),
    Math.round(innerWidth),
    Math.round(innerHeight)
  );

  const cellWidth = innerWidth / STAGES.length;
  const centerY = top + innerHeight / 2;
  const radius = Math.min(cellWidth, innerHeight) * 0.38;
  const span = radius * 0.72;
  const branchY = centerY + radius * 0.46;

  for (const [index, stage] of STAGES.entries()) {
    const centerX = left + (index + 0.5) * cellWidth;
    const start = index * STAGE_STAGGER;
    const at = (offset: number, length: number) =>
      phase(progress, start + offset, length);

    ctx.globalAlpha = ALPHA.guide;
    ctx.setLineDash([2, 3]);
    strokeArc(ctx, [centerX, centerY], radius, at(0, 0.2));
    strokeLine(
      ctx,
      [snap(centerX, dpr), top + 4],
      [snap(centerX, dpr), top + innerHeight - 4],
      at(0.05, 0.15)
    );
    strokeLine(
      ctx,
      [centerX - cellWidth / 2 + 4, snap(centerY, dpr)],
      [centerX + cellWidth / 2 - 4, snap(centerY, dpr)],
      at(0.07, 0.15)
    );
    ctx.setLineDash([]);

    const root: Point = [centerX - span, centerY];
    const middle: Point = [centerX, centerY];
    const head: Point = [centerX + span, centerY];
    const sidecar: Point = [centerX, branchY];

    if (stage.trunk === 1) {
      drawNode(ctx, middle, NODE_RADIUS, at(0.18, 0.14), palette);
      continue;
    }

    ctx.globalAlpha = ALPHA.edge;
    strokeLine(ctx, root, middle, at(0.2, 0.12));
    strokeLine(ctx, middle, head, at(0.3, 0.12));

    if (stage.branch) {
      strokeCurve(
        ctx,
        [
          root,
          [root[0] + span * 0.7, centerY],
          [centerX - span * 0.7, branchY],
          sidecar,
        ],
        at(0.34, 0.14)
      );
    }

    if (stage.merge) {
      strokeCurve(
        ctx,
        [
          sidecar,
          [centerX + span * 0.7, branchY],
          [head[0] - span * 0.7, centerY],
          head,
        ],
        at(0.46, 0.14)
      );
    }

    drawNode(ctx, root, NODE_RADIUS, at(0.16, 0.12), palette);
    drawNode(ctx, middle, NODE_RADIUS, at(0.26, 0.12), palette);
    drawNode(
      ctx,
      head,
      stage.merge ? MERGE_RADIUS : NODE_RADIUS,
      at(0.36, 0.12),
      palette
    );

    if (stage.branch) {
      drawNode(ctx, sidecar, NODE_RADIUS, at(0.44, 0.12), palette);
    }
  }

  ctx.globalAlpha = 1;
};
