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
    ],
  },
} satisfies ReactDoctorConfig;
