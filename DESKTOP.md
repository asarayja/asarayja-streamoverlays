# Desktop app (Tauri)

The desktop build wraps the exact same static Next.js export that ships to the
web (`out/`) in a native Tauri window — so the overlay editor, projects and
exports behave identically on Windows, macOS and Linux, just offline in a real
app window.

> **No CI yet.** We build each platform by hand for now: Linux directly in this
> repo, Windows on a Windows machine. macOS and a GitHub Actions release matrix
> are deferred.

## Layout

- `src-tauri/` — the Rust shell (`Cargo.toml`, `tauri.conf.json`, `src/`, icons).
- Frontend = the existing app. Tauri runs `npm run build` and serves `out/`.
- `next.config.ts` already drops `basePath` unless `GITHUB_PAGES=true`, so the
  desktop build loads assets from the root with no changes.

## Prerequisites

- **Node** 20+ and **Rust** (stable) — <https://rustup.rs>.
- **Linux only:** `webkit2gtk-4.1`, `gtk-3`, `libsoup-3`, `librsvg2`,
  `libappindicator3` dev packages (already present in this environment).

## Commands

```bash
npm run desktop:dev     # live dev — runs `next dev` and opens the app window
npm run desktop:build   # production build for the current OS
```

`desktop:build` runs `next build` then bundles.

### Linux (built here)

```bash
npx tauri build --bundles deb,appimage
```

Outputs under `src-tauri/target/release/bundle/`:

- `deb/…_amd64.deb` — Debian/Ubuntu installer (~9 MB)
- `appimage/…_amd64.AppImage` — portable, runs anywhere (~84 MB)

### Windows (built on a Windows machine)

```powershell
npm ci
npm run desktop:build   # → .msi (WiX) and .exe (NSIS) under src-tauri\target\release\bundle
```

#### Self-signed code signing — "Asarayja development"

Windows SmartScreen flags unsigned installers. A self-signed cert removes the
"unknown publisher" line (users still get a one-time SmartScreen prompt, which
is expected for a self-signed cert):

```powershell
# 1. Create the cert (once), in the current user's store
$cert = New-SelfSignedCertificate -Type CodeSigningCert `
  -Subject "CN=Asarayja development" `
  -CertStoreLocation Cert:\CurrentUser\My
$cert.Thumbprint   # copy this
```

Then set the thumbprint in `src-tauri/tauri.conf.json` → `bundle.windows.certificateThumbprint`
(currently `null` = unsigned), and rebuild. `timestampUrl` and `digestAlgorithm`
are already configured. Optionally export the `.cer` and hand it to users to
trust the publisher.

### macOS

Deferred. Once we have a Mac (or CI), `npx tauri build` produces a `.dmg` /
`.app`; distribution needs an Apple Developer ID for notarization.
