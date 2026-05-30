import results from "./results.json";

export type RunnerId =
  | "git-cli"
  | "libgit2-ffi"
  | "gitoxide"
  | "isomorphic-git";
export type OperationId =
  | "current-branch"
  | "status"
  | "log-100"
  | "tracked-files"
  | "changed-files"
  | "read-25-blobs";

export interface BenchOperation {
  readonly id: OperationId;
  readonly label: string;
  readonly description: string;
}

export interface BenchRunner {
  readonly id: RunnerId;
  readonly label: string;
  readonly description: string;
}

export interface BenchResult {
  readonly runner: RunnerId;
  readonly operation: OperationId;
  readonly meanMs: number;
  readonly medianMs: number;
  readonly minMs: number;
  readonly maxMs: number;
  readonly samples: number;
  readonly error?: string;
}

export interface BenchData {
  readonly lastBenchmarked: string | null;
  readonly repo: { readonly url: string; readonly path: string };
  readonly operations: readonly BenchOperation[];
  readonly runners: readonly BenchRunner[];
  readonly results: readonly BenchResult[];
}

export const benchData = results as BenchData;

export const findResult = (
  runner: RunnerId,
  operation: OperationId
): BenchResult | undefined =>
  benchData.results.find(
    (r) => r.runner === runner && r.operation === operation
  );
