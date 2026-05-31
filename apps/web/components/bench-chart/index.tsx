"use client";

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
  const [operation, setOperation] = useState<OperationId>(
    benchData.operations[0]?.id ?? "status"
  );
  const tabRefs = useRef<Map<OperationId, HTMLButtonElement | null> | null>(
    null
  );
  if (tabRefs.current === null) {
    tabRefs.current = new Map();
  }

  useEffect(() => {
    tabRefs.current?.get(operation)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [operation]);

  return (
    <Tabs
      className="w-full gap-3"
      onValueChange={(value) => setOperation(value as OperationId)}
      value={operation}
    >
      <div className="-mx-4 max-w-full overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
        <TabsList
          className="w-full gap-x-3 justify-between border-b border-dotted bg-transparent p-0"
          variant="line"
        >
          {benchData.operations.map((op) => (
            <TabsTrigger
              className={cn(
                "shrink-0 flex-none px-0 text-sm text-muted-foreground",
                "transition-[color,opacity] duration-150 ease-(--ease-out-strong)",
                "data-active:font-medium data-active:text-foreground",
                "group-data-horizontal/tabs:after:bottom-[-2.5px] group-data-horizontal/tabs:after:h-0.25",
                "group-data-horizontal/tabs:after:ease-(--ease-out-strong)",
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
