"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { TEMPLATES } from "@/data/templates";
import { ClientOverlayStage } from "@/components/overlay/ClientOverlayStage";
import { ContrastCheck } from "@/components/ContrastCheck";
import { HarmonyGenerator, PaletteGrid, ThemeTokens } from "@/components/ThemeEditor";
import { ImageUpload } from "@/components/profile/ImageUpload";
import { TopNav } from "@/components/site/TopNav";
import { Button, Field, TextInput } from "@/components/ui";
import { useElementSize } from "@/lib/useElementSize";
import { useClock } from "@/lib/useClock";
import { SOCIAL_PLATFORMS } from "@/lib/types";
import type { SocialPlatform } from "@/lib/types";
import { useProfileStore, useRenderProfile } from "@/store/profile";
import { useT } from "@/lib/i18n";

const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  kick: "Kick",
  discord: "Discord",
  x: "X",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  steam: "Steam",
  epic: "Epic Games",
  battlenet: "Battle.net",
  roblox: "Roblox",
  minecraft: "Minecraft",
  website: "Website",
};

/** A template that shows off the name, logo, slogan and socials at once. */
const PREVIEW_TEMPLATE_ID = "halo-starting--purple-neon";

export default function ProfilePage() {
  const t = useT();
  const { profile, configured, setField, setSocial, setTheme, reset, loadDemo } =
    useProfileStore();
  const patchTheme = (patch: Partial<typeof profile.theme>) =>
    setTheme({ ...profile.theme, ...patch });
  const renderProfile = useRenderProfile();
  const [previewRef, previewSize] = useElementSize<HTMLDivElement>();
  const [saved, setSaved] = useState(false);
  // Unbounded: entry animations play once, ambient motion continues forever.
  const time = useClock(true);

  const template = TEMPLATES.find((t) => t.id === PREVIEW_TEMPLATE_ID) ?? TEMPLATES[0];

  // Everything writes straight to the persisted store; this is just a receipt.
  const confirmSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="app-bg min-h-screen">
      <TopNav />

      <main className="mx-auto grid max-w-[1600px] gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="space-y-6">
          <header>
            {!configured && (
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-400">
                {t("Step 1 of 2 · Set up your channel")}
              </span>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {configured ? t("Channel profile") : t("Welcome — let's set up your channel")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              {t("Enter this once. Templates are written against placeholders like")}{" "}
              <code className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[11px] text-brand-400">
                {"{{CHANNEL_NAME}}"}
              </code>{" "}
              {t("and")}{" "}
              <code className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[11px] text-brand-400">
                {"{{LOGO}}"}
              </code>
              {t(", so every overlay you open is already filled in with your details. You can change any of it later.")}
            </p>
          </header>

          <div className="panel rounded-2xl p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-200">{t("Identity")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Channel name")} hint="{{CHANNEL_NAME}}">
                <TextInput
                  value={profile.channelName}
                  onChange={(e) => setField("channelName", e.target.value)}
                  onBlur={confirmSaved}
                  placeholder="MelissaGaming"
                />
              </Field>
              <Field label={t("Display name")} hint="{{DISPLAY_NAME}}">
                <TextInput
                  value={profile.displayName}
                  onChange={(e) => setField("displayName", e.target.value)}
                  onBlur={confirmSaved}
                  placeholder="Melissa"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t("Slogan")} hint="{{SLOGAN}}">
                  <TextInput
                    value={profile.slogan}
                    onChange={(e) => setField("slogan", e.target.value)}
                    onBlur={confirmSaved}
                    placeholder={t("Chaos, coffee and questionable aim")}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <ImageUpload
                label={t("Logo · {{LOGO}}")}
                value={profile.logo}
                onChange={(v) => {
                  setField("logo", v);
                  confirmSaved();
                }}
              />
              <ImageUpload
                label={t("Profile image · {{PROFILE_IMAGE}}")}
                round
                value={profile.profileImage}
                onChange={(v) => {
                  setField("profileImage", v);
                  confirmSaved();
                }}
              />
            </div>
          </div>

          <div className="panel rounded-2xl p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-200">{t("Socials")}</h2>
            <p className="mb-4 text-xs text-zinc-500">
              {t("Leave a field empty to hide it. Handles render without the @ where the platform doesn't use one.")}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SOCIAL_PLATFORMS.map((platform) => (
                <Field key={platform} label={t(SOCIAL_LABELS[platform])}>
                  <TextInput
                    value={profile.socials[platform]}
                    onChange={(e) => setSocial(platform, e.target.value)}
                    onBlur={confirmSaved}
                    placeholder={platform === "website" ? "melissa.gg" : t("handle")}
                  />
                </Field>
              ))}
            </div>
          </div>

          <div className="panel rounded-2xl p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-200">{t("Brand colours")}</h2>
            <p className="mb-4 text-xs text-zinc-500">
              {t("Your default theme. Change one token and every layer that references it repaints.")}
            </p>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <PaletteGrid theme={profile.theme} onApply={setTheme} />
                <HarmonyGenerator theme={profile.theme} onApply={setTheme} />
                <div className="border-t border-white/[0.06] pt-4">
                  <ContrastCheck theme={profile.theme} onFix={patchTheme} />
                </div>
              </div>
              <ThemeTokens theme={profile.theme} onPatch={patchTheme} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/">
              <Button variant="primary">
                {configured ? t("Browse designs") : t("Continue to designs")}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Button onClick={loadDemo}>{t("Fill with demo data")}</Button>
            <Button variant="danger" onClick={reset}>
              <RotateCcw className="size-3.5" />
              {t("Reset profile")}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <Check className="size-3.5" />
                {t("Saved")}
              </span>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="panel overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {t("Live preview")}
              </p>
              {!configured && (
                <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                  {t("Demo data")}
                </span>
              )}
            </div>
            <div ref={previewRef} className="checker aspect-video w-full">
              {previewSize.width > 0 && (
                <ClientOverlayStage
                  layers={template.layers}
                  theme={profile.theme}
                  profile={renderProfile}
                  time={time}
                  mode="preview"
                  width={previewSize.width}
                />
              )}
            </div>
            <p className="px-4 py-3 text-[11px] leading-relaxed text-zinc-500">
              {t("This is a real template rendering your profile — not a mockup. Every field above feeds the same placeholder resolver the editor and OBS source use.")}
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
