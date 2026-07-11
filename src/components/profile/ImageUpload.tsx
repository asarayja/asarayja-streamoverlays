"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button, cx } from "@/components/ui";
import { fileToDataUrl } from "@/lib/image";
import { useT } from "@/lib/i18n";

export function ImageUpload({
  label,
  value,
  onChange,
  round,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  round?: boolean;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      onChange(await fileToDataUrl(file));
    } catch {
      setError(t("Could not read that image."));
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium tracking-wide text-zinc-400">{label}</p>
      <div className="flex items-center gap-3">
        <div
          className={cx(
            "checker grid size-20 shrink-0 place-items-center overflow-hidden border border-white/10",
            round ? "rounded-full" : "rounded-xl",
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="size-full object-contain" />
          ) : (
            <ImagePlus className="size-6 text-zinc-600" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          <Button onClick={() => inputRef.current?.click()}>
            {value ? t("Replace") : t("Upload")}
          </Button>
          {value && (
            <Button variant="danger" onClick={() => onChange("")}>
              <Trash2 className="size-3.5" />
              {t("Remove")}
            </Button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
        {t("Scaled to 512 px and stored in your browser. PNG with transparency works best.")}
      </p>
    </div>
  );
}
