"use client";

import { Circle, Group, Line, Rect, Text } from "react-konva";
import type { SocialPlatform } from "@/lib/types";

/**
 * Platform marks drawn from Konva primitives on a 24×24 grid.
 *
 * These are deliberately *not* the official brand SVGs — those are trademarked
 * and can't ship inside a commercial-use asset library. Each mark is an
 * original geometric interpretation, and every platform without a distinctive
 * silhouette falls back to a monogram badge so the set stays visually uniform.
 */

interface GlyphProps {
  platform: SocialPlatform;
  size: number;
  color: string;
}

const MONOGRAM: Partial<Record<SocialPlatform, string>> = {
  kick: "K",
  steam: "S",
  epic: "E",
  battlenet: "B",
  roblox: "R",
  minecraft: "M",
  facebook: "f",
};

export function SocialGlyph({ platform, size, color }: GlyphProps) {
  const u = size / 24; // one grid unit in px
  const stroke = Math.max(1, 2 * u);

  const monogram = MONOGRAM[platform];
  if (monogram) {
    return (
      <Group listening={false}>
        <Rect
          width={size}
          height={size}
          cornerRadius={6 * u}
          stroke={color}
          strokeWidth={stroke}
        />
        <Text
          text={monogram}
          width={size}
          height={size}
          align="center"
          verticalAlign="middle"
          fontFamily="Inter"
          fontStyle="700"
          fontSize={13 * u}
          fill={color}
          listening={false}
        />
      </Group>
    );
  }

  switch (platform) {
    case "twitch":
      // Speech-bubble silhouette with the signature clipped corner and two bars.
      return (
        <Group listening={false}>
          <Line
            closed
            points={[3, 2, 21, 2, 21, 14, 16, 19, 12, 19, 8, 23, 8, 19, 3, 19].map((n) => n * u)}
            stroke={color}
            strokeWidth={stroke}
            lineJoin="round"
          />
          <Rect x={10 * u} y={7 * u} width={stroke} height={6 * u} fill={color} />
          <Rect x={15 * u} y={7 * u} width={stroke} height={6 * u} fill={color} />
        </Group>
      );

    case "youtube":
      return (
        <Group listening={false}>
          <Rect
            x={1 * u}
            y={5 * u}
            width={22 * u}
            height={14 * u}
            cornerRadius={5 * u}
            stroke={color}
            strokeWidth={stroke}
          />
          <Line closed points={[10, 9, 16, 12, 10, 15].map((n) => n * u)} fill={color} />
        </Group>
      );

    case "instagram":
      return (
        <Group listening={false}>
          <Rect
            x={2 * u}
            y={2 * u}
            width={20 * u}
            height={20 * u}
            cornerRadius={6 * u}
            stroke={color}
            strokeWidth={stroke}
          />
          <Circle x={12 * u} y={12 * u} radius={5 * u} stroke={color} strokeWidth={stroke} />
          <Circle x={17.5 * u} y={6.5 * u} radius={1.2 * u} fill={color} />
        </Group>
      );

    case "x":
      return (
        <Group listening={false}>
          <Line points={[4, 3, 20, 21].map((n) => n * u)} stroke={color} strokeWidth={stroke * 1.15} lineCap="round" />
          <Line points={[20, 3, 4, 21].map((n) => n * u)} stroke={color} strokeWidth={stroke * 1.15} lineCap="round" />
        </Group>
      );

    case "discord":
      // Rounded controller-like face with two eyes.
      return (
        <Group listening={false}>
          <Line
            closed
            points={[5, 6, 19, 6, 22, 18, 17, 20, 15, 17, 9, 17, 7, 20, 2, 18].map((n) => n * u)}
            stroke={color}
            strokeWidth={stroke}
            lineJoin="round"
          />
          <Circle x={9.5 * u} y={12 * u} radius={1.5 * u} fill={color} />
          <Circle x={14.5 * u} y={12 * u} radius={1.5 * u} fill={color} />
        </Group>
      );

    case "tiktok":
      // Eighth note: stem, flag, and note head.
      return (
        <Group listening={false}>
          <Line points={[13, 3, 13, 16].map((n) => n * u)} stroke={color} strokeWidth={stroke} lineCap="round" />
          <Line
            points={[13, 3, 17, 5, 19, 9].map((n) => n * u)}
            stroke={color}
            strokeWidth={stroke}
            lineCap="round"
            tension={0.4}
          />
          <Circle x={9.5 * u} y={16.5 * u} radius={4 * u} stroke={color} strokeWidth={stroke} />
        </Group>
      );

    case "website":
      return (
        <Group listening={false}>
          <Circle x={12 * u} y={12 * u} radius={10 * u} stroke={color} strokeWidth={stroke} />
          <Line points={[2, 12, 22, 12].map((n) => n * u)} stroke={color} strokeWidth={stroke} />
          <Line
            points={[12, 2, 7, 12, 12, 22, 17, 12, 12, 2].map((n) => n * u)}
            stroke={color}
            strokeWidth={stroke}
            tension={0.1}
          />
        </Group>
      );

    default:
      return (
        <Rect width={size} height={size} cornerRadius={6 * u} stroke={color} strokeWidth={stroke} listening={false} />
      );
  }
}

/** How a handle is written for each platform. */
export function formatHandle(platform: SocialPlatform, handle: string): string {
  if (!handle) return "";
  switch (platform) {
    case "website":
      return handle.replace(/^https?:\/\//, "");
    case "youtube":
      return handle.startsWith("@") ? handle : `@${handle}`;
    case "discord":
    case "minecraft":
    case "roblox":
    case "steam":
    case "epic":
    case "battlenet":
      return handle;
    default:
      return handle.startsWith("@") ? handle : `@${handle}`;
  }
}
