import {
  Geist as createSans,
  Geist_Mono as createMono,
} from "next/font/google";

import { cn } from "./utils";

const sans = createSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = createMono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const fonts = cn(
  sans.variable,
  mono.variable,
  "touch-manipulation font-sans antialiased"
);
