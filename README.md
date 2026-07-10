# Asarayja Stream Overlays

Browser-based stream overlay editor. Pick a template, fill in your channel profile once, and
export to PNG, video, individual elements, or a live OBS browser source.

Everything is free — no premium tier — and every template works both as a still and animated:
motion is a per-project switch, not a template property.

```bash
npm install
npm run dev      # http://localhost:3000
```

No backend, no database, no accounts. Everything lives in your browser.

---

## The one idea worth knowing

A template is **pure data**, and it never contains a literal colour or a literal channel name:

```ts
text("Channel name", box, "{{CHANNEL_NAME}}", { fill: "@accent" })
```

- `@accent` is a **design token**, resolved against the project's `Theme`.
- `{{CHANNEL_NAME}}` is a **placeholder**, resolved against your `ChannelProfile`.

The token system is sixteen deep — backgrounds (`background`, `backgroundSecondary`, `surface`,
`surfaceSecondary`), brand (`primary`, `secondary`, `accent`, `accentSecondary`), text (`text`,
`textSecondary`), effects (`border`, `glow`, `shadow`) and status (`success`, `warning`,
`error`). Palettes author the eight core tokens; `completeTheme` derives the rest, and any
derived token can be overridden by hand. Colour values support modifiers:
`@accent/40` (alpha), `@accent+20` (lighter), `@accent-20` (darker) — lighter/darker/hover
variants of any token without minting new ones.

Rendering is always `template + theme + profile → layers`. Two product promises fall out of that
single rule for free:

- **Change one colour, the whole overlay updates.** Nothing stores hex codes, so reassigning
  `theme.accent` repaints every layer that references it.
- **Never type your name twice.** Fill in the channel profile once; every template you open is
  already populated.

It also means the 404 templates in the gallery are generated at module load: 18 core designs ×
18 core palettes plus 8 gothic designs × 10 gothic palettes. Collections pair with their own
palettes — a neon esports palette on a Victorian mourning frame helps nobody. Adding a gothic
palette adds 8 finished gothic templates.

## Colour, done properly

- **Harmony schemes, never random.** "Generate from primary" places secondary and accent hues by
  colour-wheel geometry — analogous, complementary, split-complementary, triadic, tetradic or
  monochrome — then forces the result through the contrast gate (`themeFromSeed`).
- **Automatic contrast control.** The `ContrastCheck` panel (editor Colors tab and profile page)
  scores the pairs that decide on-stream readability against WCAG 2.x — 4.5:1 for text, 3:1 for
  UI — with a deterministic one-click fix that moves only the failing token's lightness. It also
  simulates protanopia/deuteranopia and warns when success/error or primary/accent collapse for
  red-green colour-blind viewers.
- **Linked colours.** Editing background, text, accent or primary cascades to the tones derived
  from them (surfaces, secondary text, glow, border) — one colour change restyles the family
  (`cascade` in `lib/theme.ts`).
- **Shipped palettes are gated.** `GET /qa` runs every shipped palette through the same checks;
  all 28 pass all pairs. The named spec palettes (Dark Goth, Pastel Goth, Cyber Goth, Minimal,
  Fantasy) are hand-authored, and three Pride palettes ship with flag colours harmonised onto
  neutral backgrounds. Several gothic packs are tuned to published gothic palettes
  (piktochart.com/blog/gothic-color-palette).

## The Gothic collection

A second template family with its own palettes (Midnight Cathedral, Pastel Nightmare, Crimson
Vampire, Moonlit Witch, Victorian Mourning, Cyber Coven, Haunted Garden, Gothic Romance, Raven
Manor, Candy Coffin), its own display faces (blackletter and gothic serifs, display-only — body
text stays readable), and sub-style filtering in the gallery (Dark Goth, Pastel Goth, Victorian,
Vampire, Witch, Cyber Goth, …).

Gothic decor is built from deterministic particle systems — bats, moths, falling petals, drifting
fog — drawn from Konva primitives, not licensed artwork. Decor layers are named `Decor — …` so
they can be toggled, recoloured, resized or deleted like any other layer.

## Animation semantics: elements animate in place

Persistent widgets — camera frames, chat boxes, social bars — never fly in. They animate *in and
around themselves*: glow breathing, floating, flicker. Transient elements — alerts, scene
headlines — are the ones that enter with slide/bounce/elastic, because appearing is their job.
This is an authoring convention enforced across every shipped template.

## The second idea: animation is a pure function of time

`sample(animation, t)` returns a transform. No tweens, no scheduler, no mutation.

That is why the editor preview, the OBS browser source, and the frame-accurate exporter can all be
the same renderer. Scrubbing the timeline sets a number. Exporting frame *n* sets that number to
`n / fps`. A given `t` always produces identical pixels — including the particle systems, which
derive their positions from a deterministic hash of `(index, time)` rather than `Math.random()`.

---

## Layout

```
src/
  lib/
    types.ts          Layer/Theme/Template/Project model. Start here.
    theme.ts          resolveColor("@accent/40", theme) and palette harmony maths
    placeholders.ts   resolveText("{{CHANNEL_NAME}}", profile)
    animation.ts      sample(anim, t) -> transform. The whole animation engine.
    export.ts         PNG / JPG / WebM / transparent PNG-sequence exporters
    share.ts          Self-contained OBS links (gzip -> URL fragment)
    zip.ts            Minimal store-only ZIP writer
  data/
    templates.ts      Base templates (core + gothic) + variant expansion
    palettes.ts       28 shipping palettes: 18 core (incl. 3 Pride) + 10 gothic packs
    fonts.ts          Google Fonts catalogue
  components/
    overlay/          The renderer. LayerNode.tsx paints every layer type.
    editor/           Canvas, panels, timeline, export dialog
  store/              Zustand: profile, projects, editor (with undo/redo)
  app/                Gallery, /profile, /projects, /editor/[id], /live/overlay/[code]
```

