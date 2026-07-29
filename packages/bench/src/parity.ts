import type { OperationId } from "./runners/types";

/**
 * Reduce a runner's return value to a comparable count.
 *
 * Runners answer in whatever shape is natural for their API - an array of
 * paths, a raw porcelain string, or a bare count from an FFI call - so
 * normalize before comparing. Trailing empty strings are `split("\n")`
 * artifacts, not entries.
 */
export const countOf = (value: unknown): number => {
  if (Array.isArray(value)) {
    let end = value.length;
    while (end > 0 && value[end - 1] === "") {
      end -= 1;
    }
    return end;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value.split("\n").filter((line) => line !== "").length;
  }
  if (value === null || value === undefined) {
    return 0;
  }
  return 1;
};

/**
 * A short, comparable description of what a runner produced for an operation.
 * Deliberately coarse: it catches "you enumerated a different thing", not
 * byte-level differences between tools that legitimately format differently.
 */
export const signatureOf = (op: OperationId, value: unknown): string => {
  switch (op) {
    case "current-branch": {
      return String(value).trim();
    }
    case "status": {
      return `entries:${countOf(value)}`;
    }
    case "read-25-blobs": {
      return `blobs:${countOf(value)}`;
    }
    case "log-100":
    case "tracked-files":
    case "changed-files": {
      return `count:${countOf(value)}`;
    }
    default: {
      const _exhaustive: never = op;
      throw new Error(`Unhandled operation: ${_exhaustive}`);
    }
  }
};

// status is the one operation where runners legitimately disagree at the
// margins (rename detection, submodule handling), so allow a small drift
// there and require an exact match everywhere else.
const STATUS_TOLERANCE = 0.05;

const entryCount = (signature: string) =>
  Number(signature.replace("entries:", ""));

/**
 * True when a runner's signature is close enough to the git-cli baseline that
 * it is measuring the same work.
 */
export const signaturesAgree = (
  op: OperationId,
  baseline: string,
  candidate: string
): boolean => {
  if (baseline === candidate) {
    return true;
  }
  if (op !== "status") {
    return false;
  }
  const a = entryCount(baseline);
  const b = entryCount(candidate);
  if (!(Number.isFinite(a) && Number.isFinite(b))) {
    return false;
  }
  if (a === 0) {
    return b === 0;
  }
  return Math.abs(a - b) / a <= STATUS_TOLERANCE;
};
