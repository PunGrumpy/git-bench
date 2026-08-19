"use client";

import { Databuddy } from "@databuddy/sdk/react";
import { useEffect } from "react";

export const Analytics = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const mount = async () => {
      const { mountDevtools } = await import("@databuddy/devtools/react");
      mountDevtools();
    };

    mount();
  }, []);

  return (
    <Databuddy
      clientId={process.env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID}
      trackAttributes
      trackErrors
      trackHashChanges
      trackInteractions
      trackOutgoingLinks
      trackWebVitals
    />
  );
};
