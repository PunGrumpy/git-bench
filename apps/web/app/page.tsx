import type { Metadata } from "next";
import { Suspense } from "react";

import { Results } from "@/components/sections/results";
import { benchData, repoSlug } from "@/lib/bench";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description:
    "Benchmarking git client implementations on real-world repository operations.",
  openGraph: { url: "/" },
  title: "Git Bench",
};

const Home = () => (
  <>
    <div className="flex flex-col gap-2">
      <p>
        Benchmarking git client implementations on real-world repository
        operations.
      </p>
      <p>
        {benchData.operations.length} operations (
        {benchData.operations.map((o) => o.label.toLowerCase()).join(", ")})
        executed across {benchData.runners.length} runners:{" "}
        <a
          href="https://git-scm.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-dotted decoration-1 hover:decoration-muted-foreground"
        >
          git CLI
        </a>
        ,{" "}
        <a
          href="https://libgit2.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-dotted decoration-1 hover:decoration-muted-foreground"
        >
          libgit2
        </a>{" "}
        via{" "}
        <a
          href="https://bun.sh/docs/api/ffi"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-dotted decoration-1 hover:decoration-muted-foreground"
        >
          bun:ffi
        </a>
        ,{" "}
        <a
          href="https://github.com/GitoxideLabs/gitoxide"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-dotted decoration-1 hover:decoration-muted-foreground"
        >
          gitoxide
        </a>
        , and{" "}
        <a
          href="https://isomorphic-git.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-dotted decoration-1 hover:decoration-muted-foreground"
        >
          isomorphic-git
        </a>{" "}
        (with{" "}
        <a
          href="https://github.com/hdresearch/ziggit"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-dotted decoration-1 hover:decoration-muted-foreground"
        >
          ziggit
        </a>{" "}
        coming soon).
      </p>
      <p>
        The target is a full clone of{" "}
        <a
          href={benchData.repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-dotted decoration-1 hover:decoration-muted-foreground"
        >
          {repoSlug}
        </a>
        . Each operation is timed across multiple samples; the median is
        reported.
      </p>
      <p>
        Last benchmarked: <em>{benchData.lastBenchmarked ?? "not yet run"}</em>.{" "}
        <a
          href="https://github.com/PunGrumpy/git-bench#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-dotted decoration-1 hover:decoration-muted-foreground"
        >
          Source &amp; methodology
        </a>
        .
      </p>

      <Suspense>
        <Results />
      </Suspense>
    </div>
  </>
);

export default Home;
