"use client";

import { useTheme } from "next-themes";
import type { SVGProps } from "react";

import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/analytics";
import { sfx } from "@/lib/sfx";

export const SunIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="1em"
    viewBox="0 0 24 24"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      clipRule="evenodd"
      d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zM4.929 4.929a1 1 0 011.414 0l.707.707A1 1 0 115.636 7.05l-.707-.707a1 1 0 010-1.414zM19.071 4.929a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM12 8a4 4 0 100 8 4 4 0 000-8zM2 12a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm17 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM5.636 16.95a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707zm12.728 0a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707zM12 19a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

export const MoonIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="1em"
    viewBox="0 0 24 24"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      clipRule="evenodd"
      d="M21.752 15.002A9.718 9.718 0 0112.478 22C7.004 22 2.5 17.496 2.5 12.022A9.718 9.718 0 019.498 2.748a.75.75 0 01.824.96 7.218 7.218 0 009.47 9.47.75.75 0 01.96.824z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

export const ThemeSwitcher = () => {
  const { resolvedTheme, setTheme } = useTheme();

  const handleToggle = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    sfx.play(next === "dark" ? "toggle-off" : "toggle-on");
    trackEvent("theme_change", { theme: next });
    setTheme(next);
  };

  // Which theme is active is read off the `dark` class rather than React state,
  // so the first paint matches the server and there is nothing to hydrate.
  return (
    <button
      aria-label="Toggle theme"
      className="text-muted-foreground hover:text-foreground transition-colors"
      onClick={handleToggle}
      type="button"
    >
      <span className="hover:bg-sidebar flex size-9 items-center justify-center rounded-full border border-dotted transition-colors sm:hidden">
        <SunIcon className="size-4 dark:hidden" />
        <MoonIcon className="hidden size-4 dark:block" />
      </span>
      <Badge
        className="hover:bg-sidebar hidden h-auto items-center gap-2 border-dotted bg-transparent px-4 py-2 transition-colors sm:inline-flex"
        variant="outline"
      >
        <SunIcon className="size-3.5 dark:hidden" />
        <MoonIcon className="hidden size-3.5 dark:block" />
        <span className="dark:hidden">Light</span>
        <span className="hidden dark:inline">Dark</span>
      </Badge>
    </button>
  );
};
