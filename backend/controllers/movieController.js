import Movie from '../models/Movie.js';
import mongoose from 'mongoose';
import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

/**
 * Parse a TMDB URL and return field data.
 * Supports:
 *   https://www.themoviedb.org/movie/12345
 *   https://www.themoviedb.org/tv/12345
 *   https://www.themoviedb.org/movie/12345-title-slug
 *   https://www.themoviedb.org/tv/12345-title-slug
 */
export const fetchFromTmdbUrl = async (req, res) => {
  const { url } = req.query;
  const apiKey = process.env.TMDB_API_KEY;

  if (!url) return res.status(400).json({ message: 'url query param required' });
  if (!apiKey || apiKey === 'your_tmdb_api_key') {
    return res.status(503).json({ message: 'TMDB API key not configured on server' });
  }

  try {
    // Extract type and id from URL  e.g. /movie/550  or  /tv/1396-breaking-bad
    const match = url.match(/themoviedb\.org\/(movie|tv)\/(\d+)/);
    if (!match) {
      return res.status(400).json({ message: 'Invalid TMDB URL. Expected format: https://www.themoviedb.org/movie/123 or /tv/123' });
    }

    const tmdbType = match[1]; // 'movie' or 'tv'
    const tmdbId = match[2];

    const detailEndpoint = `${TMDB_BASE_URL}/${tmdbType}/${tmdbId}`;
    const [detailRes, creditRes, imagesRes] = await Promise.all([
      axios.get(detailEndpoint, { params: { api_key: apiKey } }),
      axios.get(`${detailEndpoint}/credits`, { params: { api_key: apiKey } }),
      axios.get(`${detailEndpoint}/images`, { params: { api_key: apiKey, include_image_language: 'null,en' } }),
    ]);

    const details = detailRes.data;
    const credits = creditRes.data;
    const images = imagesRes.data;

    const allBackdrops = images.backdrops || [];
    const nullLangBackdrops = allBackdrops.filter(b => !b.iso_639_1);
    const sortedBackdrops = (nullLangBackdrops.length > 0 ? nullLangBackdrops : allBackdrops)
      .sort((a, b) => b.vote_average - a.vote_average);
    const backdropPath = sortedBackdrops[0]?.file_path || details.backdrop_path || null;

    const releaseDate = details.release_date || details.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

    const data = {
      tmdbId: String(tmdbId),
      title: details.title || details.name,
      originalTitle: details.original_title || details.original_name || null,
      type: tmdbType === 'tv' ? 'series' : 'movie',
      poster: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : null,
      backdrop: backdropPath ? `${BACKDROP_BASE_URL}${backdropPath}` : null,
      rating: details.vote_average ? details.vote_average.toFixed(1) : null,
      runtime: details.runtime
        ? `${details.runtime} min`
        : details.episode_run_time?.[0]
        ? `${details.episode_run_time[0]} min`
        : null,
      status: details.status || null,
      year,
      language: details.spoken_languages?.[0]?.english_name || details.original_language || null,
      genre: details.genres?.map(g => g.name) || [],
      country: details.origin_country?.[0] || details.production_countries?.[0]?.name || null,
      director: tmdbType === 'movie'
        ? (credits.crew?.find(c => c.job === 'Director')?.name || null)
        : (details.created_by?.[0]?.name || null),
      cast: (credits.cast || []).slice(0, 10).map(c => ({
        name: c.name,
        character: c.character,
        profile_path: c.profile_path ? `${IMAGE_BASE_URL}${c.profile_path}` : null,
      })),
      description: details.overview || null,
    };

    res.json(data);
  } catch (error) {
    console.error('[TMDB Fetch] Error:', error.message);
    res.status(500).json({ message: 'Failed to fetch from TMDB: ' + error.message });
  }
};

/**
 * Simple Admin Authentication Middleware
 */
export const adminAuth = (req, res, next) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers['x-admin-password'];

  if (!adminPassword) {
    console.error('[AdminAuth] Error: ADMIN_PASSWORD is not set in environment variables.');
    return res.status(500).json({ message: 'Server Configuration Error: Admin password not set' });
  }

  if (providedPassword !== adminPassword) {
    console.warn(`[AdminAuth] Unauthorized access attempt from ${req.ip}`);
    return res.status(401).json({ message: 'Unauthorized: Invalid Admin Password' });
  }
  next();
};

