import { createCliRunner } from "./cli-runner";
import { GIT_CLI_COMMANDS, gitCliReadBlobArgs } from "./git-cli";

export const ziggitRunner = createCliRunner({
  bin: (ctx) => ctx.ziggitBin ?? "ziggit",
  commands: GIT_CLI_COMMANDS,
  id: "ziggit",
  label: "ziggit",
  prefixArgs: ["--no-succinct"],
  readBlobArgs: gitCliReadBlobArgs,
});
