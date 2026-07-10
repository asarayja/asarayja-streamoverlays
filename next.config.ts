import type { NextConfig } from "next";

// GitHub project pages serve under /<repo>, so assets need that base — but only
// for the Pages build (GITHUB_PAGES=true in the deploy workflow). Local builds
// and `npx serve out` stay at the root.
const repo = "/asarayja-streamoverlays";
const onPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  // Fully static site to out/ — plain HTML/CSS/JS, no Node server.
  output: "export",
  // Emit dir/index.html for every route so any static host (GitHub Pages
  // included) serves nested routes without special rewrites.
  trailingSlash: true,
  basePath: onPages ? repo : undefined,
  assetPrefix: onPages ? repo : undefined,
};

export default nextConfig;
