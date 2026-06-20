import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

/**
 * TMDB Service
 * Fetches movie/series details, posters, and cast.
 */

/**
 * Search TMDB and return all candidate results (lightweight — no full detail fetch).
 * Used by the admin to pick the correct entry when there are multiple matches.
 */
export const searchTMDBCandidates = async (title, type, year) => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'your_tmdb_api_key') return [];

  try {
    const tmdbType = type === 'series' || type === 'anime' ? 'tv' : 'movie';
    const searchResponse = await axios.get(`${TMDB_BASE_URL}/search/${tmdbType}`, {
      params: {
        api_key: apiKey,
        query: title,
        ...(tmdbType === 'movie' ? { year } : { first_air_date_year: year }),
      },
    });

    const results = searchResponse.data.results || [];
    // Return up to 8 candidates with just enough info to display a picker
    return results.slice(0, 8).map(r => ({
      tmdbId:       String(r.id),
      title:        r.title || r.name || null,
      originalTitle:r.original_title || r.original_name || null,
      year:         r.release_date
                      ? new Date(r.release_date).getFullYear()
                      : r.first_air_date
                        ? new Date(r.first_air_date).getFullYear()
                        : null,
      poster:       r.poster_path ? `${IMAGE_BASE_URL}${r.poster_path}` : null,
      overview:     r.overview ? r.overview.slice(0, 150) + (r.overview.length > 150 ? '…' : '') : null,
      rating:       r.vote_average ? r.vote_average.toFixed(1) : null,
      tmdbType,
    }));
  } catch (err) {
    console.error('[TMDB] searchCandidates error:', err.message);
    return [];
  }
};

export const fetchFullDetailsFromTMDB = async (title, type, year) => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'your_tmdb_api_key') {
    return null;
  }

  try {
    const tmdbType = type === 'series' || type === 'anime' ? 'tv' : 'movie';
    const searchEndpoint = `${TMDB_BASE_URL}/search/${tmdbType}`;

    // 1. Search for the ID
    const searchResponse = await axios.get(searchEndpoint, {
      params: {
        api_key: apiKey,
        query: title,
        year: tmdbType === 'movie' ? year : undefined,
        first_air_date_year: tmdbType === 'tv' ? year : undefined,
      },
    });

    const results = searchResponse.data.results;
    if (!results || results.length === 0) return null;

    // Pick the best match: exact title + year match preferred, else first result
    let bestMatch = results[0];
    if (year && results.length > 1) {
      const exactYear = results.find(r => {
        const rYear = r.release_date
          ? new Date(r.release_date).getFullYear()
          : r.first_air_date
            ? new Date(r.first_air_date).getFullYear()
            : null;
        return rYear === year;
      });
      if (exactYear) bestMatch = exactYear;
    }
    const tmdbId = bestMatch.id;

    // 2. Fetch full details, credits, and images
    const detailEndpoint = `${TMDB_BASE_URL}/${tmdbType}/${tmdbId}`;
    const [detailRes, creditRes, imagesRes] = await Promise.all([
      axios.get(detailEndpoint, { params: { api_key: apiKey, language: 'en-US' } }),
      axios.get(`${detailEndpoint}/credits`, { params: { api_key: apiKey } }),
      // include_image_language=null fetches text-free backdrops; include en too as fallback
      axios.get(`${detailEndpoint}/images`, { params: { api_key: apiKey, include_image_language: 'null,en' } })
    ]);

    const details = detailRes.data;
    const credits = creditRes.data;
    const images = imagesRes.data;

    const allBackdrops = images.backdrops || [];
    // Prefer null-language (no text overlay) backdrops sorted by vote_average desc
    const nullLangBackdrops = allBackdrops.filter(b => !b.iso_639_1);
    const sortedBackdrops = nullLangBackdrops.length > 0
      ? nullLangBackdrops.sort((a, b) => b.vote_average - a.vote_average)
      : allBackdrops.sort((a, b) => b.vote_average - a.vote_average);
    // Final fallback: details.backdrop_path from the main detail response
    const backdropPath = sortedBackdrops[0]?.file_path || details.backdrop_path || null;

    const releaseDate = details.release_date || details.first_air_date;
    const yearFromTMDB = releaseDate ? new Date(releaseDate).getFullYear() : null;

    // Extract relevant info
    return {
      tmdbId: String(tmdbId),
      title: details.title || details.name || null,
      originalTitle: details.original_title || details.original_name || null,
      poster: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : null,
      backdrop: backdropPath ? `${BACKDROP_BASE_URL}${backdropPath}` : null,
      rating: details.vote_average ? details.vote_average.toFixed(1) : null,
      runtime: details.runtime || (details.episode_run_time ? details.episode_run_time[0] : null),
      status: details.status,
      year: yearFromTMDB,
      genre: details.genres?.map(g => g.name) || [],
      country: details.origin_country ? details.origin_country[0] : (details.production_countries ? details.production_countries[0]?.name : null),
      director: tmdbType === 'movie' 
        ? credits.crew?.find(c => c.job === 'Director')?.name 
        : (details.created_by && details.created_by.length > 0 ? details.created_by[0].name : null),
      cast: credits.cast?.slice(0, 10).map(c => ({
        name: c.name,
        character: c.character,
        profile_path: c.profile_path ? `${IMAGE_BASE_URL}${c.profile_path}` : null
      })) || [],
      description: details.overview || null,
      source: 'tmdb',
    };

  } catch (error) {
    console.error('[TMDB] Error:', error.message);
    return null;
  }
};

