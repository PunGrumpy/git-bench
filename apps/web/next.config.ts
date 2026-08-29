import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  images: {
    formats: ["image/avif", "image/webp"],
  },

  transpilePackages: ["@git-bench/bench"],

  // `.wgsl` files are shader modules, not assets: the loader resolves their
  // import graph at build time and hands `effect()` one finished shader.
  // Neither loader validates the WGSL: `vgpu check --require-validation` does.
  turbopack: {
    rules: {
      "*.wgsl": {
        as: "*.js",
        loaders: ["@vgpu/wgsl/loader-webpack"],
      },
    },
  },

  // Only read by `next build --webpack`; Turbopack ignores it and vice versa.
  webpack(config) {
    config.module ??= {};
    config.module.rules ??= [];
    config.module.rules.push({
      loader: "@vgpu/wgsl/loader-webpack",
      test: /\.wgsl$/u,
    });
    return config;
  },
};

export default nextConfig;
