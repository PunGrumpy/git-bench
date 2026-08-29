import { RunnerLogo } from "@/components/runner-logo";
import { runnerMeta } from "@/lib/bench";
import { recommendations } from "@/lib/bench/decision";

export const Recommendations = () => (
  <section className="flex flex-col gap-4" id="recommendations">
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">Which library should you use?</h2>
      <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
        Recommendations are derived from the published results and update when
        the benchmark changes.
      </p>
    </div>

    <ul className="grid gap-3 sm:grid-cols-3">
      {recommendations.map((recommendation) => (
        <li
          className="border-border/60 rounded-lg border border-dotted p-4"
          key={recommendation.id}
        >
          <p className="text-muted-foreground text-xs font-medium uppercase">
            {recommendation.title}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <RunnerLogo runnerId={recommendation.runnerId} />
            <span className="text-sm font-medium">
              {runnerMeta[recommendation.runnerId].label}
            </span>
          </div>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            {recommendation.description}
          </p>
        </li>
      ))}
    </ul>
  </section>
);
