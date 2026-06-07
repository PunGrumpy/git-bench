# Git Bench

![Preview](https://git-benchmark.vercel.app/preview.png)

Benchmarks git client implementations against a clone of [`vercel/next.js`](https://github.com/vercel/next.js):

| Runner           | Implementation description             |
| ---------------- | -------------------------------------- |
| `git-cli`        | Subprocess to system `git`             |
| `libgit2-ffi`    | `bun:ffi` bindings to system `libgit2` |
| `gitoxide`       | `gix` CLI (Rust)                       |
| `isomorphic-git` | Pure JS over `node:fs`                 |
| `ziggit`         | Pure Zig implementation                |

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

You can configure the benchmark using `packages/bench/bench.config.json`:

```json
{
  "git": {
    "remote": "https://github.com/vercel/next.js.git",
    "repo": ".git-bench-repos/next.js"
  },
  "bench": {
    "samples": 5,
    "results": "results.json"
  },
  "bin": {
    "gix": "gix",
    "libgit2": null,
    "ziggit": "ziggit"
  }
}
```

| Key             | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| `git.remote`    | Clone URL for the repository to benchmark                    |
| `git.repo`      | Local path (relative to project root) for the cloned repo    |
| `bench.samples` | Number of timed iterations per operation                     |
| `bench.results` | Output path for results JSON (relative to `packages/bench/`) |
| `bin.gix`       | Path to the `gix` (gitoxide) binary                          |
| `bin.libgit2`   | Path to the `libgit2` shared library, or `null` to skip      |
| `bin.ziggit`    | Path to the `ziggit` binary                                  |

## Methodology

Each runner runs one warmup iteration, followed by `SAMPLES` timed iterations of each operation. Setup tasks (like opening the repository or loading JS modules) run outside the timed region to avoid skewing the results. The dashboard displays the median time per operation; the underlying JSON also records the mean, min, max, and sample count.

The `libgit2-ffi` runner uses minimal `bun:ffi` bindings in `packages/bench/src/runners/libgit2-ffi.ts`.
