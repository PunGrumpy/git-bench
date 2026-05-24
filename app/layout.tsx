import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { DesignSystemProvider } from "@/components/providers/client";
import { fonts } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const title = "git-bench";

export const metadata: Metadata = { description: "Next.js app", title };

interface RootLayoutProps {
  readonly children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html
    lang="en"
    suppressHydrationWarning
    className={cn("font-sans", inter.variable)}
  >
    <body className={fonts}>
      <DesignSystemProvider>{children}</DesignSystemProvider>
    </body>
  </html>
);

export default RootLayout;
