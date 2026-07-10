import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (server.js + traced deps) under
  // .next/standalone, so the app can run with `node server.js` without a build.
  output: "standalone",
};

export default nextConfig;
