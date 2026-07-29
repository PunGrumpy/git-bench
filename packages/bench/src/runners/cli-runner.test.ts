import { describe, expect, it } from "bun:test";

import type { CliCommand, CliOperationId } from "./cli-runner";
import { createCliRunner, lines, trimmed } from "./cli-runner";
import type { RunnerContext } from "./types";

// `echo` writes its argv back to stdout, so the runner's output is a faithful
// record of the argv it assembled — no process mocking required.
const echoCommands: Record<CliOperationId, CliCommand> = {
  "changed-files": { args: () => ["changed"], parse: lines },
  "current-branch": { args: () => ["  main  "], parse: trimmed },
  "log-100": { args: () => ["log"], parse: lines },
  status: { args: () => ["status"] },
  "tracked-files": { args: (ctx) => ["tracked", ctx.repoDir], parse: lines },
};

const makeRunner = (prefixArgs?: readonly string[]) =>
  createCliRunner({
    bin: () => "echo",
    commands: echoCommands,
    id: "fake",
    label: "fake runner",
    prefixArgs,
    readBlobArgs: (path) => ["blob", path],
  });

const ctx: RunnerContext = {
  blobPaths: ["a.txt", "b.txt"],
  repoDir: "/tmp",
};

describe("createCliRunner", () => {
  it("prepends prefixArgs to every operation's argv", async () => {
    const runner = makeRunner(["--no-succinct"]);
    expect(await runner.run("status", ctx)).toBe("--no-succinct status\n");
  });

  it("omits prefix args when the spec declares none", async () => {
    const runner = makeRunner();
    expect(await runner.run("status", ctx)).toBe("status\n");
  });

  it("returns raw stdout when the command has no parse function", async () => {
    const runner = makeRunner();
    const out = await runner.run("status", ctx);
    expect(typeof out).toBe("string");
  });

  it("applies the command's parse function to stdout", async () => {
    const runner = makeRunner();
    expect(await runner.run("current-branch", ctx)).toBe("main");
  });

  it("applies a line-splitting parse function", async () => {
    const runner = makeRunner();
    expect(await runner.run("log-100", ctx)).toEqual(["log", ""]);
  });

  it("passes the runner context to the argv builder", async () => {
    const runner = makeRunner();
    expect(await runner.run("tracked-files", ctx)).toEqual([
      "tracked /tmp",
      "",
    ]);
  });

  it("prepends prefix args ahead of readBlobArgs too", async () => {
    const runner = makeRunner(["--no-succinct"]);
    const out = (await runner.run("read-25-blobs", ctx)) as string[];
    expect(out[0]).toBe("--no-succinct blob a.txt\n");
  });

  it("runs the blob command once per path in ctx.blobPaths", async () => {
    const runner = makeRunner();
    const out = (await runner.run("read-25-blobs", ctx)) as string[];
    expect(out).toEqual(["blob a.txt\n", "blob b.txt\n"]);
  });
});
