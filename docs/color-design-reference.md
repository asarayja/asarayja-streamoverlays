# Colour & Design Reference

The distilled knowledge base behind every palette decision in this project. Palettes are
built for dark stream overlays composited over unpredictable video, watched on compressed
feeds and small screens. Every rule here exists because something breaks without it.

---

## 1. How colours fit together

### Pick the harmony by job, not taste

Each wheel scheme has a built-in energy level. Choose the scheme for the work it must do:

- **Complementary** (~180° apart) — one loud focal accent. Maximum hue contrast; good for
  a CTA or LIVE badge, bad for large adjacent fields. `#1B2A4A` + `#FF7A1A`.
- **Analogous** (hues within ~60-90°) — calm, cohesive backgrounds. Inherently
  low-contrast: serene but risks mushiness. `#5B2A86` / `#7B4BB7` / `#2A4A86`.
- **Split-complementary** (base + the two hues ~30° either side of its complement) —
  most of complementary's contrast with the head-on clash removed. The most forgiving
  scheme when you need two accents: keep them at matched saturation but different roles
  (one interactive, one status). `#7C3AED` → `#A3E635` + `#FACC15`.
- **Triadic** (~120° spacing) — vibrant but self-balancing; three equally spaced hues
  don't compete for dominance. Keep only ONE at full chroma.
- **Tetradic** — four hue roles, hardest to balance. Only when you genuinely need four
  jobs, and the two extra hues share the 10% accent slot.

(Supercharge Design; Figma resource library; IxDF.)

### Saturation discipline

- **One hero.** In any multi-hue scheme, exactly one token carries high saturation; mute
  the others by lowering saturation (~35-45%) or shifting value until they read as
  supporters. One bright + N muted creates a natural focal hierarchy; three equally vivid
  hues are a carnival. (Colors Explained; Onething Design.)
- **Never butt two fully saturated near-complements at equal lightness.** Equiluminant
  saturated boundaries "vibrate" (Chevreul, 1839; chromostereopsis for red/blue): the
  luminance channel sees no edge while chroma channels see a strong one. Fix with a
  value gap — push one side 25-30+ lightness points — or separate with a neutral border.
  `#FF0000` on `#00FF00` is the textbook fail; `#1E3A5F` bg + `#FF8C42` accent keeps the
  complementary punch. (Rhyne, Nightingale; Envato Tuts+.)
- **The "three S" fix**: Saturation (no 0x00/0xFF channel extremes — `#E5484D` not
  `#FF0000`, `#3E63DD` not `#0000FF`), Separation (achromatic space between risky
  pairs), Surroundings (judge colours in context, never as isolated swatches — Albers).
- **Legibility is luminance, never hue.** Hue contrast is not luminance contrast: pure
  blue `#0000FF` on black is 2.4:1 — fails even large-text AA. Body text lives in
  neutrals (`#E8EAF0`-class on dark); scheme hues do fills, borders, glows.

### Temperature and undertones

- **Never use dead grey (S=0).** Tint every neutral 3-8% toward one hue and keep that
  undertone consistent across the whole ramp. Mixed undertones (warm stone border on a
  cool slate panel) read as "something is off" even when viewers can't name it.
  (Refactoring UI; Dennis Cortés.)
- **Derive the undertone from the brand hue** — purple accent → blue-violet greys
  (`#1B1826` not `#1A1A1A`). Dark values tolerate more chroma (up to ~12%) than light
  ones; put the undertone strength in the darks, keep light text near-neutral.
- **Commit to one temperature hemisphere.** Cross temperatures with exactly one
  deliberate accent, not scattered through the chrome. Warm hues are perceptually louder
  on dark grounds — budget warm accents under ~10% of area, reserved for the highest
  priority signal.
- **Dark bases lean cool by default** (`#0D1117`-class): viewers forgive cold darkness;
  warm darkness reads muddy on screens. Warm darks (`#1A1410`-class espresso) only for
  deliberately cozy/premium themes.
- **Off-whites carry undertones too.** Cool system → `#E6EDF3`/`#F8FAFC`; warm system →
  `#F2E8DA`. An ivory `#FAF3E0` label on a cool panel is the fastest way to look cheap.
