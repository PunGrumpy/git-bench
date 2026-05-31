#!/usr/bin/env bash

# Clone torvalds/linux for git-bench. Full clone, ~5 GB.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_REPO_DIR="$SCRIPT_DIR/../../../.git-bench-repos/linux"

REPO_DIR="${REPO_DIR:-$DEFAULT_REPO_DIR}"
REMOTE="${REMOTE:-https://github.com/torvalds/linux.git}"

if [ -d "$REPO_DIR/.git" ]; then
  echo "Repo already exists at $REPO_DIR — fetching latest."
  git -C "$REPO_DIR" fetch --all --tags --prune
  exit 0
fi

mkdir -p "$(dirname "$REPO_DIR")"
echo "Cloning $REMOTE into $REPO_DIR (this will take a while)..."
git clone "$REMOTE" "$REPO_DIR"
echo "Done."
