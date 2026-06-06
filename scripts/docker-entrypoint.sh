#!/usr/bin/env bash

set -euo pipefail

# Parse bench.config.json using bun
if [ -f "bench.config.json" ]; then
  echo "Parsing configuration from bench.config.json..."
  CFG_REMOTE=$(bun -e "try { console.log(require('./bench.config.json').remote || '') } catch(e) {}")
  CFG_REPO_DIR=$(bun -e "try { console.log(require('./bench.config.json').repoDir || '') } catch(e) {}")
  
  if [ -n "$CFG_REMOTE" ]; then
    export REMOTE="$CFG_REMOTE"
  fi
  if [ -n "$CFG_REPO_DIR" ]; then
    # Resolve relative to /app inside container
    export REPO_DIR="/app/$CFG_REPO_DIR"
  fi
fi

echo "Running clone script..."
# Run clone-repo.sh directly using bash
bash packages/bench/scripts/clone-repo.sh

echo "Running benchmarks..."
bun run packages/bench/src/bench.ts

echo "Copying results.json to output volume..."
if [ -d "/output" ]; then
  cp packages/bench/results.json /output/results.json
  # Match the ownership of the host directory to avoid root-owned files on host
  HOST_UID=$(stat -c '%u' /output)
  HOST_GID=$(stat -c '%g' /output)
  chown "$HOST_UID:$HOST_GID" /output/results.json
  echo "results.json successfully copied to host via volume mount."
else
  echo "Warning: /output directory not found. Could not copy results.json to host."
fi
