import { createCliRunner, lines, trimmed } from "./cli-runner";

export const gitoxideRunner = createCliRunner({
  bin: (ctx) => ctx.gixBin ?? "gix",
  commands: {
    "changed-files": {
      args: () => ["diff", "tree", "HEAD~1", "HEAD"],
      parse: lines,
    },
    "current-branch": { args: () => ["branch", "list"], parse: trimmed },
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
