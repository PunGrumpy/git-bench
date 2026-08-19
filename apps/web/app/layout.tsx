import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Analytics } from "@/components/providers/analytics";
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
  <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
    <head>
      <script id="json-ld-website" type="application/ld+json">
        {escapeJsonForHtml(JSON.stringify(jsonLd))}
      </script>
    </head>

    <body className={fonts}>
      <DesignSystemProvider>
        <div className="bg-background relative isolate flex min-h-dvh flex-col">
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-4 py-8 sm:px-8">
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
          </div>
        </div>
      </DesignSystemProvider>

      <Analytics />
    </body>
  </html>
);

export default RootLayout;
