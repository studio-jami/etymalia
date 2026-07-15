import { Resvg } from "@resvg/resvg-js";

export const PNG_CONTENT_TYPE = "image/png";

export interface RasterDimensions {
  width: number;
  height: number;
}

export interface RasterizeSvgOptions {
  /** The output width in device pixels. */
  width: number;
  /**
   * The output height in device pixels. It must preserve the source SVG's
   * aspect ratio; resvg never stretches identity artwork.
   */
  height?: number;
  /** Optional solid background color passed to resvg. */
  background?: string;
}

export interface PngDerivative extends RasterDimensions {
  filename: string;
  contentType: typeof PNG_CONTENT_TYPE;
  png: Uint8Array;
  source: "resvg";
}

/** The SVG fields required from a stored identity asset. */
export interface IdentitySvgSource {
  id: string;
  svg: string;
}

export interface IdentityPngDerivative extends PngDerivative {
  sourceAssetId: string;
}

/**
 * Convert a display name into a portable, storage-safe filename stem.
 * The result contains only lower-case ASCII letters, digits, and hyphens.
 */
export function safeFilenameStem(value: string, fallback = "asset"): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || fallback;
}

/** Build a predictable, path-safe PNG filename for an identity derivative. */
export function pngFilename(stem: string, width: number, height: number): string {
  return `${safeFilenameStem(stem)}-${positiveInteger(width, "width")}x${positiveInteger(height, "height")}.png`;
}

/** Render an SVG string to a deterministic PNG in memory. */
export function rasterizeSvg(svg: string, options: RasterizeSvgOptions): Uint8Array {
  if (!svg.trim().startsWith("<svg")) {
    throw new TypeError("svg must contain an SVG document");
  }

  const width = positiveInteger(options.width, "width");
  const height = options.height === undefined ? undefined : positiveInteger(options.height, "height");
  const intrinsic = svgDimensions(svg);

  if (height !== undefined && intrinsic !== undefined) {
    const expectedHeight = width * intrinsic.height / intrinsic.width;
    // Raster dimensions are whole pixels, so accept the nearest-pixel rounding
    // of a valid aspect-ratio-preserving height while rejecting distortion.
    if (Math.abs(expectedHeight - height) > 0.5) {
      throw new RangeError(`width and height must preserve the SVG aspect ratio (expected ${expectedHeight}, received ${height})`);
    }
  }

  const resvg = new Resvg(svg, {
    background: options.background,
    fitTo: { mode: "width", value: width },
  });
  return resvg.render().asPng();
}

/** Render a named SVG source as a PNG derivative with validation-safe metadata. */
export function renderPngDerivative(
  svg: string,
  stem: string,
  options: RasterizeSvgOptions,
): PngDerivative {
  const intrinsic = svgDimensions(svg);
  const width = positiveInteger(options.width, "width");
  const height = options.height ?? (intrinsic === undefined
    ? width
    : Math.round(width * intrinsic.height / intrinsic.width));

  return {
    filename: pngFilename(stem, width, height),
    contentType: PNG_CONTENT_TYPE,
    width,
    height,
    png: rasterizeSvg(svg, { ...options, width, height }),
    source: "resvg",
  };
}

/**
 * Render a source SVG at a list of widths. Duplicate widths are removed so
 * callers can safely combine default and user-selected derivative sizes.
 */
export function renderPngDerivatives(
  svg: string,
  stem: string,
  widths: readonly number[],
  options: Omit<RasterizeSvgOptions, "width" | "height"> = {},
): PngDerivative[] {
  return [...new Set(widths.map((width) => positiveInteger(width, "width")))]
    .sort((left, right) => left - right)
    .map((width) => renderPngDerivative(svg, stem, { ...options, width }));
}

/**
 * Render deterministic derivatives for stored `synthesizeIdentity` assets.
 * Asset IDs are preserved in metadata and independently sanitized for filenames.
 */
export function renderIdentityPngDerivatives(
  assets: readonly IdentitySvgSource[],
  widths: readonly number[],
  options: Omit<RasterizeSvgOptions, "width" | "height"> = {},
): IdentityPngDerivative[] {
  return assets.flatMap((asset) => {
    if (!asset.id.trim()) throw new TypeError("identity asset id must not be empty");
    return renderPngDerivatives(asset.svg, asset.id, widths, options)
      .map((derivative) => ({ ...derivative, sourceAssetId: asset.id }));
  });
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 16_384) {
    throw new RangeError(`${name} must be an integer between 1 and 16384`);
  }
  return value;
}

function svgDimensions(svg: string): RasterDimensions | undefined {
  const viewBox = svg.match(/\bviewBox\s*=\s*["']\s*[-+\d.eE]+\s+[-+\d.eE]+\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s*["']/i);
  if (!viewBox) return undefined;

  const width = Number(viewBox[1]);
  const height = Number(viewBox[2]);
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? { width, height }
    : undefined;
}
