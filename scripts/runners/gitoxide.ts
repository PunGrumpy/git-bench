import { spawn } from "node:child_process";

import type { OperationId, Runner, RunnerContext } from "./types";

const GIX = process.env.GIX_BIN ?? "gix";

const run = (cwd: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const proc = spawn(GIX, args, { cwd });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`gix ${args.join(" ")} exited ${code}: ${stderr}`));
      }
    });
  });

export const gitoxideRunner: Runner = {
  id: "gitoxide",
  label: "gitoxide",
  async run(op: OperationId, ctx: RunnerContext) {
    const { repoDir, blobPaths } = ctx;
    switch (op) {
      case "current-branch": {
        return (await run(repoDir, ["branch", "list"])).trim();
      }
      case "status": {
        return await run(repoDir, ["status"]);
      }
      case "log-100": {
        return (
          await run(repoDir, ["revision", "list", "HEAD", "--limit", "100"])
        ).split("\n");
      }
      case "tracked-files": {
        return (await run(repoDir, ["index", "entries"])).split("\n");
      }
      case "changed-files": {
        return (await run(repoDir, ["diff", "tree", "HEAD~1", "HEAD"])).split(
          "\n"
        );
      }
      case "read-25-blobs": {
        const out: string[] = [];
        for (const p of blobPaths) {
          out.push(await run(repoDir, ["cat", `HEAD:${p}`]));
        }
        return out;
      }
    }
  },
};
