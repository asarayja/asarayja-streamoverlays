# Building the Windows desktop app

The same Tauri shell as Linux, built on a Windows machine, produces two
installers: a WiX **`.msi`** and an NSIS **`.exe`**, plus a raw `.exe`. This is a
one-person, no-CI flow — everything runs locally on Windows.

## 1. Prerequisites (one-time)

| Tool | Where | Notes |
|------|-------|-------|
| **Node.js** LTS (20+) | <https://nodejs.org> | ships `npm` |
| **Rust** (stable) | <https://rustup.rs> | pick the **MSVC** toolchain (default) |
| **Microsoft C++ Build Tools** | [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) | install the **“Desktop development with C++”** workload — provides `link.exe`, needed by Rust |
| **WebView2 Runtime** | preinstalled on Win 10/11 | if missing, install the [Evergreen runtime](https://developer.microsoft.com/microsoft-edge/webview2/). Tauri renders the app in the system WebView2 |

## 2. Get the code

```powershell
git clone https://github.com/asarayja/asarayja-streamoverlays.git
cd asarayja-streamoverlays
git checkout desktop-tauri
npm ci
```

## 3. Build

```powershell
npm run desktop:build
```

This runs `next build` (the static frontend) then compiles + bundles. First run
is slow (Rust compiles hundreds of crates); later builds are incremental.

**Outputs** (under `src-tauri\target\release\`):

- `bundle\msi\Asarayja Stream Overlays_0.1.0_x64_en-US.msi` — MSI installer
- `bundle\nsis\Asarayja Stream Overlays_0.1.0_x64-setup.exe` — NSIS installer
- `asarayja-overlays.exe` — the raw app, double-click to test without installing

## 4. Self-signed code signing — “Asarayja development”

Unsigned installers get a SmartScreen “unknown publisher” warning. A self-signed
certificate sets the publisher name and signs the binaries. (It still shows a
one-time SmartScreen prompt unless the user trusts the cert — that’s expected;
only a paid CA cert removes it entirely.)

### 4a. Create the cert (once)

```powershell
$cert = New-SelfSignedCertificate -Type CodeSigningCert `
  -Subject "CN=Asarayja development" `
  -CertStoreLocation Cert:\CurrentUser\My `
  -KeyUsage DigitalSignature `
  -FriendlyName "Asarayja development" `
  -NotAfter (Get-Date).AddYears(5)
$cert.Thumbprint      # copy this — 40 hex chars
```

### 4b. Point Tauri at it

In `src-tauri\tauri.conf.json`, under `bundle.windows`, replace the null
thumbprint:

```jsonc
"windows": {
  "digestAlgorithm": "sha256",
  "timestampUrl": "http://timestamp.digicert.com",
  "certificateThumbprint": "PASTE_THE_THUMBPRINT_HERE"
}
```

> Don’t commit your real thumbprint if the cert is personal — keep it local, or
> pass it at build time instead:
> `npx tauri build --config "{\"bundle\":{\"windows\":{\"certificateThumbprint\":\"...\"}}}"`

### 4c. Rebuild

```powershell
npm run desktop:build
```

Tauri now signs `asarayja-overlays.exe` and both installers.

### 4d. (optional) let users trust the publisher

```powershell
Export-Certificate -Cert $cert -FilePath Asarayja-dev.cer
```

Share `Asarayja-dev.cer`; users import it into **Trusted Root Certification
Authorities** (and Trusted Publishers) to silence the warning.

## 5. Troubleshooting

- **`link.exe` not found / linker errors** → the C++ Build Tools workload isn’t
  installed (step 1).
- **App window is blank / WebView2 error** → install the WebView2 Evergreen
  runtime.
- **`signtool` not found when signing** → it comes with the Windows SDK, which
  the C++ Build Tools workload includes.
- Icons and config are shared with Linux — `icon.ico` is already generated, no
  Windows-specific icon step.

## 6. Distribute

Hand out the **`.msi`** (clean per-machine install) or the friendlier NSIS
**`.exe`**. Both live under `src-tauri\target\release\bundle\`.
