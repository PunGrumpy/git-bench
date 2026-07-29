#!/usr/bin/env bash

set -euo pipefail

# Find directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Building git-bench Docker image..."
docker build -t git-bench "$ROOT_DIR"

echo "Running benchmarks in Docker container..."
# Mount packages/bench to /output so results.json is copied out
docker run --rm \
  -v "$ROOT_DIR/packages/bench:/output" \
  git-bench

echo "Benchmark run completed successfully!"
