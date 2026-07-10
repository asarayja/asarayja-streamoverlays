"use client";

import { useId } from "react";
import type { ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* --------------------------------- Button --------------------------------- */

type ButtonVariant = "primary" | "ghost" | "outline" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-400 shadow-[0_6px_24px_-6px_rgba(139,92,246,0.7)] border border-brand-400/40",
  ghost: "text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent",
  outline: "text-zinc-200 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/10",
  danger: "text-red-300 hover:text-white hover:bg-red-500/20 border border-red-500/25",
};

export function Button({
  variant = "outline",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium",
        "transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
        BUTTON_STYLES[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------- Field --------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-zinc-400">{label}</span>
        {hint && <span className="text-[11px] text-zinc-600">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100",
        "placeholder:text-zinc-600 focus:border-brand-500/60 focus:outline-none",
        className,
      )}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "w-full appearance-none rounded-lg border border-white/10 bg-black/30 py-2 pl-3 pr-8 text-sm text-zinc-100",
        "focus:border-brand-500/60 focus:outline-none",
        // The popup is painted by the OS, and it only takes a handful of
        // properties. Setting them on the options themselves is the only way
        // to stop the list rendering as white-on-white.
        "[&>optgroup]:bg-ink-900 [&>optgroup]:font-semibold [&>optgroup]:text-zinc-500",
        "[&>option]:bg-ink-900 [&>option]:py-2 [&>option]:text-zinc-100",
        "[&>optgroup>option]:bg-ink-900 [&>optgroup>option]:text-zinc-100",
        // `appearance-none` removes the native arrow; `.select-chevron` in
        // globals.css paints ours.
        "select-chevron",
        className,
      )}
    >
      {children}
    </select>
  );
}

/* --------------------------------- Slider --------------------------------- */

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
  onBegin,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
  /**
   * Fired once when the drag starts. Undo history snapshots here, so a whole
   * drag collapses into a single undoable step instead of hundreds.
   */
  onBegin?: () => void;
  disabled?: boolean;
}) {
  const display = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return (
    <div className={cx("block", disabled && "opacity-40")}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium tracking-wide text-zinc-400">{label}</span>
        <span className="font-mono text-[11px] text-zinc-500">
          {display}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        disabled={disabled}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={() => onBegin?.()}
        onKeyDown={() => onBegin?.()}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10"
      />
    </div>
  );
}

/* --------------------------------- Toggle --------------------------------- */

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <label htmlFor={id} className="cursor-pointer text-xs font-medium tracking-wide text-zinc-400">
        {label}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-500" : "bg-white/12",
        )}
      >
        {/* `left-0` is load-bearing: an absolutely positioned box with `left:auto`
            falls back to its static position, which a button centres. */}
        <span
          className={cx(
            "absolute left-0 top-0.5 size-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

/* ------------------------------- ColorInput ------------------------------- */

/**
 * `<input type="color">` only understands `#rrggbb`. Theme references like
 * `@accent` and alpha colours are shown as text, and picking a colour replaces
 * the reference with a literal — which is exactly the semantics the user
 * expects when they reach for the swatch.
 */
export function ColorInput({
  value,
  onChange,
  onCommit,
  resolved,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  /** The colour actually painted, once the theme reference is resolved. */
  resolved: string;
}) {
  const isHex = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className="flex items-center gap-2">
      <div className="relative size-8 shrink-0 overflow-hidden rounded-lg border border-white/15">
        <div className="absolute inset-0" style={{ background: resolved }} />
        <input
          type="color"
          value={isHex ? value : "#8b5cf6"}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onCommit?.(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Pick colour"
        />
      </div>
      <TextInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit?.(e.target.value)}
        className="font-mono text-xs"
      />
    </div>
  );
}

/* -------------------------------- Segmented ------------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: ReactNode; title?: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-white/10 bg-black/30 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cx(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            option.value === value
              ? "bg-brand-500 text-white"
              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- Chip ---------------------------------- */

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-brand-400/60 bg-brand-500/20 text-brand-400"
          : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200",
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------- Section --------------------------------- */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-white/[0.06] px-4 py-4 last:border-0">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
