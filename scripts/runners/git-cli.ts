import { spawn } from "node:child_process";

import type { OperationId, Runner, RunnerContext } from "./types";

const run = (cwd: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const proc = spawn("git", args, { cwd });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`git ${args.join(" ")} exited ${code}: ${stderr}`));
      }
    });
  });

export const gitCliRunner: Runner = {
  id: "git-cli",
  label: "git CLI",
  async run(op: OperationId, ctx: RunnerContext) {
    const { repoDir, blobPaths } = ctx;
    switch (op) {
      case "current-branch": {
        return (await run(repoDir, ["symbolic-ref", "--short", "HEAD"])).trim();
      }
      case "status": {
        return await run(repoDir, ["status", "--porcelain=v1"]);
      }
      case "log-100": {
        return (
          await run(repoDir, ["log", "-n", "100", "--pretty=format:%H %s"])
        ).split("\n");
      }
      case "tracked-files": {
        return (await run(repoDir, ["ls-files"])).split("\n");
      }
      case "changed-files": {
        return (
          await run(repoDir, ["diff", "--name-only", "HEAD~1", "HEAD"])
        ).split("\n");
      }
      case "read-25-blobs": {
        const out: string[] = [];
        for (const p of blobPaths) {
          out.push(await run(repoDir, ["show", `HEAD:${p}`]));
        }
        return out;
      }
    }
  },
};
