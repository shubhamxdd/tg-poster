import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a URL-friendly slug from movie title, year, and MongoDB ObjectId.
 * Format: title-slug-year-8charId
 * Example: "the-dark-knight-2008-6a01e330"
 */
export function generateMovieSlug(title: string, year: number | null, id: string): string {
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50)
    .replace(/^-+|-+$/g, "");

  const yearPart = year ? String(year) : "unknown";
  const shortId = id.slice(-8); // last 8 chars of MongoDB ObjectId

  return `${titleSlug}-${yearPart}-${shortId}`;
}

/**
 * Extracts the MongoDB ObjectId from a slug.
 * The ID is the last 8 chars appended, but we also support full 24-char IDs for backward compat.
 */
export function extractIdFromSlug(slug: string): string {
  // If it looks like a full MongoDB ObjectId (24 hex chars), return as-is (backward compat)
  if (/^[a-f0-9]{24}$/i.test(slug)) {
    return slug;
  }
  // Otherwise extract last segment after final dash which is the 8-char short ID
  // But we need the full ID — store full id in slug suffix: last part is 8chars of id
  // The API needs full id, so we store the full id encoded in URL as: title-year-FULLID
  // Actually: we store last 8 chars only, so we extract that and let the API handle it
  // The backend getMovieById uses findById which needs a full 24-char ObjectId
  // So we'll embed the FULL id in the URL but only show last 8 chars cosmetically
  // Better: store full 24-char id after the human-readable part
  const parts = slug.split("-");
  // The last segment after year could be the 8char shortId or full id
  // We stored full 24-char id at end: e.g. "dark-knight-2008-6a01e3305cc92b6f8b6f8d96"
  const lastPart = parts[parts.length - 1];
  if (/^[a-f0-9]{24}$/i.test(lastPart)) return lastPart;
  // Try to reassemble if id got split by dashes (shouldn't happen but safe)
  return lastPart;
}

/**
 * Generates a slug with full MongoDB ObjectId embedded (not shortened) for API compatibility,
 * but displaying it as title-year-8chars in the visible URL.
 * We embed full ObjectId as the last URL segment so we can always look it up.
 */
export function generateMovieSlugFull(title: string, year: number | null, id: string): string {
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");

  const yearPart = year ? String(year) : "unknown";
  return `${titleSlug}-${yearPart}-${id}`;
}

/**
 * Extracts the full MongoDB ObjectId from our full slug format.
 * The last 24 chars (or last hyphen-separated segment of length 24) is the full id.
 */
export function extractFullIdFromSlug(slug: string): string {
  if (!slug) return slug;
  // Backward compat: raw ObjectId
  if (/^[a-f0-9]{24}$/i.test(slug)) return slug;

  // Last segment of slug
  const parts = slug.split("-");
  const last = parts[parts.length - 1];
  if (last.length === 24 && /^[a-f0-9]{24}$/i.test(last)) return last;

  // Maybe the id spans multiple segments if title had hex chars (unlikely but safe)
  // Try last N segments
  for (let n = 1; n <= 4; n++) {
    const candidate = parts.slice(parts.length - n).join("");
    if (candidate.length === 24 && /^[a-f0-9]{24}$/i.test(candidate)) return candidate;
  }

  return slug; // fallback
}
