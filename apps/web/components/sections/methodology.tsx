import { benchData } from "@/lib/bench";

const samples = benchData.results[0]?.samples ?? 0;

const repoName = benchData.repo.url
  .replace(".git", "")
  .replace("https://github.com/", "");

const REPO = "https://github.com/PunGrumpy/git-bench";

const linkClass =
  "text-foreground underline decoration-1 decoration-dotted decoration-muted-foreground/40 underline-offset-[3px] transition-colors hover:decoration-muted-foreground";

const notes = [
  `Every runner executes in the same Docker image against one clone of ${repoName}: one warmup iteration is discarded, ${samples} timed samples follow, and the median is published.`,
  "Runners are held to the same work contract — status collects untracked but not ignored files, blob reads materialize full contents — and any disagreement with the git CLI baseline is logged as a parity mismatch rather than counted as a win.",
  "The score is the geometric mean of each operation's ratio to the git CLI, so no single slow operation decides the aggregate.",
  "Numbers come from a GitHub Actions runner, so the comparison between runners is the signal and the milliseconds are context.",
];

export const Methodology = () => (
  <section className="flex flex-col gap-4" id="methodology">
    <h2 className="text-xl font-semibold">Methodology</h2>

    <ul className="text-muted-foreground flex max-w-prose flex-col gap-2 text-sm leading-relaxed">
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>

    <p className="text-muted-foreground text-sm">
      Run {benchData.lastBenchmarked ?? "not yet recorded"} against{" "}
      <a
        className={linkClass}
        href={`${benchData.repo.url}/commit/${benchData.repo.sha}`}
        rel="noreferrer"
        target="_blank"
      >
        <code className="font-mono">{benchData.repo.shortSha}</code>
      </a>
      .{" "}
      {/* Data endpoints, not pages: next/link would hijack them with a client
          navigation. */}
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={linkClass} href="/results.json">
        Raw results
      </a>
      , {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a className={linkClass} href="/schema.json">
        config schema
      </a>{" "}
      and{" "}
      <a
        className={linkClass}
        href={`${REPO}#readme`}
        rel="noreferrer"
        target="_blank"
      >
        the source
      </a>
      .
    </p>
  </section>
);