/**
 * Fetch full TMDB details by a known tmdbId + type.
 * Used when the admin manually selects a candidate from the picker.
 */
/**
 * Fetches full TMDB details by ID, retrying with the opposite media type
 * (movie <-> tv) if the first attempt 404s. This matters because the type
 * tag on a search-candidate result reflects which endpoint was searched
 * (parsed.type from our own text parser), not what TMDB actually classifies
 * the title as — a Korean drama parsed as "movie" can still surface a TMDB
 * search hit that's only valid under /tv/{id}, which 404s if we trust the
 * tag blindly. Most relevant for MDL-source mode, where parsed.type comes
 * from filename heuristics rather than TMDB's own classification.
 */
export const fetchFullDetailsByTMDBId = async (tmdbId, tmdbType) => {
  const primary = await fetchFullDetailsByTMDBIdRaw(tmdbId, tmdbType);
  if (primary) return primary;

  const fallbackType = tmdbType === 'movie' ? 'tv' : 'movie';
  const fallback = await fetchFullDetailsByTMDBIdRaw(tmdbId, fallbackType);
  if (fallback) {
    console.warn(`[TMDB] fetchFullDetailsByTMDBId: ${tmdbId} wasn't a ${tmdbType}, found as ${fallbackType} instead`);
  }
  return fallback;
};

const fetchFullDetailsByTMDBIdRaw = async (tmdbId, tmdbType) => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'your_tmdb_api_key') return null;

  try {
    const detailEndpoint = `${TMDB_BASE_URL}/${tmdbType}/${tmdbId}`;
    const [detailRes, creditRes, imagesRes] = await Promise.all([
      axios.get(detailEndpoint, { params: { api_key: apiKey, language: 'en-US' } }),
      axios.get(`${detailEndpoint}/credits`, { params: { api_key: apiKey } }),
      axios.get(`${detailEndpoint}/images`, { params: { api_key: apiKey, include_image_language: 'null,en' } }),
    ]);

    const details = detailRes.data;
    const credits = creditRes.data;
    const images  = imagesRes.data;

    const allBackdrops    = images.backdrops || [];
    const nullLangBackdrops = allBackdrops.filter(b => !b.iso_639_1);
    const sortedBackdrops = (nullLangBackdrops.length > 0 ? nullLangBackdrops : allBackdrops)
      .sort((a, b) => b.vote_average - a.vote_average);
    const backdropPath = sortedBackdrops[0]?.file_path || details.backdrop_path || null;

    const releaseDate  = details.release_date || details.first_air_date;
    const yearFromTMDB = releaseDate ? new Date(releaseDate).getFullYear() : null;

    return {
      tmdbId: String(tmdbId),
      title:        details.title || details.name || null,
      originalTitle:details.original_title || details.original_name || null,
      poster:       details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : null,
      backdrop:     backdropPath ? `${BACKDROP_BASE_URL}${backdropPath}` : null,
      rating:       details.vote_average ? details.vote_average.toFixed(1) : null,
      runtime:      details.runtime || (details.episode_run_time ? details.episode_run_time[0] : null),
      status:       details.status,
      year:         yearFromTMDB,
      genre:        details.genres?.map(g => g.name) || [],
      country:      details.origin_country?.[0] || details.production_countries?.[0]?.name || null,
      director:     tmdbType === 'movie'
        ? credits.crew?.find(c => c.job === 'Director')?.name
        : (details.created_by?.[0]?.name || null),
      cast: credits.cast?.slice(0, 10).map(c => ({
        name: c.name,
        character: c.character,
        profile_path: c.profile_path ? `${IMAGE_BASE_URL}${c.profile_path}` : null,
      })) || [],
      description: details.overview || null,
      source: 'tmdb',
    };
  } catch (err) {
    console.error('[TMDB] fetchFullDetailsByTMDBId error:', err.message);
    return null;
  }
};