`components/overlay/LayerNode.tsx` is the single source of truth for what an overlay looks like.
The gallery, the editor, OBS, and every exporter go through it.

---

## Things that are true, and worth not rediscovering

**Konva paints text on a canvas**, so it can only use fonts the *document* has loaded. That's why
the font catalogue is a plain `<link>` in the root layout rather than `next/font` (which scopes to a
CSS variable the canvas can't see). Stages remount once `document.fonts.ready` resolves.

**Canvas gives a shape exactly one shadow.** Glow and drop-shadow compete for it; glow wins.

**Konva drops text lines that overflow a fixed height.** Text layer boxes have to fit their content.

**Long channel names auto-shrink.** Single-line text that overflows its box scales its font down
instead of clipping. Two traps live here: Konva charges `letterSpacing` per *character* (not per
gap) when deciding whether a line fits, and `document.fonts.ready` does not load faces that are
only ever drawn on canvas — `waitForFonts()` loads the whole catalogue explicitly, or the
measurement cache poisons itself with fallback-font metrics.

**A blank profile field renders as its label** ("Slogan") while editing — an empty layer would be
invisible and unselectable — but resolves to nothing in `live` mode. Nobody wants the word "Slogan"
burned into their stream. Same for social bars: a platform with no handle is dropped.

**The camera frame's fill is a studio-only placeholder.** OBS composites the browser source *above*
your webcam, so any fill would tint it. In `live` mode the interior is fully transparent.

**`hasHydrated()` is not the same as "no projects".** The editor derives "project not found" from a
`hydrated` flag on the store, not from an empty array, or it 404s on every refresh.

---

## Export, honestly

| Format | Alpha | How |
| --- | --- | --- |
| PNG (1×–4×) | Yes | `stage.toDataURL` on a stage that never paints a background |
| JPG | No | Composited onto your background colour |
| WebM / MP4 | **No** | `MediaRecorder`; no browser video codec carries an alpha channel |
| PNG sequence (ZIP) | Yes | Frame-accurate, with the FFmpeg commands to encode it |
| Individual elements (ZIP) | Yes | Each visible layer as its own cropped PNG + a position manifest |
| OBS browser source | Yes | Nothing to export — OBS renders the page |

**Motion switch.** The clapperboard toggle in the editor header sets `project.animationsEnabled`.
Off, the live OBS view and exports render the settled still pose; on, everything plays. The flag
travels inside the OBS link payload, so a static overlay stays static in OBS.

**Scenes vs overlays.** Screens like Starting Soon, BRB and Stream Ending carry a canvas-filling
`background` layer and export opaque edge to edge (gradients are painted over a solid base so a
semi-transparent gradient stop can't leave the scene see-through). Game overlays have no
background layer — the play area exports as true transparency — and the camera window is always
transparent so OBS can layer the real webcam behind it.

**Individual elements.** Export → *All elements as PNGs* renders every visible layer alone,
cropped to its own bounds plus room for glow/shadow, at the overlay's settled pose. The ZIP's
README lists each element's x/y/size on the 1920×1080 canvas so they can be reassembled.

Video recording runs at 1× wall-clock speed, because `canvas.captureStream(fps)` samples on a
real-time schedule. A five-second overlay takes five seconds to record.

For a genuinely transparent animated overlay, use the **PNG sequence** (its `README.txt` ships
verified `libvpx-vp9` and `prores_ks` commands) or just point OBS at the browser source.

### OBS

Export → *Generate and copy OBS URL* produces a link like:

```
http://localhost:3000/live/overlay/K7MNP2QR#d=z<compressed payload>
```

OBS's browser source is a separate Chromium with its own empty `localStorage`, so the link has to
*carry* the overlay. The project and profile are gzipped into the URL **fragment**, which is never
sent to a server. Paste it into OBS as a Browser Source at 1920×1080.

While the studio tab is open, edits stream to any open live view over a `BroadcastChannel`.

---

## What isn't built

This is the frontend. It runs, and every feature above was verified in a real browser. Not here:

- **Backend** — NestJS, Postgres/Prisma, Redis, BullMQ. Projects persist to `localStorage` today
  (~5 MB; uploads are downscaled to fit), and the OBS link carries its own payload precisely because
  there is nowhere to fetch from yet.
- **Accounts and OAuth** — no users, so no sharing, teams, comments, or marketplace.
- **Server-side video rendering** — Remotion/Playwright/FFmpeg would remove the 1× recording limit
  and produce true-alpha WebM and MOV directly. The PNG sequence exists to bridge that gap.
- **Admin tooling** — templates are code (`src/data/templates.ts`), not database rows.
- **AI generation** — "Generate palette from primary" is a deterministic colour harmony, not a model
  call. It's labelled as such in the UI.
- **Groups, masks, keyframes** — the layer model reserves `groupId`; the timeline visualises
  per-layer animation spans rather than editable keyframes.
