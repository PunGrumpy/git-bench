# Git Bench

![The Git Bench dashboard: overall ranking, per-operation spread, and the full results table](https://git-benchmark.vercel.app/preview.png)

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

- **Docker**: installed and running
- **Bun**: installed locally, to run the web dashboard

Docker runs every benchmark runner inside the container, so you do not need `git`, `gix` (gitoxide), or `libgit2` on your machine.

## Running

```bash
bun install
bun run bench         # Build Docker image, clone repo, run benchmarks (all inside Docker)
bun run dev           # Start the dashboard at http://localhost:3000
```

## Configuration

Configure the benchmark in `packages/bench/bench.config.json`:

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

| Key | Description |
| --- | --- |
| `git.remote` | Clone URL for the repository to benchmark |
| `git.repo` | Local path (relative to project root) for the cloned repo |
| `bench.samples` | Number of timed iterations per operation |
| `bench.results` | Output path for results JSON (relative to `packages/bench/`) |
| `bin.gix` | Path to the `gix` (gitoxide) binary |
| `bin.libgit2` | Path to the `libgit2` shared library; `null` skips the runner; omit the key to auto-detect |
| `bin.ziggit` | Path to the `ziggit` binary |

## Methodology

Each runner runs one warmup iteration, followed by `bench.samples` timed iterations of each operation. Setup tasks (like opening the repository or loading JS modules) run outside the timed region to avoid skewing the results. The dashboard displays the median time per operation; the underlying JSON also records the mean, min, max, and sample count.

The dashboard also ranks runners by a single score: it divides each operation by the `git` CLI time, then combines those multiples with a geometric mean. Ratios keep operations that differ by four orders of magnitude comparable, and the geometric mean stops one slow operation from deciding the aggregate on its own. The web app derives the score from `results.json` rather than reading it out of the file.

Every runner meets the same work contract per operation. For example, `status` collects untracked (but not ignored) files, and `read-25-blobs` materializes full blob contents rather than only reading object headers. During warmup, the harness compares each runner's output signature against the `git` CLI baseline and logs any disagreement as a `PARITY MISMATCH` warning, never a failure, so a runner that measures different work shows up instead of scoring well for doing less.

GitHub Actions produced the published numbers inside the Docker container. Absolute times vary with the underlying CPU model, so compare the runners against each other rather than reading the milliseconds as fixed.

The `libgit2-ffi` runner uses minimal `bun:ffi` bindings in `packages/bench/src/runners/libgit2-ffi.ts`.
