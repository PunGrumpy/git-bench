import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DesignSystemProvider } from "@/components/providers/client";
import { fonts } from "@/lib/fonts";

const title = "Git Bench";
const description =
  "Benchmarking git client implementations on real-world repository operations.";

export const metadata: Metadata = { description, title };

interface RootLayoutProps {
  readonly children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body className={fonts}>
      <DesignSystemProvider>
        <div className="relative isolate flex min-h-dvh flex-col bg-background">
          <div className="mx-auto w-full max-w-7xl flex-1 lg:grid lg:grid-cols-[1fr_42rem_1fr]">
            <div aria-hidden className="hidden lg:block" />
            <main className="mx-auto w-full px-4 sm:px-8 py-8 flex flex-col gap-12">
              <div className="flex flex-1 flex-col gap-12">{children}</div>
            </main>
          </div>
        </div>
      </DesignSystemProvider>
    </body>
  </html>
);

export default RootLayout;
