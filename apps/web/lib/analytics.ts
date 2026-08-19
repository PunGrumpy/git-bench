import { track } from "@databuddy/sdk";

import type { OperationId, RunnerId } from "@/lib/bench";

/**
 * The page views, outgoing links, vitals and errors the tracker records on its
 * own are not listed here — these are the things it cannot name: which runner
 * someone left to read about, and which way they turned the controls to get
 * there. Naming them in one place is what keeps them queryable later.
 */
interface Events {
  /** In-page anchors, which no navigation ever records. */
  cta_click: { cta: "methodology" | "full_results" };
  frontier_axis_change: { metric: "spread" | "worst" };
  frontier_filter_change: { binding: "all" | "in-process" | "subprocess" };
  matrix_sort: { runner: RunnerId; direction: "asc" | "desc" | "none" };
  matrix_unit_change: { unit: "ms" | "ratio" };
  result_error_open: { runner: RunnerId; operation: OperationId };
  /** Same-origin data endpoints: fetched, so never a page view. */
  resource_open: { resource: "results_json" | "schema_json" };
  runner_open: { runner: RunnerId; rank: number };
  sound_toggle: { enabled: boolean };
  theme_change: { theme: "dark" | "light" };
}

const UPPERCASE = /[A-Z]/gu;

/** Safe on the server and before the tracker script lands: both are no-ops. */
export const trackEvent = <E extends keyof Events>(
  event: E,
  properties: Events[E]
) => {
  track(event, properties);
};

/**
 * The same event as spreadable `data-*` attributes, for elements that would
 * otherwise become client components just to report a click. The tracker
 * delegates from `document` and camel-cases the suffixes back, so
 * `data-runner-id` arrives as `runnerId`.
 */
export const trackAttributes = <E extends keyof Events>(
  event: E,
  properties: Events[E]
): Record<string, string> => {
  const attributes: Record<string, string> = { "data-track": event };
  for (const [key, value] of Object.entries(properties)) {
    const suffix = key.replace(UPPERCASE, (char) => `-${char.toLowerCase()}`);
    attributes[`data-${suffix}`] = String(value);
  }
  return attributes;
};
