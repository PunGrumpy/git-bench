import type { CliOperationId, CliCommand } from "./cli-runner";
import { createCliRunner, lines, trimmed } from "./cli-runner";

// ziggit reimplements the git CLI surface, so it shares this command table.
export const GIT_CLI_COMMANDS: Record<CliOperationId, CliCommand> = {
  "changed-files": {
    args: () => ["diff", "--name-only", "HEAD~1", "HEAD"],
    parse: lines,
  },
  "current-branch": {
    args: () => ["symbolic-ref", "--short", "HEAD"],
    parse: trimmed,
  },
  "log-100": {
    args: () => ["log", "-n", "100", "--pretty=format:%H %s"],
    parse: lines,
  },
  status: { args: () => ["status", "--porcelain=v1"] },
  "tracked-files": { args: () => ["ls-files"], parse: lines },
};

export const gitCliReadBlobArgs = (path: string) => ["show", `HEAD:${path}`];

export const gitCliRunner = createCliRunner({
  bin: () => "git",
  commands: GIT_CLI_COMMANDS,
  id: "git-cli",
  label: "git CLI",
  readBlobArgs: gitCliReadBlobArgs,
});
