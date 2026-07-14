import {
  PNG_CONTENT_TYPE,
  rasterizeSvg,
  type PngDerivative,
} from "./raster";

const encoder = new TextEncoder();

export interface FaviconOptions {
  /** Values are serialized into the web manifest after validation. */
  name?: string;
  shortName?: string;
  themeColor?: string;
  backgroundColor?: string;
}

export type FaviconPurpose = "favicon" | "apple-touch-icon" | "android-icon" | "manifest" | "ico";

export interface FaviconArtifact {
  filename: string;
  contentType: string;
  data: Uint8Array;
  purpose: FaviconPurpose;
  width?: number;
  height?: number;
}

export interface FaviconMetadata {
  name: string;
  short_name: string;
  theme_color?: string;
  background_color?: string;
  display: "standalone";
  icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
}

export interface FaviconSet {
  artifacts: FaviconArtifact[];
  metadata: FaviconMetadata;
  manifest: string;
}

interface PngSpec {
  filename: string;
  size: number;
  purpose: Exclude<FaviconPurpose, "manifest" | "ico">;
}

const PNG_SPECS: readonly PngSpec[] = [
  { filename: "favicon-16x16.png", size: 16, purpose: "favicon" },
  { filename: "favicon-32x32.png", size: 32, purpose: "favicon" },
  { filename: "favicon-48x48.png", size: 48, purpose: "favicon" },
  { filename: "apple-touch-icon.png", size: 180, purpose: "apple-touch-icon" },
  { filename: "android-chrome-192x192.png", size: 192, purpose: "android-icon" },
  { filename: "android-chrome-512x512.png", size: 512, purpose: "android-icon" },
];

/**
 * Create a complete, file-system-independent favicon artifact set from SVG.
 * Conventional names are fixed rather than derived from brand input, preventing
 * unsafe paths while matching browser and platform discovery conventions.
 */
export function createFaviconSet(svg: string, options: FaviconOptions = {}): FaviconSet {
  assertSvg(svg);
  const name = safeMetadataText(options.name ?? "Application", "name", 120);
  const shortName = safeMetadataText(options.shortName ?? name, "shortName", 12);
  const themeColor = optionalColor(options.themeColor, "themeColor");
  const backgroundColor = optionalColor(options.backgroundColor, "backgroundColor");

  const pngs = PNG_SPECS.map((spec) => pngArtifact(svg, spec));
  const metadata: FaviconMetadata = {
    name,
    short_name: shortName,
    ...(themeColor === undefined ? {} : { theme_color: themeColor }),
    ...(backgroundColor === undefined ? {} : { background_color: backgroundColor }),
    display: "standalone",
    icons: [
      { src: "favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "android-chrome-192x192.png", sizes: "192x192", type: PNG_CONTENT_TYPE, purpose: "any" },
      { src: "android-chrome-512x512.png", sizes: "512x512", type: PNG_CONTENT_TYPE, purpose: "any" },
    ],
  };
  const manifest = `${JSON.stringify(metadata, null, 2)}\n`;
  const icoPngs = pngs.filter((artifact) => artifact.width !== undefined && artifact.width <= 48);

  return {
    artifacts: [
      { filename: "favicon.svg", contentType: "image/svg+xml", data: encoder.encode(svg), purpose: "favicon" },
      ...pngs,
      { filename: "favicon.ico", contentType: "image/x-icon", data: icoFromPngs(icoPngs), purpose: "ico" },
      { filename: "site.webmanifest", contentType: "application/manifest+json", data: encoder.encode(manifest), purpose: "manifest" },
    ],
    metadata,
    manifest,
  };
}

/** Alias with a verb that reads naturally at asset-pipeline call sites. */
export const renderFaviconSet = createFaviconSet;

function pngArtifact(svg: string, spec: PngSpec): FaviconArtifact {
  const png = rasterizeSvg(svg, { width: spec.size, height: spec.size });
  return {
    filename: spec.filename,
    contentType: PNG_CONTENT_TYPE,
    data: png,
    purpose: spec.purpose,
    width: spec.size,
    height: spec.size,
  };
}

function icoFromPngs(artifacts: readonly FaviconArtifact[]): Uint8Array {
  const pngs = artifacts.map((artifact) => ({
    width: artifact.width!,
    height: artifact.height!,
    data: artifact.data,
  }));
  const directorySize = 6 + pngs.length * 16;
  const bytes = new Uint8Array(directorySize + pngs.reduce((total, png) => total + png.data.length, 0));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, pngs.length, true);

  let offset = directorySize;
  pngs.forEach((png, index) => {
    const entry = 6 + index * 16;
    bytes[entry] = png.width === 256 ? 0 : png.width;
    bytes[entry + 1] = png.height === 256 ? 0 : png.height;
    bytes[entry + 2] = 0;
    bytes[entry + 3] = 0;
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, png.data.length, true);
    view.setUint32(entry + 12, offset, true);
    bytes.set(png.data, offset);
    offset += png.data.length;
  });
  return bytes;
}

function assertSvg(svg: string): void {
  if (!svg.trim().startsWith("<svg")) throw new TypeError("svg must contain an SVG document");
}

function safeMetadataText(value: string, name: string, maxLength: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new RangeError(`${name} must be non-empty, contain no control characters, and be at most ${maxLength} characters`);
  }
  return normalized;
}

function optionalColor(value: string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (!/^#[\da-f]{3}(?:[\da-f]{3}|[\da-f]{5})?$/i.test(value)) {
    throw new TypeError(`${name} must be a hex color`);
  }
  return value.toLowerCase();
}
