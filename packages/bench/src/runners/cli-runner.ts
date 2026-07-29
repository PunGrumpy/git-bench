import { execInRepo } from "./exec";
import type { OperationId, Runner, RunnerContext } from "./types";

export type CliOperationId = Exclude<OperationId, "read-25-blobs">;

export interface CliCommand {
  readonly args: (ctx: RunnerContext) => string[];
  readonly parse?: (out: string) => unknown;
}

export interface CliRunnerSpec {
  readonly id: string;
  readonly label: string;
  readonly bin: (ctx: RunnerContext) => string;
  readonly prefixArgs?: readonly string[];
  readonly commands: Record<CliOperationId, CliCommand>;
  readonly readBlobArgs: (path: string) => string[];
}

export const trimmed = (out: string) => out.trim();
export const lines = (out: string) => out.split("\n");

export const createCliRunner = (spec: CliRunnerSpec): Runner => ({
  id: spec.id,
  label: spec.label,
  async run(op: OperationId, ctx: RunnerContext) {
    const exec = (args: string[]) =>
      execInRepo(spec.bin(ctx), ctx.repoDir, [
        ...(spec.prefixArgs ?? []),
        ...args,
      ]);

    if (op === "read-25-blobs") {
      const out: string[] = [];
      for (const p of ctx.blobPaths) {
        out.push(await exec(spec.readBlobArgs(p)));
      }
      return out;
    }

    const command = spec.commands[op];
    const out = await exec(command.args(ctx));
    return command.parse ? command.parse(out) : out;
  },
});
