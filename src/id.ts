import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { AstroDataError } from "./errors";

/**
 * ASTROid — the identifier every ASTRO product can trust.
 *
 * A registration mints 80 random bits, renders them in Crockford base32 and
 * appends a 40-bit HMAC signature over those bits. Any product can verify the
 * signature offline with the shared secret, so an extended, edited or invented
 * ASTROid fails without a round trip to ASTRO. Only ASTRO can mint one.
 *
 *   ASTRO-4K7Q-9WTM-2XHB-8NDR-3FVC-6PZS
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ID_BYTES = 10; // 80 bits → 16 characters
const SIG_BYTES = 5; // 40 bits → 8 characters
const ID_LENGTH = 16;
const SIG_LENGTH = 8;
const PREFIX = "ASTRO";
const DOMAIN = "astro-id-v1";

function secret(): string {
  const value = process.env.ASTRO_ID_SECRET ?? process.env.ASTRO_AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new AstroDataError(
      "ASTROid signing is not configured: set ASTRO_ID_SECRET (or ASTRO_AUTH_SECRET) to a random string of at least 32 characters.",
      503,
      "ID_UNCONFIGURED",
    );
  }
  return value;
}

/** Crockford base32, most significant bit first, no padding. */
function encode(bytes: Uint8Array): string {
  let buffer = 0;
  let bits = 0;
  let out = "";

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

function signature(canonicalId: string): string {
  const digest = createHmac("sha256", secret()).update(`${DOMAIN}.${canonicalId}`).digest();
  return encode(digest.subarray(0, SIG_BYTES));
}

function group(value: string): string {
  return value.match(/.{1,4}/g)?.join("-") ?? value;
}

/**
 * Collapses formatting and look-alike characters (I/L→1, O→0) into the
 * canonical 24-character form, or null when the input cannot be an ASTROid.
 */
function canonical(value: string): string | null {
  const stripped = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/^ASTRO[-\s]?/, "")
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");

  return stripped.length === ID_LENGTH + SIG_LENGTH ? stripped : null;
}

/** Mints a new ASTROid. Called once, at registration. */
export function generateAstroId(): string {
  const canonicalId = encode(randomBytes(ID_BYTES));
  return `${PREFIX}-${group(`${canonicalId}${signature(canonicalId)}`)}`;
}

/** True when the value is a well-formed ASTROid whose signature ASTRO issued. */
export function verifyAstroId(value: string): boolean {
  const parsed = canonical(value);
  if (!parsed) return false;

  const id = parsed.slice(0, ID_LENGTH);
  const given = parsed.slice(ID_LENGTH);
  const expected = signature(id);

  return expected.length === given.length && timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/**
 * Display form of a verified ASTROid (`ASTRO-XXXX-…`), or null when the value
 * is malformed or its signature was not issued by ASTRO.
 */
export function normalizeAstroId(value: string): string | null {
  if (!verifyAstroId(value)) return null;
  const parsed = canonical(value) as string;
  return `${PREFIX}-${group(parsed)}`;
}

/** Prefix used to recognise an ASTROid before the signature check runs. */
export function looksLikeAstroId(value: string): boolean {
  return canonical(value) !== null;
}
