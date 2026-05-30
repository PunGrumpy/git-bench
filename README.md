# Git Bench

Benchmarks four git client implementations against a real, full clone of
[`torvalds/linux`](https://github.com/torvalds/linux):

| Runner           | What it is                             |
| ---------------- | -------------------------------------- |
| `git-cli`        | Subprocess to system `git`             |
| `libgit2-ffi`    | `bun:ffi` bindings to system `libgit2` |
| `gitoxide`       | `gix` CLI (Rust)                       |
| `isomorphic-git` | Pure JS over `node:fs`                 |

Operations measured:

1. **Current branch** — resolve `HEAD` to a short branch name.
2. **Status** — porcelain worktree/index status.
3. **Log (100)** — walk the 100 most recent commits from `HEAD`.
4. **Tracked files** — enumerate every path tracked in the index.
5. **Changed files** — name-only diff between `HEAD~1` and `HEAD`.
6. **Read 25 blobs** — read 25 fixed file blobs at `HEAD` by path.

## Prerequisites

- `git` on `PATH` (for the `git-cli` runner and the clone script)
- `gix` on `PATH` for the `gitoxide` runner — `cargo install gitoxide`
- `libgit2` shared library installed system-wide for the `libgit2-ffi` runner
  (e.g. `apt install libgit2-dev`, `brew install libgit2`). Point at it
  explicitly with `GIT_BENCH_LIBGIT2=/path/to/libgit2.so` if auto-detection
  fails.

Runners with missing dependencies are reported as `err` in the results table
rather than skipped, so it's obvious which prerequisite is missing.

> **Note on isomorphic-git:** the linux kernel pack files exceed what
> `isomorphic-git` can read into a single `Buffer` (>2 GB), so most operations
> beyond `current-branch` will fail with a "packfile too large" error on this
> particular repo. This is a real limitation of the pure-JS implementation and
> is itself a benchmark result.

## Running the bench

```bash
bun install
bun run bench:clone   # full clone of torvalds/linux (~5 GB)
bun run bench         # writes data/results.json
bun run dev           # view results at http://localhost:3000
```

Overrides:

- `REPO_DIR` — path to the cloned repo (default `.git-bench-repos/linux`)
- `SAMPLES` — samples per operation (default `5`)
- `GIX_BIN` — `gix` executable (default `gix` on `PATH`)
- `GIT_BENCH_LIBGIT2` — explicit path to `libgit2.so` for the FFI runner

## Methodology

Each runner does one warmup iteration, then `SAMPLES` timed iterations of each
operation. Setup work (opening the repo via libgit2, loading the JS module) is
hoisted out of the timed region so it is not amortized into each sample. The
website shows the median per (runner, operation); the JSON also stores mean,
min, max, and sample count.

The `libgit2-ffi` runner ships with minimal bindings (init, repo open, HEAD
resolution). The remaining operations are intentionally stubbed — extend the
FFI surface in `scripts/runners/libgit2-ffi.ts` to time them.
