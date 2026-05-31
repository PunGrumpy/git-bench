import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { OperationId, Runner, RunnerContext } from "./types";

const GIX = process.env.GIX_BIN ?? "gix";

const execFileAsync = promisify(execFile);

const run = async (cwd: string, args: string[]): Promise<string> => {
  const { stdout } = await execFileAsync(GIX, args, { cwd });
  return stdout;
};

export const gitoxideRunner: Runner = {
  id: "gitoxide",
  label: "gitoxide",
  async run(op: OperationId, ctx: RunnerContext) {
    const { repoDir, blobPaths } = ctx;
    switch (op) {
      case "current-branch": {
        const out = await run(repoDir, ["branch", "list"]);
        return out.trim();
      }
      case "status": {
        return await run(repoDir, ["status"]);
      }
      case "log-100": {
        const out = await run(repoDir, [
          "revision",
          "list",
          "HEAD",
          "--limit",
          "100",
        ]);
        return out.split("\n");
      }
      case "tracked-files": {
        const out = await run(repoDir, ["index", "entries"]);
        return out.split("\n");
      }
      case "changed-files": {
        const out = await run(repoDir, ["diff", "tree", "HEAD~1", "HEAD"]);
        return out.split("\n");
      }
      case "read-25-blobs": {
        const out: string[] = [];
        for (const p of blobPaths) {
          out.push(await run(repoDir, ["cat", `HEAD:${p}`]));
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
