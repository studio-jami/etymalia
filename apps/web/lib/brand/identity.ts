import "server-only";

import { colorHex, colorOn, type DtcgDocument } from "@etymalia/tokens";
import {
  faviconSvg,
  synthesizeIdentity,
  type Identity,
  type IdentityInput,
} from "@etymalia/asset-forge";

const DISPLAY_FONT = 'Georgia, "Times New Roman", "Iowan Old Style", serif';

/** Map a brand's DTCG tokens into the asset-forge identity input. */
export function identityInput(name: string, tokens: DtcgDocument): IdentityInput {
  return {
    name,
    primary: colorHex(tokens, "primary", "#315d7c"),
    accent: colorHex(tokens, "accent", "#8fb8d3"),
    ink: colorHex(tokens, "ink", "#182028"),
    paper: colorHex(tokens, "paper", "#f3f1eb"),
    onPrimary: colorOn(tokens, "primary", "#ffffff"),
    displayFont: DISPLAY_FONT,
  };
}

export interface BrandIdentityBundle {
  identity: Identity;
  faviconSvg: string;
  webManifest: Record<string, unknown>;
  headSnippet: string;
}

/** Build the full identity bundle (logos, favicon, manifest, head) for a brand. */
export function buildIdentity(name: string, tokens: DtcgDocument): BrandIdentityBundle {
  const input = identityInput(name, tokens);
  const primary = input.primary;
  const paper = input.paper;

  return {
    identity: synthesizeIdentity(input),
    faviconSvg: faviconSvg(input),
    webManifest: {
      name,
      short_name: name.slice(0, 12),
      icons: [{ src: "favicon.svg", sizes: "any", type: "image/svg+xml" }],
      theme_color: primary,
      background_color: paper,
      display: "standalone",
    },
    headSnippet: [
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
      '<link rel="manifest" href="/site.webmanifest">',
      `<meta name="theme-color" content="${primary}">`,
      "",
    ].join("\n"),
  };
}
