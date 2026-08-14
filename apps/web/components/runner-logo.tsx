import Image from "next/image";

import { runnerMeta } from "@/lib/bench";
import type { RunnerId } from "@/lib/bench";

interface RunnerLogoProps {
  readonly runnerId: RunnerId;
  readonly className?: string;
}

export const RunnerLogo = ({ className, runnerId }: RunnerLogoProps) => (
  <Image
    alt=""
    aria-hidden
    className={className ?? "size-3.5 shrink-0 rounded-full"}
    src={runnerMeta[runnerId].logo}
  />
);
