import type { ReactDoctorConfig } from "react-doctor/api";

export default {
  ignore: {
    files: [
      "hooks/use-mobile.ts",
      "components/ui/**",
      "opengraph-image.tsx",
      // The benchmark runner is a Node CLI, not a React surface, and its
      // sequential awaits are the measurement rather than a slow loop.
      "packages/bench/**",
      // Links to /results.json and /schema.json: route handlers, not pages, so
      // next/link would hijack them with a client navigation that has no page
      // to render. The inline suppression comment is not picked up here.
      "components/sections/methodology.tsx",
    ],
  },
} satisfies ReactDoctorConfig;
