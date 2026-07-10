import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a fully static site to out/ — plain HTML/CSS/JS that any static host
  // serves with no Node server. Runtime ids (editor, live, design detail) live
  // in query strings so no dynamic route params are needed.
  output: "export",
};

export default nextConfig;
