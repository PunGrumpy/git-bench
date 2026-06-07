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
