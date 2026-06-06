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

- **Docker** installed and running on your system.
- **Bun** installed locally (for running the web dashboard).

No local installation of `git`, `gix` (gitoxide), or `libgit2` is required; all benchmark runners are executed inside a Docker container.

## Running

```bash
bun install
bun run bench         # Build Docker image, clone repo, run benchmarks (all inside Docker)
bun run dev           # Start the dashboard at http://localhost:3000
```

## Configuration

You can configure the benchmark using `bench.config.json` at the root of the project:

```json
{
  "remote": "https://github.com/vercel/next.js.git",
  "repoDir": ".git-bench-repos/next.js",
  "samples": 5,
  "gixBin": "gix",
  "libgit2Path": null
}
```

Environment overrides can still be passed to customize the execution on the fly:

- `REMOTE`: Clone URL.
- `REPO_DIR`: Path to the cloned repository.
- `SAMPLES`: Samples per operation.

Example:

```bash
SAMPLES=3 REMOTE=https://github.com/another/repo.git bun run bench
```

## Methodology

Each runner runs one warmup iteration, followed by `SAMPLES` timed iterations of each operation. Setup tasks (like opening the repository or loading JS modules) run outside the timed region to avoid skewing the results. The dashboard displays the median time per operation; the underlying JSON also records the mean, min, max, and sample count.

The `libgit2-ffi` runner uses minimal `bun:ffi` bindings in `packages/bench/src/runners/libgit2-ffi.ts`.
