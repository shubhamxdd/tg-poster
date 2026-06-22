import type { Movie } from "@/types/index";

const SESSION_KEY_PREFIX = "cv_detail:";

/**
 * Shared module-level cache for movie detail data.
 * Lives outside any component so it persists across navigation.
 * HomePage pre-populates it on card click; MovieDetailPage reads it on mount.
 *
 * Also backed by sessionStorage so direct-URL access and browser refreshes
 * can paint instantly from the last-seen data while the fresh fetch runs in
 * the background.  sessionStorage is per-tab and cleared when the tab closes,
 * so stale data never outlives the session.
 */

function readSession(id: string): Movie | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + id);
    return raw ? (JSON.parse(raw) as Movie) : null;
  } catch {
    return null;
  }
}

function writeSession(id: string, movie: Movie): void {
  try {
    sessionStorage.setItem(SESSION_KEY_PREFIX + id, JSON.stringify(movie));
  } catch {
    // sessionStorage can throw if storage is full — silently ignore
  }
}

class DetailCache {
  private mem = new Map<string, Movie>();

  get(id: string): Movie | null {
    return this.mem.get(id) ?? readSession(id);
  }

  set(id: string, movie: Movie): void {
    this.mem.set(id, movie);
    writeSession(id, movie);
  }

  has(id: string): boolean {
    return this.mem.has(id) || readSession(id) !== null;
  }
}

export const detailCache = new DetailCache();
