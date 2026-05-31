export type OperationId =
  | "current-branch"
  | "status"
  | "log-100"
  | "tracked-files"
  | "changed-files"
  | "read-25-blobs";

export interface RunnerContext {
  readonly repoDir: string;
  readonly blobPaths: readonly string[];
}

export interface Runner {
  readonly id: string;
  readonly label: string;
  readonly setup?: (ctx: RunnerContext) => Promise<void>;
  readonly teardown?: () => Promise<void>;
  readonly run: (op: OperationId, ctx: RunnerContext) => Promise<unknown>;
}
