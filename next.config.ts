// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // allow production builds even if ESLint or TS complain
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  images: { unoptimized: true },
};

export default nextConfig;
