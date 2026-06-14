import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DesignSystemProvider } from "@/components/providers/client";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { fonts } from "@/lib/fonts";
import { url } from "@/lib/url";
import { escapeJsonForHtml } from "@/lib/utils";

const title = "Git Bench";
const description =
  "Benchmarking git client implementations on real-world repository operations.";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  description,
  metadataBase: new URL(url),
  openGraph: {
    description,
    locale: "en_US",
    siteName: "Git Bench",
    title,
    type: "website",
    url: "/",
  },
  title,
  twitter: {
    card: "summary_large_image",
    description,
    title,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  author: { "@type": "Person", name: "Noppakorn Kaewsalabnil" },
  codeRepository: "https://github.com/PunGrumpy/git-bench",
  description,
  license: "https://opensource.org/licenses/MIT",
  name: "Git Bench",
  programmingLanguage: "TypeScript",
  url,
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <script id="json-ld-website" type="application/ld+json">
        {escapeJsonForHtml(JSON.stringify(jsonLd))}
      </script>
    </head>

    <body className={fonts}>
      <DesignSystemProvider>
        <div className="relative isolate flex min-h-dvh flex-col bg-background">
          <div className="mx-auto w-full max-w-7xl flex-1 lg:grid lg:grid-cols-[1fr_42rem_1fr]">
            <div aria-hidden className="hidden lg:block" />
            <main className="mx-auto w-full px-4 sm:px-8 py-8 flex flex-col gap-12">
              <Header />
              <div className="flex flex-1 flex-col gap-12">{children}</div>
              <Footer />
            </main>
          </div>
        </div>
      </DesignSystemProvider>
    </body>
  </html>
);

export default RootLayout;
