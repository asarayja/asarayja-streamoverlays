"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getPalette, DEFAULT_PALETTE_ID } from "@/data/palettes";
import { completeTheme } from "@/lib/theme";
import type { ChannelProfile, SocialPlatform, Theme, ThemeToken } from "@/lib/types";

export const EMPTY_PROFILE: ChannelProfile = {
  channelName: "",
  displayName: "",
  slogan: "",
  logo: "",
  profileImage: "",
  socials: {
    twitch: "",
    youtube: "",
    kick: "",
    discord: "",
    x: "",
    tiktok: "",
    instagram: "",
    facebook: "",
    steam: "",
    epic: "",
    battlenet: "",
    roblox: "",
    minecraft: "",
    website: "",
  },
  theme: getPalette(DEFAULT_PALETTE_ID).theme,
};

/** Shown until the user fills in their own, so templates never preview blank. */
export const DEMO_PROFILE: ChannelProfile = {
  ...EMPTY_PROFILE,
  channelName: "MelissaGaming",
  displayName: "Melissa",
  slogan: "Chaos, coffee and questionable aim",
  socials: {
    ...EMPTY_PROFILE.socials,
    twitch: "melissagaming",
    youtube: "@melissagaming",
    discord: "melissa",
    instagram: "melissa.plays",
    tiktok: "melissagaming",
    x: "melissaplays",
  },
};

interface ProfileState {
  profile: ChannelProfile;
  /** True once the user has entered anything — gates the demo fallback. */
  configured: boolean;
  /** False until localStorage has been read — distinguishes "new user" from "not loaded". */
  hydrated: boolean;
  markHydrated: () => void;
  setField: <K extends keyof ChannelProfile>(key: K, value: ChannelProfile[K]) => void;
  setSocial: (platform: SocialPlatform, handle: string) => void;
  setThemeToken: (token: ThemeToken, color: string) => void;
  setTheme: (theme: Theme) => void;
  reset: () => void;
  loadDemo: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: EMPTY_PROFILE,
      configured: false,
      hydrated: false,
      markHydrated: () => set({ hydrated: true }),
      setField: (key, value) =>
        set((s) => ({ profile: { ...s.profile, [key]: value }, configured: true })),
      setSocial: (platform, handle) =>
        set((s) => ({
          profile: { ...s.profile, socials: { ...s.profile.socials, [platform]: handle } },
          configured: true,
        })),
      setThemeToken: (token, color) =>
        set((s) => ({
          profile: { ...s.profile, theme: { ...s.profile.theme, [token]: color } },
          configured: true,
        })),
      setTheme: (theme) => set((s) => ({ profile: { ...s.profile, theme }, configured: true })),
      reset: () => set({ profile: EMPTY_PROFILE, configured: false }),
      loadDemo: () => set({ profile: DEMO_PROFILE, configured: true }),
    }),
    {
      name: "asarayja:profile",
      version: 2,
      skipHydration: true,
      partialize: ({ profile, configured }) => ({ profile, configured }),
      // v1 themes predate the sixteen-token system; derive the new tokens.
      migrate: (persisted) => {
        const state = persisted as ProfileState;
        if (state?.profile?.theme) state.profile.theme = completeTheme(state.profile.theme);
        return state;
      },
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);

/**
 * The profile used for *rendering*. An unconfigured user still gets a template
 * gallery that looks like a real channel rather than a wall of empty strings.
 */
export function useRenderProfile(): ChannelProfile {
  const profile = useProfileStore((s) => s.profile);
  const configured = useProfileStore((s) => s.configured);
  return configured ? profile : DEMO_PROFILE;
}
