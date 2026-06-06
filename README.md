# Git Bench

![Preview](https://git-benchmark.vercel.app/preview.png)

Benchmarks git client implementations against a clone of [`vercel/next.js`](https://github.com/vercel/next.js):

| Runner           | Implementation description             |
| ---------------- | -------------------------------------- |
| `git-cli`        | Subprocess to system `git`             |
| `libgit2-ffi`    | `bun:ffi` bindings to system `libgit2` |
| `gitoxide`       | `gix` CLI (Rust)                       |
| `isomorphic-git` | Pure JS over `node:fs`                 |
| `ziggit`         | Pure Zig implementation (Coming Soon)  |

Operations measured:

1. **Current branch**: Resolve `HEAD` to a short branch name.
2. **Status**: Worktree and index status (porcelain).
3. **Log (100)**: Walk the 100 most recent commits from `HEAD`.
4. **Tracked files**: Enumerate all paths tracked in the index.
5. **Changed files**: Name-only diff between `HEAD~1` and `HEAD`.
6. **Read 25 blobs**: Read 25 fixed file blobs at `HEAD` by path.

## Prerequisites

- `git` on `PATH` (used by the `git-cli` runner and the clone script).
- `gix` on `PATH` for the `gitoxide` runner (install via `cargo install gitoxide`).
- `libgit2` shared library installed system-wide for the `libgit2-ffi` runner (e.g., `apt install libgit2-dev` or `brew install libgit2`). Set `GIT_BENCH_LIBGIT2=/path/to/libgit2.so` if auto-detection fails.

If a runner is missing dependencies, its results are reported as `err` to make the missing requirement obvious.

> [!NOTE]
> `bench:clone` repacks into sub-2 GB packfiles so `isomorphic-git` can read the index (it does not support Git's 64-bit pack index format).

## Running

```bash
bun install
bun run bench:clone   # Clone vercel/next.js
bun run bench         # Run benchmarks and write to packages/bench/results.json
bun run dev           # Start the dashboard at http://localhost:3000
```

Environment overrides:

- `REMOTE`: Clone URL (defaults to `https://github.com/vercel/next.js.git`).
- `REPO_DIR`: Path to the cloned repository (defaults to `.git-bench-repos/next.js`).
- `SAMPLES`: Samples per operation (defaults to `5`).
- `GIX_BIN`: `gix` executable path (defaults to `gix` on `PATH`).
- `GIT_BENCH_LIBGIT2`: Explicit path to `libgit2.so` for the FFI runner.

## Methodology

Each runner runs one warmup iteration, followed by `SAMPLES` timed iterations of each operation. Setup tasks (like opening the repository or loading JS modules) run outside the timed region to avoid skewing the results. The dashboard displays the median time per operation; the underlying JSON also records the mean, min, max, and sample count.

The `libgit2-ffi` runner uses minimal `bun:ffi` bindings in `packages/bench/src/runners/libgit2-ffi.ts`.
