import { trackAttributes } from "@/lib/analytics";
import { benchData, lastRun, repoCommitUrl, repoName } from "@/lib/bench";

const samples = benchData.results[0]?.samples ?? 0;
const { environment } = benchData;

const REPO = "https://github.com/PunGrumpy/git-bench";

const linkClass =
  "text-foreground underline decoration-1 decoration-dotted decoration-muted-foreground/40 underline-offset-[3px] transition-colors hover:decoration-muted-foreground";

const notes = [
  `Every runner executes in the same Docker image against one clone of ${repoName}: one warmup iteration is discarded, ${samples} timed samples follow, and the median is published.`,
  "Runners are held to the same work contract — status collects untracked but not ignored files, blob reads materialize full contents — and any disagreement with the git CLI baseline is logged as a parity mismatch rather than counted as a win.",
  "The score is the geometric mean of each operation's ratio to the git CLI, so no single slow operation decides the aggregate.",
  "Numbers come from a GitHub Actions runner, so the comparison between runners is the signal and the milliseconds are context.",
];

const environmentRows = [
  { label: "CPU", value: environment?.cpu },
  { label: "Runtime", value: environment?.bun && `Bun ${environment.bun}` },
  { label: "Source", value: environment?.source },
];

export const Methodology = () => (
  <section className="flex flex-col gap-4" id="methodology">
    <h2 className="text-xl font-semibold">Methodology</h2>

    <ul className="text-muted-foreground flex max-w-prose flex-col gap-2 text-sm leading-relaxed">
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>

    {environment && (
      <dl className="border-border/60 grid max-w-prose grid-cols-1 gap-x-6 gap-y-2 border-t border-dotted pt-4 text-sm sm:grid-cols-2">
        {environmentRows.map(({ label, value }) => (
          <div
            className="flex min-w-0 items-baseline justify-between gap-4"
            key={label}
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="truncate font-medium" title={value ?? undefined}>
              {value ?? "Not recorded"}
            </dd>
          </div>
        ))}
      </dl>
    )}

    <p className="text-muted-foreground text-sm">
      Run{" "}
      {lastRun ? (
        <time dateTime={lastRun.iso}>{lastRun.label}</time>
      ) : (
        "not yet recorded"
      )}{" "}
      against{" "}
      <a
        className={linkClass}
        href={repoCommitUrl}
        rel="noreferrer"
        target="_blank"
      >
        <code className="font-mono">{benchData.repo.shortSha}</code>
      </a>
      .{" "}
      {/* Data endpoints, not pages: next/link would hijack them with a client
          navigation. */}
      {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a
        {...trackAttributes("resource_open", { resource: "results_json" })}
        className={linkClass}
        href="/results.json"
      >
        Raw results
      </a>
      , {/* oxlint-disable-next-line next/no-html-link-for-pages */}
      <a
        {...trackAttributes("resource_open", { resource: "schema_json" })}
        className={linkClass}
        href="/schema.json"
      >
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