- **Metallics match the undertone**: gold/brass with warm greys, silver/chrome with cool.
  If gold must sit on a cool system, bridge with champagne `#E4B77D`.

### Proportion: 60-30-10

- **60% dominant** (near-neutral surface), **30% secondary** (a quiet lightness step of
  the same family — containers, frames, bars), **10% accent** (the single brightest, most
  saturated colour, for interactive/priority elements only). Harmony wheels give hues,
  not proportions; schemes fail when every colour gets equal area. (UX Planet; Hype4.)
- The ratio is visual weight, not pixel counts — 70/20/10 is fine — but preserve the
  steep drop-off. 40/40/20 produces competing colours and no focal point.
- The accent works because of scarcity: past ~10% coverage, or duplicated by a second
  saturated hue, the hierarchy collapses.
- Build depth with tints/shades of the three roles, not new hues. Cap the whole system
  at ~3 non-neutral hue families (semantic tokens excepted).
- Radix/Tailwind scale logic: a colour is a 10-12 step scale with fixed roles per step
  (backgrounds → borders → solid fills → text tints), generated in OKLCH, not HSL — HSL
  lightness lies across hues (`hsl(60,100%,50%)` yellow emits ~13× the light of the
  same-L blue). Lock one OKLCH L per role and reuse it across hues.

---

## 2. Dark overlay craft

### The base: why 0.035-0.09 lightness, never #000

- Material's canonical dark surface is `#121212`; the working band is roughly
  `#0A0A0F`-`#1E1E22` (HSL L 4-12%, OKLCH L ~0.15-0.24).
