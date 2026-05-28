import type { Movie } from "@/types/index";

/**
 * Shared module-level cache for movie detail data.
 * Lives outside any component so it persists across navigation.
 * HomePage pre-populates it on card click; MovieDetailPage reads it on mount.
 */
export const detailCache = new Map<string, Movie>();
