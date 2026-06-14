"use client";

import type { AudioManifest } from "@joycostudio/suno";
import { useSuno, useUnlock } from "@joycostudio/suno/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import type { SVGProps } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const suno = useSuno<AudioManifest>();
  const { unlock, unlocked } = useUnlock();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isDark =
    theme === "dark" || (theme !== "light" && resolvedTheme === "dark");

  const [displayedText, setDisplayedText] = useState(isDark ? "Dark" : "Light");
  const [animationClass, setAnimationClass] = useState("");
  const textRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    setDisplayedText(isDark ? "Dark" : "Light");
  }, [isDark]);

  const handleToggle = () => {
    const nextTheme = isDark ? "light" : "dark";
    const nextText = isDark ? "Light" : "Dark";

    const durValue = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--text-swap-dur");
    const dur =
      Number.parseFloat(durValue) * (durValue.includes("ms") ? 1 : 1000) || 150;

    setAnimationClass("is-exit");
    const playAudio = async () => {
      try {
        if (!unlocked) {
          await unlock();
        }
        const source = await suno.load("click");
        source.play();
      } catch {
        // Ignore errors
      }
    };
    playAudio();

    setTimeout(() => {
      setDisplayedText(nextText);
      setAnimationClass("is-enter-start");

      requestAnimationFrame(() => {
        if (textRef.current) {
          void textRef.current.offsetHeight;
        }
        setAnimationClass("");
        setTheme(nextTheme);
      });
    }, dur);
  };

  return (
    <button
      type="button"
      suppressHydrationWarning
      className="text-muted-foreground transition-colors hover:text-foreground outline-none focus:outline-none"
      onClick={handleToggle}
      aria-label={`Theme: ${isDark ? "Dark" : "Light"}. Click to change theme.`}
    >
      <span className="flex size-9 items-center justify-center rounded-full border border-dotted hover:bg-sidebar transition-colors sm:hidden">
        <span className="t-icon-swap size-4" data-state={isDark ? "b" : "a"}>
          <SunIcon className="t-icon size-4" data-icon="a" />
          <MoonIcon className="t-icon size-4" data-icon="b" />
        </span>
      </span>
      <Badge
        variant="outline"
        className="hidden sm:inline-flex h-auto items-center gap-2 py-2 px-4 bg-transparent hover:bg-sidebar transition-colors border-dotted"
      >
        <span className="t-icon-swap size-3.5" data-state={isDark ? "b" : "a"}>
          <SunIcon className="t-icon size-3.5" data-icon="a" />
          <MoonIcon className="t-icon size-3.5" data-icon="b" />
        </span>
        <span ref={textRef} className={cn("t-text-swap", animationClass)}>
          {displayedText}
        </span>
      </Badge>
    </button>
  );
};
