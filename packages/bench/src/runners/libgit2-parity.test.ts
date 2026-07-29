import { afterAll, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { libgit2FfiRunner } from "./libgit2-ffi";
import type { RunnerContext } from "./types";

// A throwaway fixture repo outside the working tree, so the FFI runner is
// exercised against real libgit2 rather than a mock.
const repoDir = mkdtempSync(join(tmpdir(), "git-bench-libgit2-"));

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repoDir, encoding: "utf-8" });

const commit = (message: string) =>
  git(
    "-c",
    "user.email=test@example.com",
    "-c",
    "user.name=Test",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    message
  );

const write = (name: string, contents: string) =>
  writeFileSync(join(repoDir, name), contents);

const A_TXT = "hello world\n";
const B_TXT = "second file contents here\n";

git("init", "-q", "-b", "main", ".");
write(".gitignore", "ignored.txt\n");
write("a.txt", A_TXT);
write("b.txt", B_TXT);
git("add", ".gitignore", "a.txt", "b.txt");
commit("first");
write("c.txt", "third\n");
git("add", "c.txt");
commit("second");
// One untracked file (git reports it) and one ignored file (git does not).
write("untracked.txt", "untracked\n");
write("ignored.txt", "ignored\n");

const ctx: RunnerContext = { blobPaths: ["a.txt", "b.txt"], repoDir };

let libAvailable = false;
let setupError = "";
try {
  await libgit2FfiRunner.setup?.(ctx);
  libAvailable = true;
} catch (error) {
  setupError = (error as Error).message;
}
if (!libAvailable) {
  console.warn(`Skipping libgit2 parity tests: ${setupError}`);
}

afterAll(async () => {
  if (libAvailable) {
    await libgit2FfiRunner.teardown?.();
  }
  rmSync(repoDir, { force: true, recursive: true });
});

const porcelainLineCount = () =>
  git("status", "--porcelain=v1")
    .split("\n")
    .filter((line) => line !== "").length;

describe.skipIf(!libAvailable)("libgit2-ffi status work parity", () => {
  it("counts the untracked file, which NULL options would have left out", async () => {
    const count = (await libgit2FfiRunner.run("status", ctx)) as number;
    expect(count).toBe(1);
  });

  it("matches the entry count of git status --porcelain=v1", async () => {
    const count = (await libgit2FfiRunner.run("status", ctx)) as number;
    expect(count).toBe(porcelainLineCount());
  });

  it("excludes ignored paths, which git status --porcelain=v1 never prints", async () => {
    // NULL options make libgit2 report ignored.txt as well, giving 2.
    const count = (await libgit2FfiRunner.run("status", ctx)) as number;
    expect(count).toBeLessThan(2);
  });

  it("picks up a newly modified tracked file", async () => {
    write("a.txt", `${A_TXT}modified\n`);
    const count = (await libgit2FfiRunner.run("status", ctx)) as number;
    write("a.txt", A_TXT);
    expect(count).toBe(2);
  });
});
