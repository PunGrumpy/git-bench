import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

import { gitCliRunner } from "./runners/git-cli";
import { gitoxideRunner } from "./runners/gitoxide";
import { isomorphicGitRunner } from "./runners/isomorphic-git";
import { libgit2FfiRunner } from "./runners/libgit2-ffi";
import type { OperationId, Runner, RunnerContext } from "./runners/types";

const REPO_DIR = resolve(process.env.REPO_DIR ?? ".git-bench-repos/linux");
const RESULTS_PATH = resolve("lib/bench/results.json");
const SAMPLES = Number(process.env.SAMPLES ?? 5);

const OPERATIONS: OperationId[] = [
  "current-branch",
  "status",
  "log-100",
  "tracked-files",
  "changed-files",
  "read-25-blobs",
];

const RUNNERS: Runner[] = [
  gitCliRunner,
  libgit2FfiRunner,
  gitoxideRunner,
  isomorphicGitRunner,
];

// 25 well-known paths in the linux kernel — stable across recent history.
const BLOB_PATHS: string[] = [
  "MAINTAINERS",
  "README",
  "COPYING",
  "Makefile",
  "Kbuild",
  "Kconfig",
  "CREDITS",
  ".gitignore",
  "init/main.c",
  "init/Kconfig",
  "init/version.c",
  "kernel/sched/core.c",
  "kernel/fork.c",
  "kernel/exit.c",
  "kernel/cpu.c",
  "mm/memory.c",
  "mm/mmap.c",
  "mm/slub.c",
  "fs/namei.c",
  "fs/open.c",
  "fs/read_write.c",
  "net/socket.c",
  "net/core/dev.c",
  "drivers/char/mem.c",
  "include/linux/sched.h",
];

interface Sample {
  runner: string;
  operation: OperationId;
  meanMs: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
  samples: number;
  error?: string;
}

const time = async (fn: () => Promise<unknown>): Promise<number> => {
  const t0 = performance.now();
  await fn();
  return performance.now() - t0;
};

const stats = (samples: number[]) => {
  if (samples.length === 0) {
    return {
      maxMs: 0,
      meanMs: 0,
      medianMs: 0,
      minMs: 0,
      samples: 0,
    };
  }
  const sorted = [...samples].toSorted((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const lastIndex = sorted.length - 1;
  return {
    maxMs: sorted[lastIndex],
    meanMs: sum / sorted.length,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    minMs: sorted[0],
    samples: sorted.length,
  };
};

const main = async () => {
  if (!existsSync(REPO_DIR)) {
    console.error(
      `Repo not found at ${REPO_DIR}. Run scripts/clone-linux.sh first.`
    );
    process.exit(1);
  }
  const ctx: RunnerContext = { blobPaths: BLOB_PATHS, repoDir: REPO_DIR };
  const results: Sample[] = [];

  for (const runner of RUNNERS) {
    console.log(`\n=== ${runner.label} (${runner.id}) ===`);
    try {
      if (runner.setup) {
        await runner.setup(ctx);
      }
    } catch (error) {
      console.error(`  setup failed: ${(error as Error).message}`);
      for (const op of OPERATIONS) {
        results.push({
          error: `setup: ${(error as Error).message}`,
          maxMs: 0,
          meanMs: 0,
          medianMs: 0,
          minMs: 0,
          operation: op,
          runner: runner.id,
          samples: 0,
        });
      }
      continue;
    }

    for (const op of OPERATIONS) {
      try {
        // warmup
        await runner.run(op, ctx);

        const samples: number[] = [];
        for (let i = 0; i < SAMPLES; i += 1) {
          samples.push(
            await time(() => runner.run(op, ctx) as Promise<unknown>)
          );
        }
        const s = stats(samples);
        results.push({ operation: op, runner: runner.id, ...s });
        console.log(
          `  ${op.padEnd(16)} median=${s.medianMs.toFixed(2)}ms mean=${s.meanMs.toFixed(2)}ms n=${s.samples}`
        );
      } catch (error) {
        const msg = (error as Error).message;
        results.push({
          error: msg,
          maxMs: 0,
          meanMs: 0,
          medianMs: 0,
          minMs: 0,
          operation: op,
          runner: runner.id,
          samples: 0,
        });
        console.log(`  ${op.padEnd(16)} ERROR: ${msg}`);
      }
    }

    if (runner.teardown) {
      try {
        await runner.teardown();
      } catch (error) {
        console.error(`  teardown: ${(error as Error).message}`);
      }
    }
  }

  const existing = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));
  const payload = {
    ...existing,
    lastBenchmarked: new Date().toISOString().slice(0, 10),
    results,
  };
  writeFileSync(RESULTS_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nWrote ${results.length} samples to ${RESULTS_PATH}`);
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
