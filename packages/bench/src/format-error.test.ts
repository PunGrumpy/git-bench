import { describe, expect, it } from "bun:test";

import {
  formatBenchError,
  sanitizeBenchError,
  toErrorMessage,
} from "./format-error";

const REPO_PATH = ".git-bench-repos/next.js";

describe("toErrorMessage", () => {
  it("returns the message of an Error instance", () => {
    expect(toErrorMessage(new Error("x"))).toBe("x");
  });

  it("returns a plain string unchanged", () => {
    expect(toErrorMessage("plain")).toBe("plain");
  });

  it("stringifies a non-Error, non-string value", () => {
    const value: unknown = undefined;
    expect(toErrorMessage(value)).toBe("undefined");
  });
});

describe("sanitizeBenchError", () => {
  it("strips everything before the isomorphic-git marker", () => {
    const out = sanitizeBenchError(
      "Something failed with this error message: ENOENT: no such file",
      REPO_PATH
    );
    expect(out).toBe("ENOENT: no such file");
  });

  it("strips a Unix absolute path prefix down to the repo path", () => {
    const out = sanitizeBenchError(
      "Error at /home/someuser/work/.git-bench-repos/next.js/refs/heads/main: bad ref",
      REPO_PATH
    );
    expect(out).not.toContain("/home/someuser");
    expect(out).toContain(".git-bench-repos/next.js/refs/heads/main");
  });

  it("strips a Windows drive-letter path prefix down to the repo path", () => {
    const out = sanitizeBenchError(
      "Error at C:\\Users\\someuser\\.git-bench-repos\\next.js\\refs: bad ref",
      REPO_PATH
    );
    expect(out).not.toContain("C:\\Users\\someuser");
    expect(out).toContain(".git-bench-repos/next.js");
  });

  it("does not throw on a repo path containing regex metacharacters", () => {
    const repoPath = "repos/my+repo(1)";
    let out = "";
    expect(() => {
      out = sanitizeBenchError(
        "failed at /tmp/repos/my+repo(1)/refs: oops",
        repoPath
      );
    }).not.toThrow();
    expect(typeof out).toBe("string");
  });

  it("collapses multi-line whitespace into single spaces", () => {
    const out = sanitizeBenchError(
      "line one\nline two\n\n\nline three",
      REPO_PATH
    );
    expect(out).toBe("line one line two line three");
  });

  it("collapses an absolute path down to its basename when it does not contain the repo path", () => {
    const out = sanitizeBenchError(
      "/home/someuser/other/thing.so: cannot open",
      REPO_PATH
    );
    expect(out).toBe("thing.so: cannot open");
  });

  it("does not throw when fed a non-string value", () => {
    let out = "";
    expect(() => {
      out = sanitizeBenchError(undefined as never, REPO_PATH);
    }).not.toThrow();
    expect(typeof out).toBe("string");
  });
});

describe("formatBenchError", () => {
  it("sets detail to null when the summary equals the full detail", () => {
    const result = formatBenchError("short msg.", REPO_PATH);
    expect(result.detail).toBeNull();
    expect(result.summary).toBe("short msg.");
  });

  it("truncates a first sentence longer than 120 chars and ends with an ellipsis", () => {
    const longSentence = `${"A".repeat(150)}.`;
    const result = formatBenchError(longSentence, REPO_PATH);
    expect(result.summary.length).toBeLessThanOrEqual(120);
    expect(result.summary.endsWith("…")).toBe(true);
    expect(result.detail).toBe(longSentence);
  });

  it("concatenates the second sentence when the first is under 80 chars", () => {
    const result = formatBenchError(
      "Short first. Second sentence follows here.",
      REPO_PATH
    );
    expect(result.summary).toBe("Short first. Second sentence follows here.");
    expect(result.detail).toBeNull();
  });
});
