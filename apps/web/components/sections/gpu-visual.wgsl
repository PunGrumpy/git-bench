// One bar per runner, standing on a lit floor line. Geometry arrives already
// scaled: `bars` holds positions in the effect's top-origin uv space, so the
// data-to-pixels mapping stays in TypeScript next to the rest of the charts.

const SURFACE = vec3f(0.07, 0.1, 0.09);
const FLOOR_FALLOFF = 18.0;
const EDGE_FALLOFF = 14.0;
const POINTER_FALLOFF = 4.5;

struct Params {
  pointer: vec2f,
  /// Canvas width over height, so the pointer glow stays round when the canvas
  /// is not square.
  aspect: f32,
  hover: f32,
  floorY: f32,
  halfWidth: f32,
  /// Index of the highlighted bar; out of range when nothing is selected.
  activeBar: u32,
  accent: vec3f,
};

struct Bar {
  center: f32,
  top: f32,
  color: vec3f,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> bars: array<Bar>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let toPointer = (uv - params.pointer) * vec2f(params.aspect, 1.0);
  let pointerGlow =
    exp(-length(toPointer) * POINTER_FALLOFF) * params.hover * 0.28;
  let floorGlow = exp(-abs(uv.y - params.floorY) * FLOOR_FALLOFF) * 0.24;

  // `weight` is the coverage this pixel accumulates and `glow` the same
  // coverage carrying colour, so dividing one by the other blends the bars
  // without any of them washing out.
  var weight = floorGlow + pointerGlow;
  var glow = params.accent * weight;

  for (var i = 0u; i < arrayLength(&bars); i++) {
    let bar = bars[i];
    let toEdge = abs(uv.x - bar.center);
    let inside = f32(
      toEdge < params.halfWidth && uv.y > bar.top && uv.y < params.floorY
    );
    let edge =
      exp(-min(abs(toEdge - params.halfWidth), abs(uv.y - bar.top)) * EDGE_FALLOFF);
    let lift = select(0.0, 0.25, i == params.activeBar);
    let barWeight = inside * (0.35 + lift + edge * 0.2);

    glow += bar.color * barWeight;
    weight += barWeight;
  }

  let lit = glow / max(weight, 0.0001);
  return vec4f(mix(SURFACE, lit * 1.35, clamp(weight, 0.0, 1.0)), 1.0);
}
