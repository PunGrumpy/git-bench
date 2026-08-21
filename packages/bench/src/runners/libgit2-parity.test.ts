import { afterAll, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { libgit2FfiRunner } from "./libgit2-ffi";
import type { RunnerContext } from "./types";

// A throwaway fixture repo outside the working tree, so the FFI runner is
// exercised against real libgit2 rather than a mock.
const repoDir = mkdtempSync(path.join(tmpdir(), "git-bench-libgit2-"));

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
  writeFileSync(path.join(repoDir, name), contents);

const A_TXT = "hello world\n";
const B_TXT = "second file contents here\n";

git("init", "-q", "-b", "main", ".");
write(".gitignore", "ignored.txt\n");
write("a.txt", A_TXT);
write("b.txt", B_TXT);
git("add", ".gitignore", "a.txt", "b.txt");
commit("first");
write("c.txt", "third\n");
// A zero-byte blob: the content copy must not choke on a length of 0.
write("empty.txt", "");
git("add", "c.txt", "empty.txt");
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

describe.skipIf(!libAvailable)("libgit2-ffi read-25-blobs work parity", () => {
  it("returns one entry per requested blob path", async () => {
    const out = (await libgit2FfiRunner.run("read-25-blobs", ctx)) as number[];
    expect(out).toHaveLength(ctx.blobPaths.length);
  });

  it("copies out byte counts matching the committed file contents", async () => {
    const out = (await libgit2FfiRunner.run("read-25-blobs", ctx)) as number[];
    expect(out).toEqual([Buffer.byteLength(A_TXT), Buffer.byteLength(B_TXT)]);
  });

  it("reports a non-zero length for every non-empty blob", async () => {
    const out = (await libgit2FfiRunner.run("read-25-blobs", ctx)) as number[];
    for (const byteLength of out) {
      expect(byteLength).toBeGreaterThan(0);
    }
  });

  it("handles a zero-byte blob without throwing", async () => {
    const emptyCtx: RunnerContext = { blobPaths: ["empty.txt"], repoDir };
    const out = (await libgit2FfiRunner.run(
      "read-25-blobs",
      emptyCtx
    )) as number[];
    expect(out).toEqual([0]);
  });
});

// `git_reference_shorthand` is the only `FFIType.cstring` return in the
// codebase, and Bun 1.4 changed that type to yield a plain string instead of a
// `CString` pointer wrapper. The runner reads it through `String(...)`, a no-op
// for both shapes.
describe.skipIf(!libAvailable)("libgit2-ffi current-branch work parity", () => {
  it("matches git branch --show-current", async () => {
    const name = await libgit2FfiRunner.run("current-branch", ctx);
    expect(name).toBe(git("branch", "--show-current").trim());
  });

  // Re-reads HEAD rather than handing back a stale pointer freed by the
  // previous call.
  it("follows a branch switch", async () => {
    git("switch", "-q", "-c", "parity-branch");
    try {
      const name = await libgit2FfiRunner.run("current-branch", ctx);
      expect(name).toBe("parity-branch");
    } finally {
      git("switch", "-q", "main");
      git("branch", "-qD", "parity-branch");
    }
  });
});
