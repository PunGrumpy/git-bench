# Plan: Implement ziggit Runner

## Context

The git-bench project benchmarks git client implementations. ziggit (hdresearch/ziggit) is a pure-Zig, git-compatible CLI that has been a "coming soon" placeholder in the dashboard since commit f6513e3. This plan wires up the actual runner so ziggit participates in benchmark runs alongside git-cli, libgit2-ffi, gitoxide, and isomorphic-git.

Decisions locked in via grill-me:

- Interface: CLI subprocess (same pattern as gitoxide)
- Binary: `ziggit`, configurable via `ZIGGIT_BIN` env var
- Succinct mode: disabled via `--no-succinct` global flag on every invocation

## What to change

### 1. Create `packages/bench/src/runners/ziggit.ts`

Mirror the structure of `git-cli.ts` exactly. ziggit is a git drop-in, so commands are identical — just swap the binary and prepend `--no-succinct`.

```ts
import { execInRepo } from "./exec";
import type { OperationId, Runner, RunnerContext } from "./types";

const ZIGGIT = process.env.ZIGGIT_BIN ?? "ziggit";

const run = (cwd: string, args: string[]) =>
  execInRepo(ZIGGIT, cwd, ["--no-succinct", ...args]);

export const ziggitRunner: Runner = {
  id: "ziggit",
  label: "ziggit",
  async run(op: OperationId, ctx: RunnerContext) {
    const { repoDir, blobPaths } = ctx;
    switch (op) {
      case "current-branch": {
        const out = await run(repoDir, ["symbolic-ref", "--short", "HEAD"]);
        return out.trim();
      }
      case "status": {
        return await run(repoDir, ["status", "--porcelain=v1"]);
      }
      case "log-100": {
        const out = await run(repoDir, [
          "log",
          "-n",
          "100",
          "--pretty=format:%H %s",
        ]);
        return out.split("\n");
      }
      case "tracked-files": {
        const out = await run(repoDir, ["ls-files"]);
        return out.split("\n");
      }
      case "changed-files": {
        const out = await run(repoDir, [
          "diff",
          "--name-only",
          "HEAD~1",
          "HEAD",
        ]);
        return out.split("\n");
      }
      case "read-25-blobs": {
        const out: string[] = [];
        for (const p of blobPaths) {
          out.push(await run(repoDir, ["show", `HEAD:${p}`]));
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

### 2. Update `packages/bench/src/bench.ts`

- Add import: `import { ziggitRunner } from "./runners/ziggit";`
- Append `ziggitRunner` to the `RUNNERS` array (after `isomorphicGitRunner`, line 42)

### 3. Update `packages/bench/results.json`

Update the ziggit entry in the `runners` array (lines 63–67):

- Remove `"comingSoon": true`
- Change description from `"Pure Zig implementation (Coming Soon)."` → `"Pure Zig implementation."`

The `results` array will be fully regenerated on the next `bun run bench`.

### 4. Update `README.md`

- Remove "(Coming Soon)" from the ziggit row in the runner table (line 13)
- Add ziggit to the Prerequisites section: `ziggit` on `PATH` for the `ziggit` runner (build from [hdresearch/ziggit](https://github.com/hdresearch/ziggit)). Set `ZIGGIT_BIN=/path/to/ziggit` if needed.
- Add `ZIGGIT_BIN` to the Environment overrides list.

### 5. Update `apps/web/app/page.tsx`

Replace the copy that says "(with ziggit coming soon)" (lines 70–79) so ziggit appears as a first-class runner link alongside the others, not a parenthetical footnote.

## Files touched

| File                                   | Change                                         |
| -------------------------------------- | ---------------------------------------------- |
| `packages/bench/src/runners/ziggit.ts` | **Create** — new runner                        |
| `packages/bench/src/bench.ts`          | Add import + push to RUNNERS                   |
| `packages/bench/results.json`          | Remove comingSoon from ziggit runner entry     |
| `README.md`                            | Remove Coming Soon, add prerequisite + env var |
| `apps/web/app/page.tsx`                | Promote ziggit from footnote to listed runner  |

## Verification

1. `bun run typecheck` in `packages/bench` — confirms Runner interface is satisfied
2. `ZIGGIT_BIN=$(which ziggit) bun run bench` (if ziggit is installed) — ziggit rows appear in results.json without errors
3. `bun run dev` — dashboard shows ziggit as an active runner (no "coming soon" badge)
4. If ziggit is not installed: runner emits `err` for all operations (same graceful degradation as other runners with missing dependencies)
