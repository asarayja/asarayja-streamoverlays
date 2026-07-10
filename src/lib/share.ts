import { completeTheme } from "./theme";
import type { ChannelProfile, Project } from "./types";

/**
 * Self-contained OBS links.
 *
 * OBS's browser source is a separate Chromium process with its own origin
 * storage, so it can never read the project the user just saved in their
 * browser. Until there's a backend to fetch from, the link has to *carry* the
 * overlay: we gzip the project + profile and put it in the URL fragment.
 *
 * The fragment is chosen deliberately — it is never sent to a server, so the
 * payload stays on the user's machine even once a backend exists.
 */

export interface SharePayload {
  project: Project;
  profile: ChannelProfile;
}

const hasCompression = () =>
  typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array<ArrayBufferLike>): string {
  let binary = "";
  const CHUNK = 0x8000; // avoid blowing the argument limit on large payloads
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function encodePayload(payload: SharePayload): Promise<string> {
  const json = new Uint8Array(new TextEncoder().encode(JSON.stringify(payload)));
  if (!hasCompression()) return "r" + bytesToBase64Url(json);

  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  void writer.write(json);
  void writer.close();
  const gz = await streamToBytes(cs.readable);
  return "z" + bytesToBase64Url(gz);
}

export async function decodePayload(encoded: string): Promise<SharePayload | null> {
  try {
    const kind = encoded[0];
    const bytes = base64UrlToBytes(encoded.slice(1));

    let json: string;
    if (kind === "z") {
      if (!hasCompression()) return null;
      const ds = new DecompressionStream("gzip");
      const writer = ds.writable.getWriter();
      void writer.write(bytes);
      void writer.close();
      json = new TextDecoder().decode(await streamToBytes(ds.readable));
    } else if (kind === "r") {
      json = new TextDecoder().decode(bytes);
    } else {
      return null;
    }
    const payload = JSON.parse(json) as SharePayload;
    // Links minted before the token set grew carry eight-token themes.
    payload.project.theme = completeTheme(payload.project.theme);
    payload.profile.theme = completeTheme(payload.profile.theme);
    return payload;
  } catch {
    return null;
  }
}

export async function buildObsUrl(payload: SharePayload): Promise<string> {
  const encoded = await encodePayload(payload);
  if (typeof window === "undefined") return "";
  const { origin, pathname } = window.location;
  // Derive the app's base path from the editor URL — empty when served at a
  // root, the repo subpath on GitHub Pages — so the OBS link resolves wherever
  // the app is hosted. Trailing slash matches the static export's dir/index.html.
  const base = pathname.replace(/\/editor\/?$/, "");
  return `${origin}${base}/live/overlay/?code=${payload.project.obsCode}#d=${encoded}`;
}

/**
 * Same-origin live sync: when the studio and a `/live` tab are open in the same
 * browser, edits stream across instantly instead of waiting for a reload.
 */
const CHANNEL = "asarayja-live";

export function publishLive(payload: SharePayload): void {
  if (typeof BroadcastChannel === "undefined") return;
  const bc = new BroadcastChannel(CHANNEL);
  bc.postMessage(payload);
  bc.close();
}

export function subscribeLive(
  obsCode: string,
  onUpdate: (payload: SharePayload) => void,
): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const bc = new BroadcastChannel(CHANNEL);
  bc.onmessage = (event: MessageEvent<SharePayload>) => {
    if (event.data?.project?.obsCode === obsCode) onUpdate(event.data);
  };
  return () => bc.close();
}
