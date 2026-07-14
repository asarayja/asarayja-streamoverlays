# Sprite samples

Test sheet for the **Import sprite / GIF** feature in the editor. It imports with
the frame grid and background handled automatically.

| File | Grid | Background |
|------|------|------------|
| `walk-green-10frames.webp` | 10×1, 10 frames | Green screen — auto-removed on import (chroma key + despill) |
| `walk-green-10frames-transparent.png` | 10×1, 10 frames | Same sheet with the green already knocked out (real alpha) |

## How to use

1. Editor → **Add** panel → **Import sprite / GIF** → pick a file.
2. The grid (Cols / Rows / Frames) and background removal are detected on import.
3. Pick a **Movement** preset (e.g. *Walk left / right*) and place it.
