import Movie from '../models/Movie.js';
import mongoose from 'mongoose';
import axios from 'axios';
import { parseManualMessage } from '../services/manualParser.js';
import { fetchFullDetailsFromTMDB, searchTMDBCandidates, fetchFullDetailsByTMDBId } from '../services/tmdbService.js';

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
    const { type, genre, search, sortBy, page = 1, limit = 24 } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (genre) query.genre = genre;
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

// ─── TMDB Search Helpers ───────────────────────────────────────────────────────

/**
 * GET /api/movies/admin/tmdb-search?title=&type=&year=
 * Returns up to 8 TMDB candidate results for the admin to pick from.
 */
export const searchTmdbCandidates = async (req, res) => {
  const { title, type = 'movie', year } = req.query;
  if (!title) return res.status(400).json({ message: 'title is required' });

  const candidates = await searchTMDBCandidates(title, type, year ? parseInt(year, 10) : undefined);
  res.json({ candidates });
};

/**
 * GET /api/movies/admin/tmdb-by-id?tmdbId=&tmdbType=
 * Fetches full TMDB details for a specific tmdbId selected by the admin.
 */
export const fetchTmdbById = async (req, res) => {
  const { tmdbId, tmdbType = 'movie' } = req.query;
  if (!tmdbId) return res.status(400).json({ message: 'tmdbId is required' });

  const details = await fetchFullDetailsByTMDBId(tmdbId, tmdbType);
  if (!details) return res.status(404).json({ message: 'TMDB entry not found' });
  res.json(details);
};

// ─── Manual Parser ─────────────────────────────────────────────────────────────

/**
 * POST /api/movies/admin/parse-manual
 * Body: { text: string }
 *
 * 1. Runs the regex-based manual parser.
 * 2. Optionally enriches with TMDB (same logic as webhookController).
 * 3. Returns the preview data — does NOT save to DB.
 */
export const parseManual = async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ message: 'text body field is required' });
  }

  try {
    // Step 1: Regex parse
    const parsed = parseManualMessage(text);
    console.log(`[ManualParser] Title: "${parsed.title}" | Links: ${parsed.links?.length}`);

    // Step 2: Search DB for existing matches (improved: score by title similarity + year)
    const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const parsedNorm = normalize(parsed.title);
    const parsedYear = parsed.year;

    // Pull all movies (titles + years only — lean for speed)
    const allMovies = await Movie.find({}, { _id: 1, title: 1, originalTitle: 1, year: 1, type: 1, links: 1, poster: 1, tmdbId: 1 }).lean();

    const dbMatches = allMovies.filter(m => {
      const dbNorm  = normalize(m.title);
      const dbOrig  = normalize(m.originalTitle);
      const titleHit = dbNorm === parsedNorm || dbOrig === parsedNorm
        || (dbNorm.length > 3 && parsedNorm.includes(dbNorm))
        || (parsedNorm.length > 3 && dbNorm.includes(parsedNorm));

      if (!titleHit) return false;

      // If both have a year, they must be within 1 year of each other to avoid false positives
      if (parsedYear && m.year && Math.abs(m.year - parsedYear) > 1) return false;
      return true;
    });

    // Step 3: TMDB enrichment — fetch top result AND all candidates
    let tmdbDetails   = null;
    let tmdbCandidates = [];
    try {
      // Get candidates list first (cheap)
      tmdbCandidates = await searchTMDBCandidates(parsed.title, parsed.type, parsed.year);

      if (tmdbCandidates.length === 1) {
        // Only one result — auto-select it
        tmdbDetails = await fetchFullDetailsByTMDBId(tmdbCandidates[0].tmdbId, tmdbCandidates[0].tmdbType);
      } else if (tmdbCandidates.length > 1) {
        // Multiple candidates — pick the best one automatically based on year match,
        // but still return the full candidate list so admin can override
        const yearMatch = parsed.year
          ? tmdbCandidates.find(c => c.year === parsed.year)
          : null;
        const autoPickId = (yearMatch || tmdbCandidates[0]);
        tmdbDetails = await fetchFullDetailsByTMDBId(autoPickId.tmdbId, autoPickId.tmdbType);
      }

      if (tmdbDetails) {
        console.log(`[ManualParser] TMDB found: ${tmdbDetails.title} (${tmdbDetails.tmdbId}) | ${tmdbCandidates.length} candidates`);
      }
    } catch (tmdbErr) {
      console.warn('[ManualParser] TMDB lookup failed (non-fatal):', tmdbErr.message);
    }

    // Step 4: Merge
    const merged = {
      ...(tmdbDetails || {}),
      title:    tmdbDetails?.title    || parsed.title,
      year:     tmdbDetails?.year     || parsed.year,
      // language field removed — audio array is the single source of truth
      audio:    parsed.audio?.length  ? parsed.audio : [],
      type:     parsed.type,
      links: parsed.links,
      link:  parsed.links[0]?.url || '',
    };

    res.json({
      success: true,
      data: merged,
      // Always return candidates so the UI can offer a picker
      tmdbCandidates: tmdbCandidates.length > 1 ? tmdbCandidates : [],
      // DB matches for the duplicate-check UI
      dbMatches,
    });
  } catch (err) {
    console.error('[ManualParser] Error:', err.message);
    res.status(500).json({ message: 'Parse error: ' + err.message });
  }
};

/**
 * POST /api/movies/admin/save-manual
 * Body: { movieData: object }
 *
 * Saves a manually-parsed (and optionally edited) movie to DB.
 * Handles duplicate TMDB IDs (merges links) and creates new entries.
 * Uses a synthetic telegramMsgId based on current timestamp to satisfy the unique index.
 */
export const saveManual = async (req, res) => {
  const { movieData } = req.body;
  if (!movieData || !movieData.title) {
    return res.status(400).json({ message: 'movieData with at least a title is required' });
  }

  try {
    // Try to find an existing movie by tmdbId or title+year
    let existingMovie = null;
    if (movieData.tmdbId) {
      existingMovie = await Movie.findOne({ tmdbId: movieData.tmdbId });
    }
    if (!existingMovie && movieData.title) {
      const query = { title: movieData.title };
      if (movieData.year) query.year = movieData.year;
      existingMovie = await Movie.findOne(query);
    }

    if (existingMovie) {
      // Merge: add unique new links only
      const currentLinks = existingMovie.links || [];
      const incomingLinks = movieData.links || [];
      const uniqueNewLinks = incomingLinks.filter(nLink =>
        !currentLinks.some(cLink => cLink.url === nLink.url)
      );

      const { links: _, ...restData } = movieData;
      existingMovie.set(restData);
      uniqueNewLinks.forEach(link => existingMovie.links.push(link));

      await existingMovie.save();
      console.log(`[ManualParser] UPDATED: ${existingMovie.title} (+${uniqueNewLinks.length} links)`);
      return res.status(200).json({ success: true, action: 'updated', movie: existingMovie });
    }

    // New entry — generate a synthetic negative telegramMsgId so it doesn't clash with real TG IDs
    const syntheticMsgId = -(Date.now());
    const newMovie = new Movie({
      ...movieData,
      telegramMsgId: syntheticMsgId,
      rawMessage: movieData.rawMessage || '',
      addedAt: new Date(),
    });
    await newMovie.save();
    console.log(`[ManualParser] CREATED: ${newMovie.title}`);
    return res.status(201).json({ success: true, action: 'created', movie: newMovie });
  } catch (err) {
    console.error('[ManualParser] Save error:', err.message);
    res.status(500).json({ message: 'Save error: ' + err.message });
  }
};
