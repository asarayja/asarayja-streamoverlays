"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ImagePlus, UserRound, X, Zap } from "lucide-react";
import { Button, Field, TextInput, cx } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { fileToDataUrl } from "@/lib/image";
import { useProfileStore } from "@/store/profile";

const SEEN_KEY = "asarayja:onboarded";

/**
 * First-run welcome. A brand-new visitor is asked only for a channel name and a
 * picture — just enough for overlays to preview as their channel — and pointed
 * to the full channel profile for the rest. Shown once, then never again.
 *
 * It is deliberately mounted app-wide but self-gates: never over the OBS source
 * (/live) — a modal there would burn into the stream — nor over the editor.
 */
export function Onboarding() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useProfileStore((s) => s.hydrated);
  const configured = useProfileStore((s) => s.configured);
  const setField = useProfileStore((s) => s.setField);

  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY) === "1") setDismissed(true);
    setReady(true);
  }, []);

  const onSite = !pathname.startsWith("/live") && !pathname.startsWith("/editor");
  if (!ready || !hydrated || configured || dismissed || !onSite) return null;

  const close = () => {
    localStorage.setItem(SEEN_KEY, "1");
    setDismissed(true);
  };

  const persist = () => {
    const trimmed = name.trim();
    if (trimmed) {
      setField("channelName", trimmed);
      setField("displayName", trimmed);
    }
    if (image) setField("profileImage", image);
  };

  const save = () => {
    persist();
    close();
  };

  const openFullProfile = () => {
    persist();
    close();
    router.push("/profile");
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setImage(await fileToDataUrl(file));
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="liquid-glass animate-rise w-full max-w-md overflow-hidden rounded-2xl shadow-2xl">
        <div className="relative border-b border-white/[0.06] px-6 py-5">
          <button
            onClick={close}
            aria-label={t("Skip for now")}
            className="absolute right-4 top-4 text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <X className="size-4" />
          </button>
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-glow shadow-[0_4px_16px_-4px_rgba(139,92,246,0.8)]">
            <Zap className="size-4 fill-white text-white" />
          </span>
          <h2 className="mt-3 text-lg font-semibold text-white">{t("Welcome to Asarayja Overlays")}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
            {t("Add your channel name and a picture so overlays preview as you. You can fill in the rest of your profile whenever you like.")}
          </p>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.03]">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="size-full object-cover" />
              ) : (
                <UserRound className="size-6 text-zinc-600" />
              )}
            </div>
            <label
              className={cx(
                "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-zinc-200",
                "transition-colors hover:bg-white/[0.08]",
              )}
            >
              <ImagePlus className="size-4" />
              {image ? t("Change picture") : t("Upload picture")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void pickImage(e.target.files?.[0])}
              />
            </label>
          </div>

          <Field label={t("Channel name")}>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("e.g. MelissaGaming")}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) save();
              }}
            />
          </Field>

          <Button variant="primary" className="w-full" onClick={save} disabled={!name.trim() && !image}>
            {t("Save and continue")}
          </Button>

          <div className="flex items-center justify-between text-[13px]">
            <button onClick={openFullProfile} className="font-medium text-brand-400 hover:text-brand-300">
              {t("Set up full profile")}
            </button>
            <button onClick={close} className="text-zinc-500 hover:text-zinc-300">
              {t("Skip for now")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
