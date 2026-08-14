import { benchData } from "@/lib/bench";

/** Prerendered with the page, so the published data is one fetch away. */
export const dynamic = "force-static";

export const GET = () =>
  Response.json(benchData, {
    headers: { "cache-control": "public, max-age=0, must-revalidate" },
  });
