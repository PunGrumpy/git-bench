"use client";

import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  readonly label: string;
  readonly value: T;
}

interface SegmentedControlProps<T extends string> {
  readonly label: string;
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

/**
 * One switch shape for the whole page. `relative` matters: the legend is
 * `sr-only`, which is absolutely positioned, and without a positioned ancestor
 * it anchors to the page and drags the document's scrollable width with it.
 */
export const SegmentedControl = <T extends string>({
  label,
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) => (
  <fieldset className="relative flex shrink-0 items-center rounded-full border border-dotted p-1">
    <legend className="sr-only">{label}</legend>
    {options.map((option) => (
      <button
        aria-pressed={value === option.value}
        className={cn(
          "rounded-full px-3 py-1 text-xs transition-colors",
          value === option.value
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        key={option.value}
        onClick={() => onChange(option.value)}
        type="button"
      >
        {option.label}
      </button>
    ))}
  </fieldset>
);