export const getMovies = async (req, res) => {
  try {
    const { type, genre, language, search, sortBy, page = 1, limit = 24 } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (genre) query.genre = genre;
    if (language) query.language = language;
    if (search) query.title = { $regex: search, $options: 'i' };

    let sortQuery = { addedAt: -1 }; // Default
    if (sortBy === 'year') sortQuery = { year: -1, addedAt: -1 };
    if (sortBy === 'rating') sortQuery = { rating: -1, addedAt: -1 };
    if (sortBy === 'title') sortQuery = { title: 1 };
    if (sortBy === 'addedAt') sortQuery = { addedAt: -1 };

    const movies = await Movie.find(query)
      .sort(sortQuery)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Movie.countDocuments(query);

    res.json({
      movies,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get movie by ID or slug.
 * Accepts:
 *   - Full 24-char MongoDB ObjectId (backward compat)
 *   - Slug format: "title-year-{24charObjectId}"
 *   - Slug format: "title-year-{8charSuffix}" — matches last 8 chars of ObjectId
 */
export const getMovieById = async (req, res) => {
  try {
    const param = req.params.id;
    let movie = null;

    // 1. Try direct ObjectId lookup
    if (/^[a-f0-9]{24}$/i.test(param)) {
      movie = await Movie.findById(param);
    } else {
      // 2. Extract the last hyphen-separated segment
      const parts = param.split('-');
      const lastPart = parts[parts.length - 1];

      if (/^[a-f0-9]{24}$/i.test(lastPart)) {
        // Full ObjectId embedded in slug
        movie = await Movie.findById(lastPart);
      } else if (/^[a-f0-9]{8}$/i.test(lastPart)) {
        // 8-char suffix — search using regex on _id string
        // MongoDB ObjectIds end with the last 8 hex chars
        const regex = new RegExp(lastPart + '$', 'i');
        // findById won't work here; use string matching approach
        const allIds = await Movie.find({}, { _id: 1 }).lean();
        const match = allIds.find(doc => doc._id.toString().endsWith(lastPart.toLowerCase()));
        if (match) {
          movie = await Movie.findById(match._id);
        }
      }
    }

    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json({ message: 'Movie deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json({ message: 'Movie updated successfully', movie });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyAdmin = async (req, res) => {
  res.json({ success: true, message: 'Authenticated successfully' });
};

/**
 * Bulk-fetches description from TMDB for all movies that have a tmdbId
 * but are missing a description (or have an empty one).
 * Streams progress as newline-delimited JSON.
 */
export const bulkUpdateDescriptions = async (req, res) => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'your_tmdb_api_key') {
    return res.status(503).json({ message: 'TMDB API key not configured on server' });
  }

  // Find all movies missing description but having a tmdbId
  const movies = await Movie.find({
    tmdbId: { $exists: true, $ne: null, $ne: '' },
    $or: [
      { description: { $exists: false } },
      { description: null },
      { description: '' },
      { originalTitle: { $exists: false } },
      { originalTitle: null },
      { originalTitle: '' },
    ],
  }).select('_id title tmdbId type').lean();

  // Set up streaming response
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.write(JSON.stringify({ type: 'start', total: movies.length }) + '\n');

  let updated = 0;
  let failed = 0;

  for (const movie of movies) {
    try {
      const tmdbType = movie.type === 'series' || movie.type === 'anime' ? 'tv' : 'movie';
      const detailRes = await axios.get(
        `https://api.themoviedb.org/3/${tmdbType}/${movie.tmdbId}`,
        { params: { api_key: apiKey, language: 'en-US' } }
      );
      const overview = detailRes.data?.overview || null;
      const tmdbTitle = detailRes.data?.title || detailRes.data?.name || null;
      const tmdbOriginalTitle = detailRes.data?.original_title || detailRes.data?.original_name || null;
      if (overview || tmdbTitle || tmdbOriginalTitle) {
        const updateFields = {};
        if (overview) updateFields.description = overview;
        if (tmdbOriginalTitle) updateFields.originalTitle = tmdbOriginalTitle;
        // Update title from TMDB only if not already set correctly
        if (tmdbTitle && (!movie.title || movie.title === 'Unknown Title')) updateFields.title = tmdbTitle;
        await Movie.findByIdAndUpdate(movie._id, updateFields);
        updated++;
        res.write(JSON.stringify({ type: 'progress', title: movie.title, status: 'updated' }) + '\n');
      } else {
        failed++;
        res.write(JSON.stringify({ type: 'progress', title: movie.title, status: 'no_overview' }) + '\n');
      }
    } catch (err) {
      failed++;
      res.write(JSON.stringify({ type: 'progress', title: movie.title, status: 'error', error: err.message }) + '\n');
    }

    // Small delay to avoid TMDB rate limits
    await new Promise(r => setTimeout(r, 250));
  }

  res.write(JSON.stringify({ type: 'done', updated, failed, total: movies.length }) + '\n');
  res.end();
};
