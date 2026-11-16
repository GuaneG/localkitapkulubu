import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  async headers() {
    return [...["/admin/:path*", "/api/admin/:path*", "/api/auth/:path*"].map((source) => ({ source, headers: [
      { key: "Cache-Control", value: "private, no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ] })), ...["/tr", "/en"].map((source) => ({ source, headers: [{ key: "Cache-Control", value: "no-store" }] }))];
  },
};

export default nextConfig;
