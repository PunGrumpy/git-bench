import { execInRepo } from "./exec";
import type { OperationId, Runner, RunnerContext } from "./types";

export const gitoxideRunner: Runner = {
  id: "gitoxide",
  label: "gitoxide",
  async run(op: OperationId, ctx: RunnerContext) {
    const { repoDir, blobPaths, gixBin } = ctx;
    const run = (args: string[]) => execInRepo(gixBin ?? "gix", repoDir, args);
    switch (op) {
      case "current-branch": {
        const out = await run(["branch", "list"]);
        return out.trim();
      }
      case "status": {
        return await run(["status"]);
      }
      case "log-100": {
        const out = await run(["revision", "list", "HEAD", "--limit", "100"]);
        return out.split("\n");
      }
      case "tracked-files": {
        const out = await run(["index", "entries"]);
        return out.split("\n");
      }
      case "changed-files": {
        const out = await run(["diff", "tree", "HEAD~1", "HEAD"]);
        return out.split("\n");
      }
      case "read-25-blobs": {
        const out: string[] = [];
        for (const p of blobPaths) {
          out.push(await run(["cat", `HEAD:${p}`]));
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
