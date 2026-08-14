import Link from "next/link";
import type { SVGProps } from "react";

import { Badge } from "@/components/ui/badge";

import { ThemeSwitcher } from "./theme-switcher";

export const GitHubIcon = ({
  className,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>GitHub</title>
    <path d="M12 .297a12 12 0 0 0-3.794 23.385c.6.111.82-.26.82-.578v-2.234c-3.338.726-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.93 0-1.31.467-2.381 1.235-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 6.003 0c2.291-1.552 3.297-1.23 3.297-1.23.654 1.652.243 2.873.12 3.176.77.84 1.233 1.911 1.233 3.221 0 4.609-2.807 5.621-5.479 5.92.43.371.823 1.102.825 2.222v3.293c0 .322.218.694.825.576A12 12 0 0 0 12 .297" />
  </svg>
);

export const Header = () => (
  <div className="flex items-center justify-between">
    <Link
      className="flex items-center gap-2 text-lg font-semibold transition-opacity hover:opacity-80"
      href="/"
    >
      Git Bench
    </Link>
    <div className="flex items-center gap-2">
      <ThemeSwitcher />
      <a
        className="text-muted-foreground hover:text-foreground transition-colors"
        href="https://github.com/PunGrumpy/git-bench"
        rel="noreferrer"
        target="_blank"
        aria-label="PunGrumpy/git-bench on GitHub"
      >
        <span className="hover:bg-sidebar flex size-9 items-center justify-center rounded-full border border-dotted transition-colors sm:hidden">
          <GitHubIcon className="size-4" />
        </span>
        <Badge
          variant="outline"
          className="hover:bg-sidebar hidden h-auto border border-dotted bg-transparent px-4 py-2 transition-colors sm:inline-flex"
        >
          <GitHubIcon className="size-3.5" />
          PunGrumpy/git-bench
        </Badge>
      </a>
    </div>
  </div>
);
