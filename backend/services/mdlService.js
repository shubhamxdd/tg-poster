import axios from 'axios';

/**
 * MyDramaList (MDL) Service
 *
 * MyDramaList has no public API (it's been "WIP/private beta" for years), so
 * this goes through Kuryana — a third-party unofficial scraper API for MDL:
 *   https://github.com/tbdsux/kuryana
 *   https://kuryana.tbdh.app/docs (swagger)
 *
 * This is a public, third-party-hosted service with no uptime guarantee.
 * It exists purely to satisfy the lack of an official MDL API and may break
 * or disappear if MDL changes their site markup or the host goes down — all
 * calls here are wrapped defensively and failures are treated as "no match"
 * rather than thrown, same as the OMDb fallback.
 *
 * Used for Korean/Asian dramas and movies that TMDB/OMDb often don't have
 * (regional titles, native-language releases) — the manual-parser "paste MDL
 * URL" override mirrors the existing TMDB/IMDB override boxes.
 */

const MDL_API_BASE = 'https://kuryana.tbdh.app';

const cleanField = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === 'n/a' || s === '?') return null;
  return s;
};

/**
 * MDL slugs look like "1872-goblin" or full URLs like
 * https://mydramalist.com/1872-goblin or .../1872-goblin/episode/1 (strip
 * any trailing path beyond the slug itself).
 */
export const extractMdlSlug = (input) => {
  if (!input) return null;
  const trimmed = String(input).trim();

  // Bare slug already (e.g. "1872-goblin")
  if (/^\d+-[\w-]+$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/mydramalist\.com\/(\d+-[\w-]+)/i);
  return match ? match[1] : null;
};

/**
 * MDL's "episodes" field is a string like "16" or "16 episodes" or "Movie".
 * Treat anything with episodes > 1 as series/anime-able; a bare "Movie" type
 * or 1-episode count as a movie. The admin can still override `type`
 * manually if the regional genre split (drama vs anime) needs correcting.
 */
const inferType = (details) => {
  const epStr = details?.episodes || '';
  const num = parseInt(String(epStr).match(/\d+/)?.[0] || '0', 10);
  const country = (details?.country || '').toLowerCase();
  const isAnimeCountry = country.includes('japan') && (details?.type || '').toLowerCase().includes('anime');
  if (isAnimeCountry) return 'anime';
  if (num > 1) return 'series';
  return 'movie';
};

const parseMdlYear = (yearStr) => {
  if (!yearStr) return null;
  const match = String(yearStr).match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
};

/**
 * MDL's `details.duration` comes as-is, e.g. "60 min." or "1 hr. 10 min."
 * No conversion — just pass through MDL's own formatting (trimming any
 * trailing punctuation/whitespace) instead of normalizing to "X min" like
 * TMDB/OMDb, since MDL already expresses it the way MDL wants it shown.
 */
const parseMdlRuntime = (durationStr) => {
  const clean = cleanField(durationStr);
  if (!clean) return null;
  return clean.replace(/\.\s*$/, '').trim();
};

/**
 * MDL's `aired` field is a date range string, e.g. "Dec 13, 2016 - Jan 21, 2017"
 * or, for an airing/upcoming title, an open-ended range like "Mar 10, 2026 - ?"
 * or just a single start date. MDL has no separate structured status field, so
 * this is the only signal available — treat an open-ended/missing end date as
 * "Ongoing" and a closed range as "Completed".
 */
const deriveMdlStatus = (airedStr) => {
  const clean = cleanField(airedStr);
  if (!clean) return null;
  if (!clean.includes('-') || /\?\s*$/.test(clean)) return 'Ongoing';
  return 'Completed';
};

/**
 * MDL's `title` field commonly includes a trailing year, e.g. "Goblin (2016)".
 * Strip that off — year is already tracked separately in our `year` field.
 */
const cleanMdlTitle = (title) => {
  const clean = cleanField(title);
  if (!clean) return null;
  return clean.replace(/\s*\(\d{4}\)\s*$/, '').trim();
};

/**
 * MDL's `rating` is already a 0-10 float (e.g. 8.4), same scale as
 * TMDB/IMDb, so no conversion needed.
 */
const normalizeMdlDrama = (data) => {
  if (!data) return null;

  const details = data.details || {};
  const others = data.others || {};

  return {
    tmdbId: null,
    imdbId: null,
    mdlSlug: cleanField(data.link?.match(/mydramalist\.com\/([\w-]+)/i)?.[1]) || null,
    title: cleanMdlTitle(data.title),
    originalTitle: others.native_title?.[0] ? cleanField(others.native_title[0]) : null,
    poster: cleanField(data.poster),
    backdrop: null, // MDL doesn't provide separate backdrop art
    rating: data.rating ? String(data.rating) : cleanField(details.score),
    runtime: parseMdlRuntime(details.duration),
    status: deriveMdlStatus(details.aired),
    year: parseMdlYear(data.year),
    type: inferType(details),
    genre: Array.isArray(others.genres) ? others.genres.filter(Boolean) : [],
    country: cleanField(details.country),
    director: null, // MDL detail page doesn't expose a structured director field
    cast: Array.isArray(data.casts)
      ? data.casts.slice(0, 10).map((c) => ({
          name: c.name,
          character: null,
          profile_path: c.profile_image || null,
        }))
      : [],
    description: cleanField(data.synopsis),
    source: 'mdl',
  };
};

/**
 * Fetch full drama/movie details from MDL (via Kuryana) by exact slug.
 * Used for the manual-parser "paste MyDramaList URL" override — same role
 * as fetchFullDetailsByImdbId, for titles TMDB/OMDb can't find (common with
 * Korean/Asian dramas that only exist under their native or alternate title).
 */
export const fetchFullDetailsByMdlSlug = async (slug) => {
  if (!slug) return null;

  try {
    const response = await axios.get(`${MDL_API_BASE}/id/${encodeURIComponent(slug)}`, {
      timeout: 15000,
    });

    if (response.data?.error) {
      throw new Error(
        typeof response.data.description === 'string'
          ? response.data.description
          : response.data.description?.title || 'MDL lookup failed'
      );
    }

    const data = response.data?.data;
    if (!data) throw new Error('Unexpected MDL response shape');

    return normalizeMdlDrama(data);
  } catch (err) {
    console.error('[MDL] Error:', err.message);
    throw err;
  }
};

/**
 * Search MDL by title — returns lightweight candidates (slug, title, year,
 * thumbnail) for an admin picker, mirroring searchTMDBCandidates. Not
 * currently wired into the UI (the manual parser uses direct URL paste
 * instead) but kept available for a future "search MDL" picker.
 */
export const searchMdlCandidates = async (query) => {
  if (!query) return [];

  try {
    const response = await axios.get(`${MDL_API_BASE}/search/q/${encodeURIComponent(query)}`, {
      timeout: 15000,
    });

    if (response.data?.error) return [];

    const dramas = response.data?.results?.dramas || [];
    return dramas.map((d) => ({
      mdlSlug: d.slug,
      title: d.title,
      year: d.year || null,
      type: d.type || null,
      thumb: d.thumb || null,
    }));
  } catch (err) {
    console.error('[MDL] Search error:', err.message);
    return [];
  }
};
