import { readFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import { createElement } from "react";
import satori from "satori";

export interface SocialKitInput {
  name: string;
  tagline: string;
  primary: string;
  accent: string;
  ink: string;
  paper: string;
  monogram: string;
}

export interface SocialAsset {
  id: string;
  platform: string;
  kind: "avatar" | "cover" | "og";
  width: number;
  height: number;
  svg: string;
  png: Uint8Array;
}

interface SocialSpec {
  id: string;
  platform: string;
  kind: SocialAsset["kind"];
  width: number;
  height: number;
}

// These are source dimensions, not CSS display dimensions. Keeping the table
// here makes platform changes explicit and keeps all generated crops reproducible.
const SOCIAL_SPECS: SocialSpec[] = [
  { id: "x-avatar", platform: "X", kind: "avatar", width: 400, height: 400 },
  { id: "x-header", platform: "X", kind: "cover", width: 1500, height: 500 },
  { id: "linkedin-profile", platform: "LinkedIn", kind: "avatar", width: 400, height: 400 },
  { id: "linkedin-cover", platform: "LinkedIn", kind: "cover", width: 1584, height: 396 },
  { id: "instagram-profile", platform: "Instagram", kind: "avatar", width: 320, height: 320 },
  { id: "instagram-post", platform: "Instagram", kind: "og", width: 1080, height: 1080 },
  { id: "youtube-avatar", platform: "YouTube", kind: "avatar", width: 800, height: 800 },
  { id: "youtube-banner", platform: "YouTube", kind: "cover", width: 2560, height: 1440 },
  { id: "facebook-cover", platform: "Facebook", kind: "cover", width: 1640, height: 624 },
  { id: "github-avatar", platform: "GitHub", kind: "avatar", width: 500, height: 500 },
  { id: "discord-avatar", platform: "Discord", kind: "avatar", width: 512, height: 512 },
  { id: "open-graph", platform: "Web", kind: "og", width: 1200, height: 630 },
];

const fontDataPromise = readFile(new URL("./fonts/inter-latin-400-normal.woff", import.meta.url));

function clampText(value: string, limit: number): string {
  const trimmed = value.trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1).trimEnd()}…` : trimmed;
}

function assetElement(input: SocialKitInput, spec: SocialSpec) {
  const avatar = spec.kind === "avatar";
  const compact = spec.width / spec.height < 1.8;
  const padding = Math.round(Math.min(spec.width, spec.height) * (avatar ? 0.1 : 0.075));
  const monogramSize = Math.round(Math.min(spec.width, spec.height) * (avatar ? 0.42 : 0.18));
  const nameSize = Math.round(Math.min(spec.width, spec.height) * (compact ? 0.11 : 0.16));

  if (avatar) {
    return createElement(
      "div",
      {
        style: {
          alignItems: "center",
          background: input.primary,
          color: input.paper,
          display: "flex",
          fontFamily: "Inter",
          fontSize: monogramSize,
          fontWeight: 700,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-0.08em",
          width: "100%",
        },
      },
      input.monogram,
    );
  }

  return createElement(
    "div",
    {
      style: {
        background: input.paper,
        color: input.ink,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding,
        width: "100%",
      },
    },
    createElement("div", { style: { background: input.accent, height: Math.max(8, Math.round(spec.height * 0.025)), width: "34%" } }),
    createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: Math.max(8, Math.round(spec.height * 0.03)) } },
      createElement("div", { style: { color: input.primary, fontSize: monogramSize, fontWeight: 700, letterSpacing: "-0.08em" } }, input.monogram),
      createElement("div", { style: { fontSize: nameSize, fontWeight: 700, letterSpacing: "-0.055em", lineHeight: 1 } }, clampText(input.name, compact ? 20 : 34)),
      createElement("div", { style: { fontSize: Math.round(nameSize * 0.36), lineHeight: 1.25, maxWidth: "70%", opacity: 0.76 } }, clampText(input.tagline || spec.platform, 110)),
    ),
    createElement("div", { style: { color: input.primary, fontSize: Math.round(nameSize * 0.25), letterSpacing: "0.12em", textTransform: "uppercase" } }, spec.platform),
  );
}

/** Render platform-ready social artwork from a brand's deterministic identity. */
export async function renderSocialKit(input: SocialKitInput): Promise<SocialAsset[]> {
  const font = await fontDataPromise;

  return Promise.all(SOCIAL_SPECS.map(async (spec) => {
    const svg = await satori(assetElement(input, spec), {
      width: spec.width,
      height: spec.height,
      fonts: [{ name: "Inter", data: font, weight: 400, style: "normal" }],
    });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: spec.width } }).render().asPng();
    return { ...spec, svg, png };
  }));
}

export function socialSpecs(): ReadonlyArray<Omit<SocialSpec, "id"> & { id: string }> {
  return SOCIAL_SPECS;
}
