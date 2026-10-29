/**
 * Deep-link generation for ASTRO profile connections.
 *
 * Every destination is an ASTRO-owned product, so this module knows only the three
 * internal platforms. The PlatformType union mirrors the Prisma enum exactly while
 * staying usable from client components (the generated Prisma client never enters
 * the browser bundle).
 */

export const PLATFORMS = ["BEEK", "KOBA_GAMES", "SNAGCHAT"] as const;

export type PlatformType = (typeof PLATFORMS)[number];

export type PlatformMeta = {
  /** Display name used on chips and in errors. */
  label: string;
  /** Two-letter monogram rendered in the chip badge. */
  badge: string;
  /** Origin that every link for this platform hangs off. */
  origin: string;
};

export const PLATFORM_META: Record<PlatformType, PlatformMeta> = {
  BEEK: { label: "Bleek", badge: "BK", origin: "https://bleek.app" },
  KOBA_GAMES: { label: "Koba.games", badge: "KG", origin: "https://koba.games" },
  SNAGCHAT: { label: "SnagChat", badge: "SC", origin: "https://snag.chat" },
};

/** Raised when a handle cannot produce a valid destination. */
export class AstroLinkError extends Error {
  readonly platform: PlatformType;

  constructor(platform: PlatformType, message: string) {
    super(message);
    this.name = "AstroLinkError";
    this.platform = platform;
  }
}

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9._-]{1,31}$/;
const INVISIBLE = /[\u200B-\u200D\uFEFF]/g;

/** Trims whitespace, drops every leading "@" and strips zero-width characters. */
function clean(raw: string): string {
  return raw.trim().replace(/^@+/, "").replace(INVISIBLE, "");
}

/** Display form of any handle input: trimmed, every leading "@" removed, case kept. */
export function cleanHandle(raw: string): string {
  return clean(raw);
}

/** Account handles share the connection-handle grammar: lowercase, 2–32 characters. */
export function normalizeAccountHandle(raw: string): string {
  return normalizeHandle("BEEK", raw);
}

/**
 * Collapses any acceptable input into the canonical stored form: lowercase, no
 * leading "@", 2–32 characters of letters, numbers, dots, dashes or underscores.
 */
export function normalizeHandle(platform: PlatformType, handle: string): string {
  const value = clean(handle);
  if (value.length === 0) {
    throw new AstroLinkError(platform, `${PLATFORM_META[platform].label} handles cannot be empty.`);
  }

  const normalized = value.toLowerCase();
  if (!HANDLE_PATTERN.test(normalized)) {
    throw new AstroLinkError(
      platform,
      `${PLATFORM_META[platform].label} handles use 2 to 32 letters, numbers, dots, dashes or underscores.`,
    );
  }
  return normalized;
}

/**
 * Builds the canonical destination for a platform handle.
 * Accepts "@Handle" or "Handle" and always returns an ASTRO-owned URL.
 */
export function generateASTROLink(platform: PlatformType, handle: string): string {
  if (!Object.hasOwn(PLATFORM_META, platform)) {
    throw new AstroLinkError(platform, `Unknown ASTRO platform: ${String(platform)}`);
  }

  const value = normalizeHandle(platform, handle);
  return `${PLATFORM_META[platform].origin}/@${encodeURIComponent(value)}`;
}

/** Never throws: returns null when stored data cannot form a valid link. */
export function tryGenerateASTROLink(platform: PlatformType, handle: string): string | null {
  try {
    return generateASTROLink(platform, handle);
  } catch {
    return null;
  }
}

/** Chip label: "@koba.games". */
export function formatAstroHandle(platform: PlatformType, handle: string): string {
  try {
    return `@${normalizeHandle(platform, handle)}`;
  } catch {
    return clean(String(handle ?? ""));
  }
}

/** Stable id used for the screen-reader description of a chip. */
export function connectionDomId(platform: PlatformType, handle: string): string {
  return `astro-connection-${platform.toLowerCase()}-${clean(handle).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}
