import { describe, expect, it } from "bun:test";

import { stats } from "./stats";

describe("stats", () => {
  it("returns all-zero stats with samples: 0 for empty input", () => {
    expect(stats([])).toEqual({
      maxMs: 0,
      meanMs: 0,
      medianMs: 0,
      minMs: 0,
      samples: 0,
    });
  });

  it("returns the single value for all fields with one sample", () => {
    expect(stats([7])).toEqual({
      maxMs: 7,
      meanMs: 7,
      medianMs: 7,
      minMs: 7,
      samples: 1,
    });
  });

  it("computes the median of an odd-length unsorted input", () => {
    const result = stats([3, 1, 2]);
    expect(result.medianMs).toBe(2);
    expect(result.minMs).toBe(1);
    expect(result.maxMs).toBe(3);
    expect(result.samples).toBe(3);
  });

  it("averages the two middle values for an even-length sorted input", () => {
    const result = stats([1, 2, 3, 4]);
    expect(result.medianMs).toBe(2.5);
  });

  it("averages the two middle values for an even-length unsorted input", () => {
    const result = stats([4, 1, 3, 2]);
    expect(result.medianMs).toBe(2.5);
  });

  it("computes the median for five samples", () => {
    const result = stats([5, 1, 4, 2, 3]);
    expect(result.medianMs).toBe(3);
  });

  it("returns 0 median for all-zero even-length input", () => {
    const result = stats([0, 0]);
    expect(result.medianMs).toBe(0);
  });

  it("does not mutate the input array", () => {
    const input = [4, 1, 3, 2];
    stats(input);
    expect(input).toEqual([4, 1, 3, 2]);
  });
});
