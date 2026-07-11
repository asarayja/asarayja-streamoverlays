import type { ChannelProfile, SocialPlatform } from "./types";

/**
 * The placeholder vocabulary templates are written against. Keep this list and
 * `buildPlaceholderMap` in lockstep — the editor surfaces it to the user as an
 * insertable token list.
 */
export const PLACEHOLDERS = [
  { token: "{{CHANNEL_NAME}}", label: "Channel name" },
  { token: "{{DISPLAY_NAME}}", label: "Display name" },
  { token: "{{SLOGAN}}", label: "Slogan" },
  { token: "{{LOGO}}", label: "Logo" },
  { token: "{{PROFILE_IMAGE}}", label: "Profile image" },
  { token: "{{TWITCH}}", label: "Twitch" },
  { token: "{{YOUTUBE}}", label: "YouTube" },
  { token: "{{KICK}}", label: "Kick" },
  { token: "{{DISCORD}}", label: "Discord" },
  { token: "{{X}}", label: "X" },
  { token: "{{TIKTOK}}", label: "TikTok" },
  { token: "{{INSTAGRAM}}", label: "Instagram" },
  { token: "{{FACEBOOK}}", label: "Facebook" },
  { token: "{{STEAM}}", label: "Steam" },
  { token: "{{EPIC}}", label: "Epic Games" },
  { token: "{{BATTLENET}}", label: "Battle.net" },
  { token: "{{ROBLOX}}", label: "Roblox" },
  { token: "{{MINECRAFT}}", label: "Minecraft" },
  { token: "{{WEBSITE}}", label: "Website" },
] as const;

const SOCIAL_TOKENS: Record<string, SocialPlatform> = {
  TWITCH: "twitch",
  YOUTUBE: "youtube",
  KICK: "kick",
  DISCORD: "discord",
  X: "x",
  TIKTOK: "tiktok",
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
  STEAM: "steam",
  EPIC: "epic",
  BATTLENET: "battlenet",
  ROBLOX: "roblox",
  MINECRAFT: "minecraft",
  WEBSITE: "website",
};

export function buildPlaceholderMap(profile: ChannelProfile): Record<string, string> {
  const map: Record<string, string> = {
    CHANNEL_NAME: profile.channelName,
    DISPLAY_NAME: profile.displayName || profile.channelName,
    SLOGAN: profile.slogan,
    // A dedicated logo wins, but fall back to the profile picture (what the
    // first-run popup and the profile page collect) so a set image just shows.
    LOGO: profile.logo || profile.profileImage,
    PROFILE_IMAGE: profile.profileImage || profile.logo,
  };
  for (const [token, platform] of Object.entries(SOCIAL_TOKENS)) {
    map[token] = profile.socials[platform] ?? "";
  }
  return map;
}

const TOKEN_RE = /\{\{\s*([A-Z_]+)\s*\}\}/g;

/**
 * What an *unset* profile field resolves to.
 *
 * `label` puts the token's human name on screen ("Slogan"), which is the right
 * affordance while editing — an empty layer is invisible and unselectable.
 * `empty` erases it, which is the only acceptable behaviour on a live stream:
 * nobody wants the word "Slogan" burned into their overlay.
 */
export type MissingFieldMode = "label" | "empty";

export function resolveText(
  input: string,
  profile: ChannelProfile,
  onMissing: MissingFieldMode = "label",
): string {
  if (!input.includes("{{")) return input;
  const map = buildPlaceholderMap(profile);
  return input.replace(TOKEN_RE, (whole, token: string) => {
    const value = map[token];
    if (value) return value;
    if (onMissing === "empty") return "";
    const known = PLACEHOLDERS.find((p) => p.token === `{{${token}}}`);
    return known ? known.label : whole;
  });
}

/**
 * Same as `resolveText` but for image sources: an unset field must resolve to
 * an empty string so the renderer can draw its placeholder box instead of
 * trying to load "Logo" as a URL.
 */
export function resolveSrc(input: string, profile: ChannelProfile): string {
  if (!input.includes("{{")) return input;
  const map = buildPlaceholderMap(profile);
  return input.replace(TOKEN_RE, (_whole, token: string) => map[token] ?? "");
}

export function containsPlaceholder(input: string): boolean {
  return /\{\{\s*[A-Z_]+\s*\}\}/.test(input);
}
