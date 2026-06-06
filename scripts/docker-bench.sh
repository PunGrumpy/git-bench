#!/usr/bin/env bash

set -euo pipefail

# Find directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Building git-bench Docker image..."
docker build -t git-bench "$ROOT_DIR"

# Allow forwarding env overrides if specified by the user
ENV_ARGS=()
if [ -n "${SAMPLES:-}" ]; then
  ENV_ARGS+=(-e "SAMPLES=$SAMPLES")
fi
if [ -n "${REMOTE:-}" ]; then
  ENV_ARGS+=(-e "REMOTE=$REMOTE")
fi
if [ -n "${REPO_DIR:-}" ]; then
  ENV_ARGS+=(-e "REPO_DIR=$REPO_DIR")
fi

echo "Running benchmarks in Docker container..."
# Mount packages/bench to /output so results.json is copied out
docker run --rm \
  "${ENV_ARGS[@]}" \
  -v "$ROOT_DIR/packages/bench:/output" \
  git-bench

echo "Benchmark run completed successfully!"
