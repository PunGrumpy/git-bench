import { createCliRunner, lines } from "./cli-runner";

// `gix worktree list` prints "<path> <short-oid> [<branch>]" per worktree.
// gitoxide-core's repository::worktree resolves that branch with
// `repo.head_name()`, i.e. from HEAD alone - unlike `gix branch list`, which
// calls `platform.local_branches()` and walks every local ref, doing far more
// work than `git symbolic-ref --short HEAD`. Verified against gix v0.56.0.
// Branch names may contain "/", and paths may contain spaces, so anchor on the
// trailing bracket. The benchmark repo is a fresh single-worktree clone, so the
// first line is ours; the warmup parity check flags it if that ever changes.
const BRANCH_IN_BRACKETS = /\[(.+)\]$/u;

const parseCurrentBranch = (out: string) => {
  const [line] = out.split("\n");
  const match = line ? BRANCH_IN_BRACKETS.exec(line) : null;
  if (!match) {
    throw new Error(
      `gix worktree list: could not read a branch name from ${JSON.stringify(line ?? "")}`
    );
  }
  return match[1];
};

export const gitoxideRunner = createCliRunner({
  bin: (ctx) => ctx.gixBin ?? "gix",
  commands: {
    "changed-files": {
      args: () => ["diff", "tree", "HEAD~1", "HEAD"],
      parse: lines,
    },
    "current-branch": {
      args: () => ["worktree", "list"],
      parse: parseCurrentBranch,
    },
    "log-100": {
      args: () => ["revision", "list", "HEAD", "--limit", "100"],
      parse: lines,
    },
    status: { args: () => ["status"] },
    "tracked-files": { args: () => ["index", "entries"], parse: lines },
  },
  id: "gitoxide",
  label: "gitoxide",
  readBlobArgs: (path) => ["cat", `HEAD:${path}`],
});
