import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

import config from "../bench.config.json";
import { sanitizeBenchError } from "./format-error";
import { execInRepo } from "./runners/exec";
import { gitCliRunner } from "./runners/git-cli";
import { gitoxideRunner } from "./runners/gitoxide";
import { isomorphicGitRunner } from "./runners/isomorphic-git";
import { libgit2FfiRunner } from "./runners/libgit2-ffi";
import type { OperationId, Runner, RunnerContext } from "./runners/types";
import { ziggitRunner } from "./runners/ziggit";
import { stats } from "./stats";

const __dirname = import.meta.dirname;

const toBenchError = (message: string) =>
  sanitizeBenchError(message, config.git.repo);

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
  ziggitRunner,
];

const BLOB_PATHS: string[] = [
  "package.json",
  "pnpm-lock.yaml",
  "turbo.json",
  "readme.md",
  "license.md",
  ".gitignore",
  "contributing.md",
  "packages/next/package.json",
  "packages/next/license.md",
  "packages/next/README.md",
  "packages/next/src/server/next.ts",
  "packages/next/src/client/index.tsx",
  "packages/next/src/build/index.ts",
  "packages/next/src/export/index.ts",
  "packages/next/src/lib/constants.ts",
  "packages/next/src/shared/lib/router/router.ts",
  "packages/next/src/compiled/react/package.json",
  "packages/eslint-plugin-next/package.json",
  "packages/eslint-plugin-next/src/index.ts",
  "test/e2e/app-dir/app/app/(rootonly)/dashboard/hello/page.js",
  "test/production/500-page/app-router-only/app/page.tsx",
  "examples/hello-world/package.json",
  "examples/hello-world/app/page.tsx",
  "bench/heavy-npm-deps/package.json",
  "packages/font/package.json",
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

const main = async () => {
  const repoRoot = resolve(__dirname, "..", "..", "..");
  const repoDir = resolve(repoRoot, config.git.repo);
  if (!existsSync(repoDir)) {
    console.error(`Repo not found at ${repoDir}. Run bun bench:clone first.`);
    process.exit(1);
  }
  const head = await execInRepo("git", repoDir, ["rev-parse", "HEAD"]);
  const sha = head.trim();
  const shortSha = sha.slice(0, 7);
  const ctx: RunnerContext = {
    blobPaths: BLOB_PATHS,
    gixBin: config.bin.gix,
    libgit2Path: config.bin.libgit2,
    repoDir,
    ziggitBin: config.bin.ziggit,
  };
  const results: Sample[] = [];

  for (const runner of RUNNERS) {
    console.log(`\n=== ${runner.label} (${runner.id}) ===`);
    try {
      if (runner.setup) {
        await runner.setup(ctx);
      }
    } catch (error) {
      const { message } = error as Error;
      console.error(`  setup failed: ${message}`);
      const setupError = toBenchError(`setup: ${message}`);
      for (const op of OPERATIONS) {
        results.push({
          error: setupError,
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
        for (let i = 0; i < config.bench.samples; i += 1) {
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
          error: toBenchError(msg),
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

  const resultsPath = resolve(__dirname, "..", config.bench.results);
  const existing = JSON.parse(readFileSync(resultsPath, "utf-8"));
  const payload = {
    ...existing,
    lastBenchmarked: new Date().toISOString().slice(0, 10),
    repo: {
      path: config.git.repo,
      sha,
      shortSha,
      url: config.git.remote,
    },
    results,
  };
  writeFileSync(resultsPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nWrote ${results.length} samples to ${resultsPath}`);
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
