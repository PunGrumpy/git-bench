import results from "@git-bench/bench/results.json";
import Image from "next/image";

import type { ChartConfig } from "@/components/ui/chart";
import GitLogo from "@/public/git.png";
import GitoxideLogo from "@/public/gitoxide.png";
import IsomorphicGitLogo from "@/public/isomorphic-git.png";
import Libgit2Logo from "@/public/libgit2.png";
import ZiggitLogo from "@/public/ziggit.png";

export type RunnerId =
  | "git-cli"
  | "libgit2-ffi"
  | "gitoxide"
  | "isomorphic-git"
  | "ziggit";
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
  readonly comingSoon?: boolean;
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
  readonly repo: {
    readonly url: string;
    readonly path: string;
    readonly sha: string;
    readonly shortSha: string;
  };
  readonly operations: readonly BenchOperation[];
  readonly runners: readonly BenchRunner[];
  readonly results: readonly BenchResult[];
}

export const benchData = results as BenchData;

export const BASELINE_RUNNER = "git-cli" as const satisfies RunnerId;

export const CHANGE_THRESHOLD_PERCENT = 0.5;

export const chartConfig = {
  "git-cli": {
    color: "hsl(24 95% 53%)",
    icon: () => (
      <Image alt="" className="size-3.5 rounded-full" src={GitLogo} />
    ),
    label: "git CLI",
  },
  gitoxide: {
    color: "hsl(38 92% 50%)",
    icon: () => (
      <Image alt="" className="size-3.5 rounded-full" src={GitoxideLogo} />
    ),
    label: "gitoxide",
  },
  "isomorphic-git": {
    color: "hsl(142 71% 45%)",
    icon: () => (
      <Image alt="" className="size-3.5 rounded-full" src={IsomorphicGitLogo} />
    ),
    label: "isomorphic-git",
  },
  "libgit2-ffi": {
    color: "hsl(217 91% 60%)",
    icon: () => (
      <Image alt="" className="size-3.5 rounded-full" src={Libgit2Logo} />
    ),
    label: "bun:ffi + libgit2",
  },
  ziggit: {
    color: "hsl(37 94% 54%)",
    icon: () => (
      <Image alt="" className="size-3.5 rounded-full" src={ZiggitLogo} />
    ),
    label: "ziggit",
  },
} satisfies ChartConfig;

export const findResult = (
  runner: RunnerId,
  operation: OperationId
): BenchResult | undefined =>
  benchData.results.find(
    (r) => r.runner === runner && r.operation === operation
  );
