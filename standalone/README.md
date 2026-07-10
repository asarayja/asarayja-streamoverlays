# Asarayja Stream Overlays — standalone build

A self-contained production build (Next.js `output: "standalone"`). It bundles
`server.js`, the compiled app under `.next/`, the static assets, `public/`, and
only the traced `node_modules` it needs — no install or rebuild required.

## Run

    node server.js

Then open http://localhost:3000 (set `PORT` to change it):

    PORT=8080 node server.js

## Notes

- This is a snapshot of the build at commit time; regenerate it after code
  changes with `npm run build` (it is emitted to `.next/standalone`, then
  `.next/static` and `public/` are copied in).
- Requires Node.js 18+.
