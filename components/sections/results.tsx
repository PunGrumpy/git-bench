import { BenchChart } from "@/components/bench-chart";
import { benchData } from "@/lib/bench";

export const Results = () => {
  const hasResults = benchData.results.length > 0;

  if (!hasResults) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <p className="text-muted-foreground text-xs">
          No results yet. Run{" "}
          <code className="rounded border border-border bg-muted px-1 py-0.5 font-mono">
            bun run bench
          </code>{" "}
          after cloning the linux repo to populate the chart.
        </p>
      </div>
    );
  }

  return <BenchChart />;
};
