import type { Metadata } from "next";

import { CommitGraph } from "@/components/sections/commit-graph";
import { Frontier } from "@/components/sections/frontier";
import { Hero } from "@/components/sections/hero";
import { Leaderboard } from "@/components/sections/leaderboard";
import { Matrix } from "@/components/sections/matrix";
import { Methodology } from "@/components/sections/methodology";
import { Operations } from "@/components/sections/operations";
import { Recommendations } from "@/components/sections/recommendations";
import { benchData } from "@/lib/bench";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description:
    "Benchmarking git client implementations on real-world repository operations.",
  openGraph: { url: "/" },
  title: "Git Bench",
};

const EmptyResults = () => (
  <section className="border-t border-dotted pt-6">
    <p className="text-muted-foreground text-sm">
      No results yet. Run{" "}
      <code className="border-border bg-muted rounded border px-1 py-0.5 font-mono text-xs">
        bun run bench
      </code>{" "}
      after cloning the benchmark repository to populate this page.
    </p>
  </section>
);

const Home = () => (
  <div className="flex flex-col gap-12">
    <Hero />
    <CommitGraph />
    {benchData.results.length > 0 ? (
      <>
        <Leaderboard />
        <Recommendations />
        <Operations />
        <Frontier />
        <Matrix />
      </>
    ) : (
      <EmptyResults />
    )}
    <Methodology />
  </div>
);

export default Home;
