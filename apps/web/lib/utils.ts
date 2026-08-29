import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatMs = (ms: number, axis = false): string => {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(axis ? 0 : 2)}s`;
  }
  if (axis) {
    if (ms >= 1) {
      return `${Math.round(ms)}ms`;
    }
    let decimals = 3;
    if (ms >= 0.1) {
      decimals = 1;
    } else if (ms >= 0.01) {
      decimals = 2;
    }
    return `${Number(ms.toFixed(decimals))}ms`;
  }
  if (ms >= 10) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${ms.toFixed(2)}ms`;
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export const formatDate = (iso: string): string | null => {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : DATE_FORMAT.format(parsed);
};

export const escapeJsonForHtml = (json: string): string =>
  json
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
