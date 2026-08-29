#!/usr/bin/env bash

set -euo pipefail

# `next build` never validates WGSL — neither the Turbopack path nor the webpack
# loader — so an invalid shader ships as a blank canvas with a clean build log.
# This is the gate: `vgpu check` resolves the same import graph the loader does
# and compiles the result against a real WebGPU device.
#
# Needs a Vulkan loader on the machine. `bun x vgpu doctor` names the exact
# packages when one is missing, and `bun x vgpu install-software-renderer`
# supplies a CPU driver for machines without a GPU.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# Tracked files only, which keeps node_modules out without a prune list.
mapfile -t SHADERS < <(git ls-files '*.wgsl')

if [ ${#SHADERS[@]} -eq 0 ]; then
  echo "No .wgsl files to check."
  exit 0
fi

for shader in "${SHADERS[@]}"; do
  echo "Validating $shader..."
  if ! output="$(bun x vgpu check "$shader" --require-validation)"; then
    echo "$output" >&2
    echo "WGSL validation failed for $shader" >&2
    exit 1
  fi
done

echo "All ${#SHADERS[@]} shader(s) validated."
