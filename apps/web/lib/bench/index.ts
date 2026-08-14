import results from "@git-bench/bench/results.json";
import type { StaticImageData } from "next/image";

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

/**
 * The benchmark clones from a `.git` URL, which GitHub redirects for the repo
 * root but 404s for anything under it, so the browser gets it stripped.
 */
export const repoWebUrl = benchData.repo.url.replace(/\.git$/u, "");

export const repoName = repoWebUrl.replace("https://github.com/", "");

export const repoCommitUrl = `${repoWebUrl}/commit/${benchData.repo.sha}`;

export const CHANGE_THRESHOLD_PERCENT = 0.5;

/** How a runner reaches the repository, which is the axis that explains most of the spread. */
export type RunnerBinding = "subprocess" | "in-process";

export interface RunnerMeta {
  readonly label: string;
  /** Fits a phone-width table column, where the full label does not. */
  readonly shortLabel: string;
  readonly language: string;
  readonly binding: RunnerBinding;
  readonly url: string;
  readonly logo: StaticImageData;
  /** CSS custom property holding this runner's identity color. */
  readonly color: string;
}

export const runnerMeta = {
  "git-cli": {
    binding: "subprocess",
    color: "var(--runner-git-cli)",
    label: "git CLI",
    language: "C",
    logo: GitLogo,
    shortLabel: "git",
    url: "https://git-scm.com",
  },
  gitoxide: {
    binding: "subprocess",
    color: "var(--runner-gitoxide)",
    label: "gitoxide",
    language: "Rust",
    logo: GitoxideLogo,
    shortLabel: "gitoxide",
    url: "https://github.com/GitoxideLabs/gitoxide",
  },
  "isomorphic-git": {
    binding: "in-process",
    color: "var(--runner-isomorphic-git)",
    label: "isomorphic-git",
    language: "JavaScript",
    logo: IsomorphicGitLogo,
    shortLabel: "iso-git",
    url: "https://isomorphic-git.org",
  },
  "libgit2-ffi": {
    binding: "in-process",
    color: "var(--runner-libgit2-ffi)",
    label: "bun:ffi + libgit2",
    language: "C",
    logo: Libgit2Logo,
    shortLabel: "libgit2",
    url: "https://libgit2.org",
  },
  ziggit: {
    binding: "subprocess",
    color: "var(--runner-ziggit)",
    label: "ziggit",
    language: "Zig",
    logo: ZiggitLogo,
    shortLabel: "ziggit",
    url: "https://github.com/hdresearch/ziggit",
  },
} as const satisfies Record<RunnerId, RunnerMeta>;

export const findResult = (
  runner: RunnerId,
  operation: OperationId
): BenchResult | undefined =>
  benchData.results.find(
    (r) => r.runner === runner && r.operation === operation
  );
