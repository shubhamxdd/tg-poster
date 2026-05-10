import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

/**
 * TMDB Service
 * Fetches movie/series details, posters, and cast.
 */
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

    const bestMatch = results[0];
    const tmdbId = bestMatch.id;

    // 2. Fetch full details and credits
    const detailEndpoint = `${TMDB_BASE_URL}/${tmdbType}/${tmdbId}`;
    const [detailRes, creditRes] = await Promise.all([
      axios.get(detailEndpoint, { params: { api_key: apiKey } }),
      axios.get(`${detailEndpoint}/credits`, { params: { api_key: apiKey } })
    ]);

    const details = detailRes.data;
    const credits = creditRes.data;

    const releaseDate = details.release_date || details.first_air_date;
    const yearFromTMDB = releaseDate ? new Date(releaseDate).getFullYear() : null;

    // Extract relevant info
    return {
      poster: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : null,
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
      })) || []
    };

  } catch (error) {
    console.error('[TMDB] Error:', error.message);
    return null;
  }
};
