# Plan: Implement ziggit Runner

## Context

The git-bench project benchmarks git client implementations. ziggit (hdresearch/ziggit) is a
pure-Zig, git-compatible CLI that has been a "coming soon" placeholder in the dashboard since
commit f6513e3. This plan wires up the actual runner so ziggit participates in benchmark runs
alongside git-cli, libgit2-ffi, gitoxide, and isomorphic-git.

The project now runs **100% inside Docker** (via `scripts/docker-bench.sh` + `Dockerfile`).
Configuration has moved from env vars to `packages/bench/bench.config.json`, and binary paths
are threaded through `RunnerContext` (see `gixBin`, `libgit2Path` pattern in `types.ts`).

Decisions locked in via grill-me:

- Interface: CLI subprocess (same pattern as gitoxide runner)
- Binary: `ziggit`, configurable via `bench.config.json` `bin.ziggit` key
- Succinct mode: disabled via `--no-succinct` global flag on every invocation

## What to change

### 1. `packages/bench/src/runners/types.ts`

Add `ziggitBin` to `RunnerContext`, matching the existing `gixBin` optional field:

```ts
export interface RunnerContext {
  readonly repoDir: string;
  readonly blobPaths: readonly string[];
  readonly gixBin?: string;
  readonly libgit2Path?: string | null;
  readonly ziggitBin?: string; // ← add this
}
```

### 2. Create `packages/bench/src/runners/ziggit.ts`

Mirrors `gitoxide.ts` structure — reads binary from `ctx.ziggitBin`, falls back to `"ziggit"`.
Commands are git-compatible (ziggit is a drop-in), prepend `--no-succinct` to all invocations.

```ts
import { execInRepo } from "./exec";
import type { OperationId, Runner, RunnerContext } from "./types";

export const ziggitRunner: Runner = {
  id: "ziggit",
  label: "ziggit",
  async run(op: OperationId, ctx: RunnerContext) {
    const { repoDir, blobPaths, ziggitBin } = ctx;
    const run = (args: string[]) =>
      execInRepo(ziggitBin ?? "ziggit", repoDir, ["--no-succinct", ...args]);
    switch (op) {
      case "current-branch": {
        const out = await run(["symbolic-ref", "--short", "HEAD"]);
        return out.trim();
      }
      case "status": {
        return await run(["status", "--porcelain=v1"]);
      }
      case "log-100": {
        const out = await run(["log", "-n", "100", "--pretty=format:%H %s"]);
        return out.split("\n");
      }
      case "tracked-files": {
        const out = await run(["ls-files"]);
        return out.split("\n");
      }
      case "changed-files": {
        const out = await run(["diff", "--name-only", "HEAD~1", "HEAD"]);
        return out.split("\n");
      }
      case "read-25-blobs": {
        const out: string[] = [];
        for (const p of blobPaths) {
          out.push(await run(["show", `HEAD:${p}`]));
        }
        return out;
      }
      default: {
        const _exhaustive: never = op;
        throw new Error(`Unhandled operation: ${_exhaustive}`);
      }
    }
  },
};
```

### 3. `packages/bench/src/bench.ts`

Three changes:

- Add import: `import { ziggitRunner } from "./runners/ziggit";`
- Add `ziggitBin: config.bin.ziggit` to the `ctx` object (alongside `gixBin`, `libgit2Path`)
- Append `ziggitRunner` to `RUNNERS` after `isomorphicGitRunner`

### 4. `packages/bench/bench.config.json`

Add `"ziggit"` to the `bin` section:

```json
{
  "bin": {
    "gix": "gix",
    "libgit2": null,
    "ziggit": "ziggit"
  }
}
```

### 5. `Dockerfile`

Install ziggit inside the `base-env` stage. ziggit is a Zig project — install Zig, then build
from source (no pre-built binaries available):

```dockerfile
# Install Zig (latest stable release via GitHub API — no jq needed)
RUN set -eux && \
    ZIG_VERSION=$(curl -fsSL https://api.github.com/repos/ziglang/zig/releases/latest \
      | grep -oP '"tag_name":\s*"\K[^"]+') && \
    curl -fsSL "https://github.com/ziglang/zig/releases/download/${ZIG_VERSION}/zig-linux-x86_64-${ZIG_VERSION}.tar.xz" \
      | tar -xJ -C /usr/local && \
    ln -s "/usr/local/zig-linux-x86_64-${ZIG_VERSION}/zig" /usr/local/bin/zig

# Build ziggit from source (latest commit on main)
RUN git clone --depth 1 https://github.com/hdresearch/ziggit /tmp/ziggit && \
    cd /tmp/ziggit && \
    zig build -Doptimize=ReleaseFast && \
    cp zig-out/bin/ziggit /usr/local/bin/ziggit && \
    rm -rf /tmp/ziggit
```

No extra apt dependencies needed — uses `curl` and `grep` which are already in the base image.

Place this block after the gitoxide install step (before the Bun install) in `base-env`.
Also set `ENV ZIGGIT_BIN="/usr/local/bin/ziggit"` for explicitness (though bench.config.json
`bin.ziggit` drives the actual lookup).

### 6. `packages/bench/results.json`

Update the ziggit entry in the `runners` array:

- Remove `"comingSoon": true`
- Change description: `"Pure Zig implementation (Coming Soon)."` → `"Pure Zig implementation."`

The `results` array regenerates on next `bun run bench`.

### 7. `README.md`

- Remove "(Coming Soon)" from the ziggit row in the runner table
- Add `bin.ziggit` row to the Configuration table with description "Path to the `ziggit` binary"
- No prerequisites section change needed (Docker handles all tooling)

### 8. `apps/web/app/page.tsx`

Replace "(with ziggit coming soon)" parenthetical (lines 70–79) so ziggit appears as a
first-class linked runner alongside the others.

## Files touched

| File                                   | Change                                        |
| -------------------------------------- | --------------------------------------------- |
| `packages/bench/src/runners/types.ts`  | Add `ziggitBin` to `RunnerContext`            |
| `packages/bench/src/runners/ziggit.ts` | **Create** — new runner                       |
| `packages/bench/src/bench.ts`          | Import, add to ctx, push to RUNNERS           |
| `packages/bench/bench.config.json`     | Add `bin.ziggit`                              |
| `Dockerfile`                           | Install Zig + build ziggit in `base-env`      |
| `packages/bench/results.json`          | Remove comingSoon from ziggit runner entry    |
| `README.md`                            | Remove Coming Soon, add `bin.ziggit` config   |
| `apps/web/app/page.tsx`                | Promote ziggit from footnote to listed runner |

## Verification

1. `bun run typecheck` in `packages/bench` — Runner interface satisfied, no TS errors
2. `bun run bench` — builds Docker image (includes ziggit), runs all runners; ziggit rows appear in `results.json` without errors
3. `bun run dev` — dashboard shows ziggit as an active runner (no "coming soon" badge)
4. If ziggit build fails in Docker: runner emits `err` for all operations (same graceful degradation as other runners with missing dependencies)