- **Pure black fails four ways**: elevation cues die (shadows invisible against #000),
  white text halates (harsh 21:1 edge glow — worst for the ~30-40% of adults with
  astigmatism), OLED pixels smear when content scrolls over off pixels, and panels merge
  with dark game footage and letterboxing.
- **Tint, don't paint**: brand the base by compositing the primary hue at ~8% over the
  near-black (Material's `#121212` + 8% purple = `#1F1B24`; Discord's grey-violet
  `#313338`). A saturated dark brand colour as background wrecks contrast maths.
- Media-canvas products sit low (`#0F0F0F` YouTube, `#121212` Spotify) so content pops;
  overlays follow suit — the game and webcam must stay the brightest things on screen.

### Surfaces and elevation

- On dark, **lighter = closer**. Express elevation as a strictly ascending lightness
  ladder in one hue family, 3-8 HSL points per step (Discord: `#1E1F22` → `#2B2D31` →
  `#313338` → `#383A40`), equivalent to Material's 5-16% white overlays.
- Test text contrast against the **lightest** surface in the ladder, not the base —
  Material's 15.8:1 white-on-base benchmark exists so text still passes AA at 24dp.
- Group with lightness steps, not borders. When a stroke is needed: white at ~12%
  opacity composited over the surface (1.3:1-3:1 vs surface), tinted to the undertone.
- Shadow is the darkest token, in-family, near-zero chroma, used at 40-70% alpha. A
  coloured "shadow" is a glow wearing the wrong name.

### Desaturate on dark

- Fully saturated hues vibrate against dark surfaces and usually fail 4.5:1. Use the
  Material 200-tone / Radix step-11 band: **S 40-70%, L 55-75%** (`#BB86FC` not
  `#6200EE`; `#BF94FF` for text, `#9146FF` for fills behind white text).
- Split every strong hue into a **role pair**: deep hex for fills/borders/glows,
  lightened same-hue variant for text/icons. Fix contrast by raising lightness, never
  saturation.
- Full chroma is a budget: one hero accent, 1-2 elements, <10% of area, ideally
  transient (alert flashes) rather than static.

### Glow discipline

- **White-hot core, coloured halo** — real neon physics. Text/stroke at `#FFF` with
  tight white shadows, then same-hue colour shadows at 2-7× larger blur. Solid
  neon-coloured glyphs read as blurry stickers and fail contrast.
- Glow = the accent pushed toward emission: same hue (±20°, or a deliberate 15-30° warm
  Kelvin shift for "heat"), saturation ~90-100%, lightness raised 10-20 points, applied
  at 40-60% alpha. Light only adds luminance — a darker glow reads as dirt.
- **Bloom threshold**: at most 2-3 glowing elements visible at once. Glow marks state
  (live, hover, event), never sits at full intensity everywhere. Static frames get a
  1-2px rim at most; the event alert must remain the brightest thing on screen.
- Match multi-glow intensity at equal OKLCH L (~0.75-0.85), not HSL — HSL makes magenta
  glows look dim next to cyan at the same number.
- Glow never carries meaning or legibility: the element must pass contrast with the glow
  removed.

### Text over video

- **Never put text directly on video.** Every text element sits on an owned surface: a
  near-black panel at 60-85% opacity or a solid dark fill. Compute contrast against the
  panel's **worst-case composite** — assume a pure-white frame behind it. Black at 50%
  over white is `#808080` (3.9:1 with white text — fails); 70% gives `#4D4D4D` (7.4:1).
  Below ~60% effective opacity a scrim cannot guarantee AA; forbid it for text.
- Floating text (alerts, timers) gets the broadcast caption treatment: white fill +
  1.5-2px dark outline or stacked dark shadow — the closed-caption default because it
  guarantees an edge against every possible pixel.
- **Targets**: body 4.5:1 hard floor, 7:1 target (BBC broadcast floor is 5:1 because
  living rooms are worse than design monitors); large/bold 3:1. Text tokens: off-white
  `#DEDEDE`-`#F2F3F5` (white @87%), never pure `#FFFFFF` body text; secondary at ~60%
  equivalent, no darker than `#8A8A90`-class.
- **Sizes at a 1080p canvas**: 24px body floor, 36px+ titles, 48px+ alert text, bold
  sans-serif, no weights under 500 near video. 40%+ of Twitch viewing is mobile — the
  canvas renders ~360-400px tall; verify on a phone, not the desktop preview.
- Light-on-dark reads as lower effective contrast than the same ratio dark-on-light
  (APCA is polarity-aware for this reason): compensate with one weight step and slightly
  looser tracking.
- White-vs-black text on an accent flips at background relative luminance Y ≈ 0.35
  (~`#A0A0A0`), not middle grey. `#9146FF` (Y≈0.18) takes white; alert yellow takes
  near-black.

### Compression-safe colour

- Streams are delivered **4:2:0 chroma-subsampled**: colour resolution is quarter pixel
  resolution. Edges defined only by hue smear; every edge needs a luminance step.
- **Red bleeds worst** (R carries only ~21% of luma). No saturated red/magenta text,
  thin strokes, or 1-2px dividers; red shapes ≥3-4px thick, or backed by a light
  keyline. Prefer `#E5484D` over `#FF0000` everywhere.
- No channel-extreme primaries (`#FF0000`, `#00FF00`, `#0000FF`, …): they exceed
  broadcast-legal chroma (EBU R103; 75%-bars logic) and ring under encoding. Accents at
  ~70-85% saturation, mid luma, all three channels carrying value.
- **Dark gradients band** at stream bitrates: keep dark ramps short in luma range, add
  1-2% noise, or use flat fills with visible edges instead.
- Acceptance test is the encoded output: composite the overlay over a bright scene, a
  dark scene, and a busy scene; encode x264 ~6000kbps 4:2:0; reject anything that
  fringes, bands, or loses text edges.

### Colour-blind safety

- Blue is the safest hue; **blue + orange** is the safest pair. Never distinguish
  meaning by red-vs-green, green-vs-orange, or blue-vs-purple at similar lightness.
- "Get it right in black & white": any two meaningful colours differ by ≥20 points of
  lightness. Grayscale screenshots are a valid CVD test.
- Protanopia darkens reds ~35%: a pure-red LIVE dot on a dark bar can vanish. Ship
  vermillion `#D55E00`/`#E5484D`-class with a text label or pulse — never a bare dot.
- Okabe-Ito is the default set when >2 distinguishable accents are needed; on dark, use
  its light half (`#56B4E9`, `#E69F00`, `#F0E442`, `#CC79A7`).
- Colour is never the only carrier: every colour-coded state also gets an icon, label,
  shape, or position.

### Gradients that don't mud

- Interpolate in **OKLCH**, not sRGB — sRGB midpoints between distant hues land on grey
  (`#FFD600`→`#2962FF` passes through mud). Where OKLCH isn't available (PNG assets),
  bake 5-9 OKLCH-sampled stops into the gradient.
- Keep endpoints within one temperature family and a ≤90° hue arc. Near-complementary
  pairs (red/cyan, blue/yellow, green/magenta) need a saturated pivot stop
  (`#2962FF` → `#B517E8` → `#FF3D00`), never a straight blend.
- Spot-check: if the sRGB midpoint's saturation drops below ~60% of the endpoints', the
  pair crosses the grey dead zone.
- Mesh/aurora: 3-4 colours max, one temperature family, luminous blobs over near-black
  (blending through dark stays clean; mid-tone meshes go pastel-mud). Animate at 8-15s
  loops — breathe, don't pulse — one aurora zone per scene, never behind chat.

---

## 3. Palette recipes

Every recipe assumes the overlay skeleton: near-black tinted base, elevation ladder,
off-white text on owned panels, one hero accent under 10% of area.

**Neon / cyberpunk.** Tinted near-black base (`#0D0221`, `#1A1A2E` — navy/purple, L
5-15%). Exactly two neons ≥120° apart with fixed roles — structural vs event: cyan
`#00F0FF` + magenta `#FF007F`, or yellow `#FCEE0A` + cyan `#03D8F3` (these pairs also
survive H.264 best; avoid pure red/blue neons). Optional rare third for raid/hype. Neon
≤10-15% of area, on 1-3px strokes and badges, never fills. Text is white/`#F9F9F9` with
the neon in the halo, not the glyphs. Glow is a state, not a constant.

**Pastel (kawaii / pastel goth).** Pastels by formula: S 25-45%, L 78-88%, all hues in
one shared band so any hue swap preserves contrast. Pastels self-harmonise (equal value)
so they can't create hierarchy — a dark anchor is mandatory: hue-tinted near-black
(`#1A1625` for lavender systems, `#241A20` for pink). Overlay uses the pastel-goth
ratio (dark-dominant, pastels as accents), not kawaii's pastel-dominant one. Roles:
off-white `#F6EEEA` body text, one primary pastel (`#FFB7D5`-class) for live/links, two
secondary pastels for decoration. Pastels in wide flat shapes (6-12px borders, header
bars) — thin pastel lines blur to grey on stream.

**Gothic / Victorian.** 70/20/10: ~70% warm near-black two-tier (`#0B0B0B` base +
`#1C1C1C` charcoal), ~20% ONE deep accent — burgundy `#4A0E18` (gothic), plum `#2E1A2E`
(Victorian), oxblood `#5A2827` (dark academia) — never two together, never as text.
~10% aged light neutral: bone `#E8E8E8` or parchment `#BDAC86`, never pure white (breaks
the antique mood). Metallic by era: silver `#8A8A8A` cold gothic, antique gold `#9C7A3C`
warm Victorian — one, not both; gold is large-text-only (~3.4:1). 1-2px metallic
keylines keep panel edges visible over dark scenes.

**Jewel / luxury.** One dominant jewel per theme (emerald `#009473`, sapphire `#0F52BA`,
amethyst `#9966CC`) on a jewel-tinted near-black (`#113B2E`, `#1A1A2E`, `#020B13`).
Every jewel is a role pair: deep hex for fills/glows, lightened variant for text
(`#50C878`, `#6EC6FF`, `#C9A0F0` — the deep hexes are 2.7-3:1 on dark, invisible as
text). Gold is chrome, never data: 3-4 stop gradient (`#AE8625` → `#F7EF8A` → `#D2AC47`
→ `#EDC967` — flat `#FFD700` reads as plastic), capped at 5-10% of area on keylines and
frames. Ivory `#F5F0E1` grounds it. Sheen animation on alerts, not saturated flashes.

**Cozy.** Warm hemisphere throughout. Espresso near-black base (`#1C1613`/`#211A15`),
neutrals from natural materials (cream `#F5EFE4`, taupe, cocoa `#3B2F26`) — a grey ramp
with a warm accent still reads "tech dashboard". Candle-warm accent from the 25-45° hue
band, muted: amber `#E0A458` (~7.7:1) as the single hero; dusty rose `#C98A7D` and sage
`#8A9A7B` supporting. Warm off-white `#F2E8DA` text; softness via opacity tiers (87/60%)
of one off-white, not greyer colours. Accents at S 25-50%, never 80%+.

**Cosmic / aurora.** Deep cool base (`#0b1026`-`#172347` navy, L 5-12%) with a 5-step
luminance ladder up to icy off-white `#F7FEFF`. Accent hues from real emission lines:
oxygen green `#00ea8d`/mint `#04E2B7`, nitrogen violet `#b53dff` — gradients routed
green→teal→violet in OKLCH. One neon accent for live/attention, <5% of area. Galaxy
variant swaps the accent trio warm (`#c874b2`/`#7b337d`/`#017ed5`), same skeleton. Stars
are stellar-temperature whites (`#E6EEFF`, `#F7FEFF`, gold `#f8bc04`) at 1-3px. Aurora
drift ≤0.1Hz during gameplay; dither dark gradients.

**Horror / Halloween.** Near-black anchor 60-80% of area + one bold accent + bone white
`#F5F0E6` for breathing room. Roles by contrast tier: bone white body text (16.5:1),
toxic green `#39FF14`/`#9BE564` for live numbers (green owns 71% of the luma formula —
the readability workhorse), pumpkin `#FF7518` for headers ≥24px (7:1), blood red
`#8A0303` decoration ONLY (1.9:1 — drips, borders, glows, never text; red also goes
near-black for protanopes). Never butt red against green; separate with ≥4px of dark or
a bone keyline. The murk lives in imagery, never the type layer.

**Pride.** Keep the chrome neutral dark (`#0E0E10`/`#18181B`) and the flags authentic:
use documented hexes verbatim, preserve stripe order/orientation/proportions (bi is
2:1:2; intersex is a `#FFD800` field with an unbroken `#7902AA` ring, never stripes;
Progress keeps its chevron). Flags are bounded accents — a 4-8px name bar, webcam
border, alert edge — under ~10% of area; the full flag appears in at most one place per
scene. Never subset the rainbow to 2-3 stripes (collides with other flags): all six or
exactly one. Flag colours never carry text (`#FFED00` on white is ~1.2:1; `#750787` on
dark ~1.9:1) — text stays white on a scrim beside the flag. Black/white stripes need a
1px `rgba(255,255,255,0.25)` hairline or lighter container so they don't vanish into
matching backgrounds. Below ~4px per stripe, switch hard stripes to a 6-stop gradient
(thin stripes alias over video). Move flags as rigid units; never crossfade stripes.
Restraint reads as solidarity; wall-to-wall rainbow reads as costume.

| Flag | Stripes (top → bottom) |
|---|---|
| Rainbow (6-stripe) | `#E40303` `#FF8C00` `#FFED00` `#008026` `#004DFF` `#750787` |
| Progress chevron (Quasar, CC0) | rainbow above + chevron `#FFFFFF` `#FFAFC8` `#74D7EE` `#613915` `#000000` (white at tip) |
| Trans | `#5BCEFA` `#F5A9B8` `#FFFFFF` `#F5A9B8` `#5BCEFA` |
| Bi (2:1:2) | `#D60270` (40%) `#9B4F96` (20%) `#0038A8` (40%) |
| Pan | `#FF218C` `#FFD800` `#21B1FF` |
| Lesbian (7-stripe) | `#D52D00` `#EF7627` `#FF9A56` `#FFFFFF` `#D162A4` `#B55690` `#A30262` |
| Lesbian (5-stripe reduction) | `#D52D00` `#FF9A56` `#FFFFFF` `#D162A4` `#A30262` |
| Nonbinary | `#FCF434` `#FFFFFF` `#9C59D1` `#2C2C2C` |
| Ace | `#000000` `#A3A3A3` `#FFFFFF` `#800080` |

Rainbow blue/violet hexes vary by source (`#004CFF`/`#732982` vs Quasar's
`#004DFF`/`#750787`); freeze one set as tokens and use it everywhere.

---

## 4. The audit rubric

Every palette must pass all 17 checks before shipping.

1. **dark-base-range** — Background HSL lightness 4-12% (`#0A0A0F`-`#1E1E22`, OKLCH L
   ~0.15-0.24), saturation ≤20%, never `#000000`. Lift pure black to the
   `#101216`-`#16181D` band; darken anything above L 14%.
2. **surface-elevation-ladder** — background → backgroundSecondary → surface →
   surfaceSecondary strictly increasing in lightness, 3-8 points per step, all hues
   within ±15° of each other. Rebuild from the base with 5-16% white-overlay
   equivalents; lighter always means more elevated.
3. **hue-scheme-discipline** — primary/secondary/accent/accentSecondary/glow hues fit
   one nameable scheme within ±15°: analogous (60-90° arc), complementary /
   split-complementary (~180° or ~150/210°), or triadic (~120°). No arbitrary scatter;
   no two structural tokens 150-210° apart at similar S and L. Max 3 non-neutral hue
   families (semantics excepted).
4. **single-hero-saturation** — at most ONE non-semantic token above ~75% saturation;
   every other persistent chromatic token in the on-dark band S 40-70%, L 55-75%. FAIL
   if two+ tokens are simultaneously S>80% and L 40-60%.
5. **accent-count-roles** — ≤3 hue families among primary/secondary/accent/
   accentSecondary, roles inferable: primary = brand/interactive, accent =
   attention/event, accentSecondary = analogous partner (within ~60°) or a 120°+ partner
   with a ≥25-point lightness split. Merge redundant accents into variants of one hue.
6. **undertone-consistency** — every neutral has S 2-12% (no S=0 greys), all in ONE
   temperature band (cool ~200-280° or warm ~20-60°, within ±30° of each other, related
   to the primary). No cream text on a cool base or vice versa.
7. **text-contrast-tiers** — text ≥7:1 target (4.5:1 hard floor) and textSecondary
   ≥4.5:1 against **surfaceSecondary** (the lightest surface). Text is off-white
   `#DEDEDE`-`#F2F3F5` (never `#FFFFFF`); textSecondary no darker than ~`#8A8A90`. Fix
   failures by lightening text, not darkening surfaces.
8. **accent-text-legibility** — any chromatic token that may carry text/icons reaches
   ≥4.5:1 on surface (≥3:1 only for large/bold 24px+ or non-text UI). Mid-lightness
   saturated hexes (`#9146FF` ~3.4:1, `#0F52BA` ~2.7:1) fail as label colours: split
   into role pairs (deep hex for fills, lightened same-hue for text — `#9146FF` →
   `#BF94FF`). Fix by raising lightness, never saturation.
9. **glow-derivation** — glow within ±20° of primary or accent (or a deliberate 15-30°
   warm shift), lightness and saturation ≥ its source token, S ≥50%. Rebuild as the
   accent at S ~90-100%, L +10-20 points, used at 40-60% alpha with blur. Match
   multi-glow intensity at equal OKLCH L (~0.75-0.85).
10. **border-subtlety** — border 1.3:1-3:1 against surface, 5-15 lightness points above
    it (≈ white @12% composited), S ≤20% unless an intentional 1-2px accent keyline
    (paired with a 1px near-black inner line). Never brighter than textSecondary, never
    invisible (<1.2:1).
11. **shadow-anchor** — shadow is the darkest token (≤ background; `#000000`-`#0B0B10`
    acceptable here), S ≤20%, in the undertone band, designed for 40-70% alpha. A
    coloured shadow is a misfiled glow.
12. **cvd-semantic-safety** — success/warning/error survive deuteranopia, protanopia,
    and grayscale: every pair differs ≥20 lightness points OR uses CVD-safe positions
    (error → vermillion `#D55E00`/`#E5484D`, success → bluish green `#009E73`/`#30A46C`,
    warning → amber `#FFC53D`/`#E69F00`). FAIL pure/dark red error (`#FF0000`,
    `#8A0303`); FAIL success/warning within 15 lightness points. Colour is never the
    only carrier — every state also gets an icon or label.
13. **semantic-role-purity** — every semantic hue ≥30° from every accent hue, and ≥3:1
    against background. If the brand accent is green/red/amber-adjacent, shift the
    semantic hue or add a ≥25-point lightness offset. Red strictly for error/urgency,
    green for success — never decorative.
14. **gradient-pair-compatibility** — natural gradient pairs (primary↔secondary,
    accent↔accentSecondary, glow↔accent) sit 15-90° apart at roughly matched
    saturation. Pairs 150-210° apart FAIL unless a pivot stop is defined or OKLCH
    interpolation is mandated. Spot-check: sRGB-average the pair; if the midpoint's
    saturation is below ~60% of the endpoints', it crosses the grey dead zone.
15. **no-vibrating-pairs** — for every pair of tokens with S>70% (semantics included):
    FAIL if hues are 150-210° apart AND lightness differs by <25 points. Fix by
    splitting lightness 25-30+ points, desaturating one side ~25%, or mandating ≥4px of
    dark base between them in layouts.
16. **broadcast-chroma-safety** — no token whose RGB channels are only 0x00/0xFF
    combinations; no red/magenta at S>90% for thin strokes or text. Accents at ~70-85%
    saturation, mid luma, all channels carrying value; every edge-forming pair differs
    mainly in luminance (≥3:1). Red/magenta detail only in shapes ≥3-4px thick with a
    luma step.
17. **context-worst-case-check** — composite panels at intended opacity over `#FFFFFF`
    and `#000000`. Text ≥4.5:1 against the white-frame composite (scrims need ≥60-70%
    effective opacity); surface ≥~1.3:1 vs the black frame. Any palette whose legibility
    depends on what the video happens to show FAILS. Contrast is always computed against
    the owned surface, never the footage.

---

## 5. Sources

**Dark UI systems**: Material Design 2 Dark Theme (m2.material.io — the #121212 base,
elevation overlays, 200-tone desaturation, text emphasis tiers); Discord/Spotify/YouTube
shipped dark tokens; Refactoring UI "Building Your Color Palette"; Radix Colors palette
composition and 12-step scale docs; Tailwind color docs; IBM Carbon colour guidelines.

**Contrast & legibility**: WCAG 2.x SC 1.4.3/1.4.6/1.4.11; WebAIM "Contrast and Color";
APCA / Myndex SAPC discussions (polarity, the Y≈0.35 flip point); BBC Subtitle
Guidelines (5:1 broadcast floor); Smashing Magazine "Designing Accessible Text Over
Images"; NN/g text-over-images; Material scrim guidance; Twitch engineering blog on
algorithmic colour contrast.

**Harmony & perception**: Josef Albers, *Interaction of Color* (1963); Chevreul's
simultaneous contrast via Rhyne, "A Matter of Contrasts" (Nightingale); Envato Tuts+ on
vibrating combinations; IxDF on chromostereopsis and colour harmony; Supercharge Design
and Figma resource library on harmony schemes; UX Planet / Hype4 / freeCodeCamp on
60-30-10.

**Colour maths**: Evil Martians "OKLCH in CSS" and oklch.com; Josh Comeau "Make
Beautiful Gradients"; CSS-Tricks "The Gray Dead Zone of Gradients"; Adobe Leonardo;
Huetone; apcacontrast.com.

**Broadcast & streaming**: EBU R103 (legal levels); chroma subsampling references
(Wikipedia, RED Digital Cinema); playout.video overlay best practices; OWN3D / Nerd or
Die / Visuals by Impulse pack conventions; GETREKT Labs overlay guides; Karasch
on-stream text readability; Digital Nirvana / Rev captioning guidelines.

**CVD**: Okabe & Ito, Color Universal Design (jfly); Wong, *Nature Methods* (2011);
Datawrapper colour-blindness series; GOV.UK and Carbon accessibility guidance.

**Genre & flags**: Codista "Neon Mode"; CD Projekt RED via 80.lv (Cyberpunk 2077 brand);
Made Good Designs gothic palette; Edward George London Victorian colour guide; Glory of
the Snow dark academia swatches; Joe Kotlan "Using gold color on the web"; NOAA SWPC /
NPS aurora colour science; Strelka "The Colour of Fear"; progress.gay (Quasar's CC0
Progress flag spec); flagcolorcodes.com; HRC pride flag resources; the 2021 Disability
Pride flag redesign (accessibility precedent for stripe fields on screens).
