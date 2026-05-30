import { Suspense } from "react";

import { Header } from "@/components/sections/header";
import { Results } from "@/components/sections/results";
import { benchData } from "@/lib/bench";

const Home = () => (
  <>
    <Header />

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
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-1 hover:decoration-muted-foreground"
        >
          git CLI
        </a>
        ,{" "}
        <a
          href="https://libgit2.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-1 hover:decoration-muted-foreground"
        >
          libgit2
        </a>{" "}
        via{" "}
        <a
          href="https://bun.sh/docs/api/ffi"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-1 hover:decoration-muted-foreground"
        >
          bun:ffi
        </a>
        ,{" "}
        <a
          href="https://github.com/GitoxideLabs/gitoxide"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-1 hover:decoration-muted-foreground"
        >
          gitoxide
        </a>
        , and{" "}
        <a
          href="https://isomorphic-git.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-1 hover:decoration-muted-foreground"
        >
          isomorphic-git
        </a>
        .
      </p>
      <p>
        The target is a full clone of{" "}
        <a
          href="https://github.com/torvalds/linux"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-1 hover:decoration-muted-foreground"
        >
          torvalds/linux
        </a>{" "}
        — ~5 GB of objects, ~1.5M commits, ~80K tracked files. Each operation is
        timed across multiple samples; the median is reported.
      </p>
      <p>
        Last benchmarked: <em>{benchData.lastBenchmarked ?? "not yet run"}</em>.{" "}
        <a
          href="https://github.com/PunGrumpy/git-bench#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted-foreground/40 underline-offset-[3px] decoration-1 hover:decoration-muted-foreground"
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
