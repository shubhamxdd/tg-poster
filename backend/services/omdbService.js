import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OMDB_BASE_URL = 'http://www.omdbapi.com/';

/**
 * OMDb Service
 * Used as an automatic fallback source when TMDB has no match for a title.
 * Returns data normalized to the same shape as tmdbService's results so it
 * can be merged into a Movie document interchangeably (minus TMDB-only
 * fields like `backdrop`/`tmdbId`, which OMDb simply doesn't provide).
 */

const cleanField = (v) => (v && v !== 'N/A' ? v : null);

/**
 * OMDb's Poster field is sometimes a syntactically valid URL that doesn't
 * actually resolve to an image — most commonly OMDb's own "no picture
 * available" placeholder graphic (served from
 * m.media-amazon.com/.../nopicture/...), which we don't want to store since
 * we already render our own placeholder in the UI when poster is null.
 */
const cleanPoster = (v) => {
  const clean = cleanField(v);
  if (!clean) return null;
  if (/nopicture/i.test(clean)) return null;
  return clean;
};

/**
 * Map our internal `type` ('movie' | 'series' | 'anime') to OMDb's `type`
 * query param ('movie' | 'series').
 */
const toOmdbType = (type) => (type === 'series' || type === 'anime' ? 'series' : 'movie');

/**
 * OMDb's Year field can be a single year ("2014") or a range for series
 * ("2014–2019" or "2014–"). Pull the first 4-digit year out of it.
 */
const parseOmdbYear = (yearStr) => {
  if (!yearStr) return null;
  const match = String(yearStr).match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
};

/**
 * OMDb's Runtime field looks like "148 min". Strip it down to a plain number
 * (as a string) to match the format TMDB results are stored in.
 */
const parseOmdbRuntime = (runtimeStr) => {
  const clean = cleanField(runtimeStr);
  if (!clean) return null;
  const match = clean.match(/\d+/);
  return match ? match[0] : null;
};

const normalizeOmdbDetails = (details) => ({
  tmdbId: null,
  imdbId: details.imdbID || null,
  title: cleanField(details.Title),
  originalTitle: null,
  poster: cleanPoster(details.Poster),
  backdrop: null, // OMDb has no backdrop artwork
  rating: cleanField(details.imdbRating),
  runtime: parseOmdbRuntime(details.Runtime),
  status: null, // OMDb has no direct equivalent to TMDB's status field
  year: parseOmdbYear(details.Year),
  genre: cleanField(details.Genre) ? details.Genre.split(',').map((g) => g.trim()) : [],
  country: cleanField(details.Country) ? details.Country.split(',')[0].trim() : null,
  director: cleanField(details.Director) ? details.Director.split(',')[0].trim() : null,
  cast: cleanField(details.Actors)
    ? details.Actors.split(',').map((name) => ({ name: name.trim(), character: null, profile_path: null }))
    : [],
  description: cleanField(details.Plot),
  source: 'omdb',
});

/**
 * Fetch full details from OMDb by title (+ optional type/year), mirroring
 * tmdbService's `fetchFullDetailsFromTMDB`. OMDb's `t=` lookup already does
 * its own fuzzy title matching and returns a single best match, so no
 * separate search step is needed.
 */
export const fetchFullDetailsFromOMDB = async (title, type, year) => {
  const apiKey = process.env.OMDB_API_KEY;
  if (!title || !apiKey || apiKey === 'your_omdb_api_key') return null;

  try {
    const response = await axios.get(OMDB_BASE_URL, {
      params: {
        apikey: apiKey,
        t: title,
        type: toOmdbType(type),
        y: year || undefined,
        plot: 'full',
      },
    });

    if (response.data?.Response === 'False') {
      // Retry once without the year — OMDb's year filter is strict and can
      // miss otherwise-correct matches if our parsed year is slightly off.
      if (year) {
        const retry = await axios.get(OMDB_BASE_URL, {
          params: { apikey: apiKey, t: title, type: toOmdbType(type), plot: 'full' },
        });
        if (retry.data?.Response === 'False') return null;
        return normalizeOmdbDetails(retry.data);
      }
      return null;
    }

    return normalizeOmdbDetails(response.data);
  } catch (err) {
    console.error('[OMDb] Error:', err.message);
    return null;
  }
};

/**
 * Fetch full details from OMDb by exact IMDb ID (e.g. "tt1234567").
 * Used for the manual-parser "paste IMDb URL to override" flow — mirrors
 * `fetchFromTmdbUrl` in movieController.js. An `i=` lookup is an exact ID
 * match with no fuzzy title/type/year filtering, so it succeeds in cases
 * where `fetchFullDetailsFromOMDB`'s title search (t=) returns no match.
 */
export const fetchFullDetailsByImdbId = async (imdbId) => {
  const apiKey = process.env.OMDB_API_KEY;
  if (!imdbId || !apiKey || apiKey === 'your_omdb_api_key') return null;

  try {
    const response = await axios.get(OMDB_BASE_URL, {
      params: { apikey: apiKey, i: imdbId, plot: 'full' },
    });

    if (response.data?.Response === 'False') {
      throw new Error(response.data?.Error || 'No OMDb result for that IMDb ID');
    }

    return normalizeOmdbDetails(response.data);
  } catch (err) {
    console.error('[OMDb] IMDb ID lookup error:', err.message);
    throw err;
  }
};
