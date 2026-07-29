import { describe, expect, it } from "bun:test";

import { countOf, signaturesAgree, signatureOf } from "./parity";

describe("countOf", () => {
  it('ignores the trailing empty string left by split("\\n")', () => {
    expect(countOf(["a.txt", "b.txt", ""])).toBe(2);
  });

  it("ignores several trailing empty strings", () => {
    expect(countOf(["a.txt", "", ""])).toBe(1);
  });

  it("keeps empty strings that are not trailing", () => {
    expect(countOf(["a.txt", "", "b.txt"])).toBe(3);
  });

  it("counts a fully populated array", () => {
    expect(countOf(["a", "b", "c"])).toBe(3);
  });

  it("returns 0 for an empty array", () => {
    expect(countOf([])).toBe(0);
  });

  it("returns 0 for an array of only empty strings", () => {
    expect(countOf(["", ""])).toBe(0);
  });

  it("passes a numeric count through, as the FFI runner returns", () => {
    expect(countOf(42)).toBe(42);
  });

  it("counts non-empty lines in porcelain text", () => {
    expect(countOf(" M src/a.ts\n?? src/b.ts\n")).toBe(2);
  });

  it("returns 0 for an empty porcelain string", () => {
    expect(countOf("")).toBe(0);
  });

  it("returns 0 for null and undefined", () => {
    const missing: unknown = null;
    expect(countOf(missing)).toBe(0);
  });
});

describe("signatureOf", () => {
  it("trims the current-branch value", () => {
    expect(signatureOf("current-branch", "  main\n")).toBe("main");
  });

  it("labels status signatures with an entry count", () => {
    expect(signatureOf("status", " M a.ts\n?? b.ts\n")).toBe("entries:2");
  });

  it("labels read-25-blobs signatures with a blob count", () => {
    expect(signatureOf("read-25-blobs", [1, 2, 3])).toBe("blobs:3");
  });

  it("labels tracked-files signatures with a plain count", () => {
    expect(signatureOf("tracked-files", ["a", "b", ""])).toBe("count:2");
  });

  it("gives the same signature for a numeric and an array result", () => {
    expect(signatureOf("tracked-files", 2)).toBe(
      signatureOf("tracked-files", ["a", "b", ""])
    );
  });

  it("labels log-100 and changed-files with a plain count", () => {
    expect(signatureOf("log-100", 100)).toBe("count:100");
    expect(signatureOf("changed-files", ["x", ""])).toBe("count:1");
  });
});

describe("signaturesAgree", () => {
  it("accepts identical signatures", () => {
    expect(signaturesAgree("tracked-files", "count:10", "count:10")).toBe(true);
  });

  it("rejects any difference for current-branch", () => {
    expect(signaturesAgree("current-branch", "main", "main\nnext")).toBe(false);
  });

  it("rejects a count difference outside status", () => {
    expect(signaturesAgree("tracked-files", "count:10", "count:11")).toBe(
      false
    );
  });

  it("tolerates a small status drift", () => {
    expect(signaturesAgree("status", "entries:100", "entries:104")).toBe(true);
  });

  it("rejects a status drift beyond 5 percent", () => {
    expect(signaturesAgree("status", "entries:100", "entries:120")).toBe(false);
  });

  it("treats a zero baseline as requiring zero", () => {
    expect(signaturesAgree("status", "entries:0", "entries:0")).toBe(true);
    expect(signaturesAgree("status", "entries:0", "entries:1")).toBe(false);
  });
});
