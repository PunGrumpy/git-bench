import { describe, expect, it } from "bun:test";

import { selectRunners } from "./bench";
import type { Runner } from "./runners/types";

const makeRunner = (id: string): Runner => ({
  id,
  label: id,
  run: () => Promise.resolve(),
});

const RUNNERS: Runner[] = [
  makeRunner("git-cli"),
  makeRunner("libgit2-ffi"),
  makeRunner("gitoxide"),
];

describe("selectRunners", () => {
  it("filters out the libgit2-ffi runner when libgit2Path is null", () => {
    const selected = selectRunners(RUNNERS, null);
    expect(selected.map((r) => r.id)).toEqual(["git-cli", "gitoxide"]);
  });

  it("keeps the libgit2-ffi runner when libgit2Path is an explicit path", () => {
    const selected = selectRunners(RUNNERS, "/some/path");
    expect(selected.map((r) => r.id)).toEqual([
      "git-cli",
      "libgit2-ffi",
      "gitoxide",
    ]);
  });

  it("keeps the libgit2-ffi runner when libgit2Path is undefined", () => {
    const libgit2Path: string | null | undefined = undefined;
    const selected = selectRunners(RUNNERS, libgit2Path);
    expect(selected.map((r) => r.id)).toEqual([
      "git-cli",
      "libgit2-ffi",
      "gitoxide",
    ]);
  });
});
