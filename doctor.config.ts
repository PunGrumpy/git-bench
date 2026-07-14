import type { ReactDoctorConfig } from "react-doctor/api";

export default {
  ignore: {
    files: ["hooks/use-mobile.ts", "components/ui/**", "opengraph-image.tsx"],
  },
} satisfies ReactDoctorConfig;
