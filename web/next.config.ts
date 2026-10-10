import type { NextConfig } from "next";

// Static export: the whole site is plain HTML, CSS and JS that any host can serve.
// Live features call the Niyam API at NEXT_PUBLIC_API_BASE when it is reachable.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
