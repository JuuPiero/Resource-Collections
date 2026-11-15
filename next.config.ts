import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["piscina"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.pixhost.to",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
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
