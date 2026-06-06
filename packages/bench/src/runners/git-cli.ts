import { execInRepo } from "./exec";
import type { OperationId, Runner, RunnerContext } from "./types";

const run = (cwd: string, args: string[]) => execInRepo("git", cwd, args);

export const gitCliRunner: Runner = {
  id: "git-cli",
  label: "git CLI",
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
