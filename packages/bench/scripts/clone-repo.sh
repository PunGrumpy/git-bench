#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="$SCRIPT_DIR/../bench.config.json"

REMOTE=$(bun -e "console.log(require('$CONFIG').git.remote)")
REPO_DIR="$SCRIPT_DIR/../../../$(bun -e "console.log(require('$CONFIG').git.repo)")"

if [ -d "$REPO_DIR/.git" ]; then
  echo "Repo already exists at $REPO_DIR — fetching latest."
  git -C "$REPO_DIR" fetch --all --tags --prune
  exit 0
fi

mkdir -p "$(dirname "$REPO_DIR")"
echo "Cloning $REMOTE into $REPO_DIR (this will take a while)..."
git clone "$REMOTE" "$REPO_DIR"
echo "Repacking into sub-2 GB packs..."
git -C "$REPO_DIR" repack -a -d --max-pack-size=1800m
echo "Done."
