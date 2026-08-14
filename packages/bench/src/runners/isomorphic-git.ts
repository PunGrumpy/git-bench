/* oxlint-disable no-await-in-loop -- Blobs are read one at a time on
   purpose: this runner is being timed, and issuing the reads in parallel
   would measure concurrency rather than the operation. */
import fs from "node:fs";

import type { OperationId, Runner, RunnerContext } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let git: any;

export const isomorphicGitRunner: Runner = {
  id: "isomorphic-git",
  label: "isomorphic-git",
  async run(op: OperationId, ctx: RunnerContext) {
    const { repoDir, blobPaths } = ctx;
    const base = { dir: repoDir, fs };
    switch (op) {
      case "current-branch": {
        return await git.currentBranch({ ...base, fullname: false });
      }
      case "status": {
        return await git.statusMatrix(base);
      }
      case "log-100": {
        return await git.log({ ...base, depth: 100 });
      }
      case "tracked-files": {
        // Without `ref`, listFiles enumerates the INDEX. Passing ref: "HEAD"
        // walked the HEAD tree instead - a different data structure from the
        // index that git-cli (`ls-files`), gitoxide (`index entries`), ziggit
        // and libgit2 all read.
        return await git.listFiles(base);
      }
      case "changed-files": {
        const head = await git.resolveRef({ ...base, ref: "HEAD" });
        const recentCommits = await git.log({ ...base, depth: 2 });
        if (recentCommits.length < 2) {
          throw new Error(
            "changed-files requires a repo with at least two commits"
          );
        }
        const parent = recentCommits[1].oid;
        const a = await git.walk({
          ...base,
          map: async (
            filepath: string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [aEntry, bEntry]: any[]
          ) => {
            if (filepath === ".") {
              return;
            }
            const ao = aEntry ? await aEntry.oid() : null;
            const bo = bEntry ? await bEntry.oid() : null;
            if (ao !== bo) {
              return filepath;
            }
          },
          trees: [git.TREE({ ref: parent }), git.TREE({ ref: head })],
        });
        return a;
      }
      case "read-25-blobs": {
        const head = await git.resolveRef({ ...base, ref: "HEAD" });
        const out: Uint8Array[] = [];
        for (const p of blobPaths) {
          const { blob } = await git.readBlob({
            ...base,
            filepath: p,
            oid: head,
          });
          out.push(blob);
        }
        return out;
      }
      default: {
        const _exhaustive: never = op;
        throw new Error(`Unhandled operation: ${_exhaustive}`);
      }
    }
  },
  async setup() {
    git = await import("isomorphic-git");
  },
};
