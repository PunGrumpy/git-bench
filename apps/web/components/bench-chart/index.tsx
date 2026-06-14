"use client";

import type { AudioManifest } from "@joycostudio/suno";
import { useSuno, useUnlock } from "@joycostudio/suno/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { BenchResultsTable } from "@/components/bench-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { benchData } from "@/lib/bench";
import type { OperationId } from "@/lib/bench";
import { cn } from "@/lib/utils";

const OperationChart = dynamic(
  // oxlint-disable-next-line promise/prefer-await-to-then
  () => import("./plot").then((mod) => mod.OperationChart),
  { ssr: false }
);

export const BenchChart = () => {
  const suno = useSuno<AudioManifest>();
  const { unlock, unlocked } = useUnlock();
  const [operation, setOperation] = useState<OperationId>(
    benchData.operations[0]?.id ?? "status"
  );
  const tabRefs = useRef<Map<OperationId, HTMLButtonElement | null> | null>(
    null
  );
  if (tabRefs.current === null) {
    tabRefs.current = new Map();
  }

  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    const activeTab = tabRefs.current?.get(operation);
    activeTab?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });

    const indicator = indicatorRef.current;
    if (!activeTab || !indicator) {
      return;
    }

    const updatePosition = (animate = true) => {
      const activeEl = tabRefs.current?.get(operation);
      if (!activeEl || !indicator) {
        return;
      }
      const prev = indicator.style.transition;
      if (!animate) {
        indicator.style.transition = "none";
      }
      indicator.style.transform = `translateX(${activeEl.offsetLeft}px)`;
      indicator.style.width = `${activeEl.offsetWidth}px`;
      if (!animate) {
        void indicator.offsetHeight;
        indicator.style.transition = prev;
      }
    };

    if (isFirstMount.current) {
      updatePosition(false);
      isFirstMount.current = false;
    } else {
      updatePosition(true);
    }

    const handleResize = () => updatePosition(false);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [operation]);

  return (
    <Tabs
      className="w-full gap-3"
      onValueChange={(value) => {
        setOperation(value as OperationId);
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
      }}
      value={operation}
    >
      <div className="-mx-4 max-w-full overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0 overflow-y-hidden">
        <TabsList
          className="relative md:w-full w-max gap-x-3 justify-between border-b border-dotted bg-transparent p-0"
          variant="line"
        >
          <span
            ref={indicatorRef}
            className="t-tabs-pill h-[2px]! top-auto! bottom-[-1.5px]! bg-foreground! rounded-none!"
            aria-hidden="true"
          />
          {benchData.operations.map((op) => (
            <TabsTrigger
              className={cn(
                "shrink-0 flex-none px-0 text-sm text-muted-foreground",
                "transition-[color,opacity] duration-150 ease-(--ease-out-strong)",
                "data-active:font-medium data-active:text-foreground",
                "after:hidden",
                "focus-visible:outline-none focus-visible:ring-0"
              )}
              key={op.id}
              ref={(element) => {
                tabRefs.current?.set(op.id, element);
              }}
              value={op.id}
            >
              {op.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {benchData.operations.map((op) => (
        <TabsContent className="space-y-2" key={op.id} value={op.id}>
          <p className="text-muted-foreground text-xs italic">
            {op.description}
          </p>
          <OperationChart operationId={op.id} />
        </TabsContent>
      ))}

      <BenchResultsTable
        activeOperation={operation}
        onOperationChange={setOperation}
      />
    </Tabs>
  );
};
