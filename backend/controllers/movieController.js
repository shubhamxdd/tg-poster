import Movie from '../models/Movie.js';
import mongoose from 'mongoose';
import axios from 'axios';
import { parseManualMessage } from '../services/manualParser.js';
import { fetchFullDetailsFromTMDB, searchTMDBCandidates, fetchFullDetailsByTMDBId } from '../services/tmdbService.js';
import { fetchFullDetailsFromOMDB, fetchFullDetailsByImdbId } from '../services/omdbService.js';
import { fetchFullDetailsByMdlSlug, extractMdlSlug } from '../services/mdlService.js';
import { fetchFullDetailsByAnilistId, extractAnilistId } from '../services/anilistService.js';

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
      runtime: details.runtime || details.episode_run_time?.[0] || null,
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
 * Parse an IMDb URL and return field data via OMDb.
 * Used as a manual-parser override when TMDB has no match and OMDb's own
 * title search (t=) also can't find the title — pasting the IMDb URL gives
 * OMDb an exact ID (i=) lookup instead, which has no fuzzy matching to fail.
 * Supports:
 *   https://www.imdb.com/title/tt1234567
 *   https://www.imdb.com/title/tt1234567/
 *   https://www.imdb.com/title/tt1234567/?ref_=...
 *   tt1234567  (bare ID, in case the admin pastes just the ID)
 */
export const fetchFromImdbUrl = async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).json({ message: 'url query param required' });
  if (!process.env.OMDB_API_KEY || process.env.OMDB_API_KEY === 'your_omdb_api_key') {
    return res.status(503).json({ message: 'OMDb API key not configured on server' });
  }

  const match = String(url).match(/tt\d{6,10}/);
  if (!match) {
    return res.status(400).json({ message: 'Invalid IMDb URL/ID. Expected format: https://www.imdb.com/title/tt1234567 or tt1234567' });
  }
  const imdbId = match[0];

  try {
    const details = await fetchFullDetailsByImdbId(imdbId);
    if (!details) {
      return res.status(404).json({ message: 'No OMDb result for that IMDb ID' });
    }

    res.json({
      tmdbId: null,
      imdbId: details.imdbId,
      title: details.title,
      originalTitle: null,
      poster: details.poster,
      backdrop: null,
      rating: details.rating,
      runtime: details.runtime,
      status: details.status,
      year: details.year,
      genre: details.genre,
      country: details.country,
      director: details.director,
      cast: details.cast,
      description: details.description,
    });
  } catch (error) {
    console.error('[IMDB Fetch] Error:', error.message);
    res.status(500).json({ message: 'Failed to fetch from OMDb: ' + error.message });
  }
};

/**
 * Parse a MyDramaList URL and return field data via the unofficial Kuryana
 * scraper API (https://kuryana.tbdh.app). MDL has no official public API,
 * so this is a best-effort third-party-hosted scraper with no uptime
 * guarantee — used as a manual-parser override for Korean/Asian dramas and
 * films that TMDB/OMDb frequently can't find under their native title.
 * Supports:
 *   https://mydramalist.com/1872-goblin
 *   https://mydramalist.com/1872-goblin/episode/1  (slug extracted, rest ignored)
 *   1872-goblin  (bare slug, in case the admin pastes just the slug)
 */
export const fetchFromMdlUrl = async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).json({ message: 'url query param required' });

  const slug = extractMdlSlug(url);
  if (!slug) {
    return res.status(400).json({ message: 'Invalid MyDramaList URL/slug. Expected format: https://mydramalist.com/1872-goblin or 1872-goblin' });
  }

  try {
    const details = await fetchFullDetailsByMdlSlug(slug);
    if (!details) {
      return res.status(404).json({ message: 'No MyDramaList result for that URL' });
    }

    res.json({
      tmdbId: null,
      imdbId: null,
      mdlSlug: details.mdlSlug,
      title: details.title,
      originalTitle: details.originalTitle,
      poster: details.poster,
      backdrop: null,
      rating: details.rating,
      runtime: details.runtime,
      status: details.status,
      year: details.year,
      type: details.type,
      genre: details.genre,
      country: details.country,
      director: details.director,
      cast: details.cast,
      description: details.description,
    });
  } catch (error) {
    console.error('[MDL Fetch] Error:', error.message);
    res.status(500).json({ message: 'Failed to fetch from MyDramaList: ' + error.message });
  }
};

/**
 * Parse an AniList URL and return field data via AniList's official public
 * GraphQL API (no key needed) — see https://docs.anilist.co. Used as a
 * manual-parser override for anime, where TMDB's /tv endpoint is often a
 * poor fit (wrong episode counts/art, missing native titles, weird season
 * splitting). Unlike the MDL override (selective patch), this is a FULL
 * REPLACE of the existing match, mirroring the TMDB/IMDb override boxes.
 * Supports:
 *   https://anilist.co/anime/16498/Shingeki-no-Kyojin/
 *   https://anilist.co/anime/16498
 *   16498  (bare numeric ID, in case the admin pastes just the ID)
 */
export const fetchFromAnilistUrl = async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).json({ message: 'url query param required' });

  const anilistId = extractAnilistId(url);
  if (!anilistId) {
    return res.status(400).json({ message: 'Invalid AniList URL/ID. Expected format: https://anilist.co/anime/16498 or 16498' });
  }

  try {
    const details = await fetchFullDetailsByAnilistId(anilistId);
    if (!details) {
      return res.status(404).json({ message: 'No AniList result for that ID' });
    }

    res.json({
      tmdbId: null,
      imdbId: null,
      anilistId: details.anilistId,
      title: details.title,
      originalTitle: details.originalTitle,
      poster: details.poster,
      backdrop: details.backdrop,
      rating: details.rating,
      runtime: details.runtime,
      status: details.status,
      year: details.year,
      type: details.type,
      genre: details.genre,
      country: details.country,
      director: details.director,
      cast: details.cast,
      description: details.description,
    });
  } catch (error) {
    console.error('[AniList Fetch] Error:', error.message);
    res.status(500).json({ message: 'Failed to fetch from AniList: ' + error.message });
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
    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(96, Math.max(1, parseInt(limit, 10) || 24));

    // ── Base filter (type + genre always apply) ───────────────────────────
    const baseFilter = {};
    if (type)  baseFilter.type  = type;
    if (genre) baseFilter.genre = { $elemMatch: { $regex: `^${genre}$`, $options: 'i' } };

    // ── Search ────────────────────────────────────────────────────────────
    if (search && search.trim()) {
      const raw = search.trim();
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Tokenise — strip stopwords. Numeric tokens are ALWAYS kept regardless
      // of length: dropping single-digit tokens used to strip sequel/franchise
      // numbers (the "3" in "Ip Man 3", the "2" in "John Wick 2"), which made
      // those searches match every entry in the franchise instead of just one.
      const tokens = raw.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
      const STOPWORDS = new Set(["the","a","an","of","in","on","at","to","and","or","is","it","by","as","be","my","he","she","we","do","so","if","up","vs"]);
      const searchTokens = tokens.filter(t => /^\d+$/.test(t) || (t.length > 1 && !STOPWORDS.has(t.toLowerCase())));
      const finalTokens  = searchTokens.length > 0 ? searchTokens : tokens;

      const tokenREs = finalTokens.map(t => new RegExp(escapeRegex(t), "i"));

      // Every token must appear somewhere in title OR originalTitle
      const titleAndFilter = {
        $and: tokenREs.map(re => ({
          $or: [
            { title:         { $regex: re.source, $options: "i" } },
            { originalTitle: { $regex: re.source, $options: "i" } },
          ]
        }))
      };

      // A bare 4-digit query is ambiguous — it could mean "browse this release
      // year" (e.g. "1994") OR be the literal title of something whose name is
      // a number (e.g. "1917", "2012", "2046"). Previously a search for "1917"
      // ONLY filtered by release year and ignored the title entirely, so the
      // movie literally named "1917" (released 2019) never showed up. Now we
      // match either, and rank genuine title hits above plain year hits.
      const isPureYear = /^\d{4}$/.test(raw);
      const yearNum = isPureYear ? parseInt(raw, 10) : null;

      if (isPureYear) {
        baseFilter.$or = [{ year: yearNum }, titleAndFilter];
      } else {
        Object.assign(baseFilter, titleAndFilter);
      }

      const rawResults = await Movie.find(baseFilter).lean();

      // Relevance scoring — title only
      const rawL     = raw.toLowerCase();
      const phraseRE = new RegExp(finalTokens.map(escapeRegex).join("\\s+"), "i");

      const scored = rawResults.map(m => {
        const titleL = (m.title         || "").toLowerCase();
        const origL  = (m.originalTitle || "").toLowerCase();
        const allTokensHit = tokenREs.every(re => re.test(m.title || "") || re.test(m.originalTitle || ""));

        let score;
        if (titleL === rawL || origL === rawL) score = 1000;
        else if (titleL.startsWith(rawL) || origL.startsWith(rawL)) score = 800;
        else if (phraseRE.test(m.title) || phraseRE.test(m.originalTitle)) score = 600;
        else if (allTokensHit) score = 200;
        else score = 0; // only matched via the bare-year branch, no real title relevance

        if (isPureYear && m.year === yearNum) score = Math.max(score, 50);
        score += parseFloat(m.rating || 0) * 2;
        return { ...m, _score: score };
      });

      scored.sort((a, b) => b._score - a._score);

      const total    = scored.length;
      const paginated = scored.slice((pageNum - 1) * limitNum, pageNum * limitNum);
      return res.json({ movies: paginated, totalPages: Math.ceil(total / limitNum), currentPage: pageNum, total });
    }

    // ── No search — pinned always on top, then standard sorted + paginated ─
    let sortQuery = { updatedAt: -1 };
    if (sortBy === 'year')   sortQuery = { year: -1, updatedAt: -1 };
    if (sortBy === 'rating') sortQuery = { rating: -1, updatedAt: -1 };
    if (sortBy === 'title')  sortQuery = { title: 1 };

    // Only inject pinned on page 1 (and only when no type/genre filter hides them)
    const pinnedFilter = { ...baseFilter, pinned: true };
    const pinnedItems  = pageNum === 1
      ? await Movie.find(pinnedFilter).sort({ updatedAt: -1 }).lean()
      : [];

    const pinnedCount  = pinnedItems.length;
    const pinnedIds    = pinnedItems.map(m => m._id);

    // Regular items: exclude pinned so they don't appear twice
    const regularFilter = { ...baseFilter, _id: { $nin: pinnedIds }, pinned: { $ne: true } };

    // On page 1: fill remaining slots after pinned.
    // On page 2+: offset as if page 1 had (limitNum - pinnedCount) regular items.
    const regularLimit = limitNum - pinnedCount;  // slots left on page 1
    const regularSkip  = pageNum === 1
      ? 0
      : regularLimit + (pageNum - 2) * limitNum;  // page1 used regularLimit, each later page uses full limitNum

    const [regularMovies, regularCount] = await Promise.all([
      Movie.find(regularFilter).sort(sortQuery).skip(regularSkip).limit(pageNum === 1 ? regularLimit : limitNum).lean(),
      Movie.countDocuments(regularFilter),
    ]);

    const movies = pageNum === 1 ? [...pinnedItems, ...regularMovies] : regularMovies;

    // Total pages: page 1 holds (pinnedCount + regularLimit) items, rest hold limitNum each
    const totalItems = pinnedCount + regularCount;
    const totalPages = Math.ceil((regularCount - regularLimit) / limitNum) + 1;

    res.json({ movies, totalPages: Math.max(1, totalPages), currentPage: pageNum, total: totalItems });
  } catch (error) {
    console.error('[getMovies]', error.message);
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

    // Step 3b: OMDb fallback — only kicks in when TMDB had literally no match
    if (!tmdbDetails) {
      try {
        tmdbDetails = await fetchFullDetailsFromOMDB(parsed.title, parsed.type, parsed.year);
        if (tmdbDetails) {
          console.log(`[ManualParser] TMDB had no match — OMDb found: ${tmdbDetails.title} (${tmdbDetails.imdbId})`);
        }
      } catch (omdbErr) {
        console.warn('[ManualParser] OMDb fallback failed (non-fatal):', omdbErr.message);
      }
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
 * POST /api/movies/admin/fix-link-types
 * Scans all series/anime entries in DB and stamps linkType on links that don't have one.
 * Rules (same as frontend auto-detect):
 *   - link.episode != null  → skip (never touch episode-wise links)
 *   - filename/url has .zip → linkType = 'zip'
 *   - no .zip, no episode   → linkType = 'package'
 * Streams progress as NDJSON.
 */
export const fixLinkTypes = async (req, res) => {
  const entries = await Movie.find({
    type: { $in: ['series', 'anime'] },
    'links.0': { $exists: true },
  }).select('_id title links').lean();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.write(JSON.stringify({ type: 'start', total: entries.length }) + '\n');

  let updated = 0;
  let skipped = 0;

  for (const entry of entries) {
    let dirty = false;
    const newLinks = entry.links.map(link => {
      // Skip if already has a linkType set
      if (link.linkType) return link;

      const filename = (link.filename || '').toLowerCase();
      const url      = (link.url      || '').toLowerCase();

      let lt;
      if (link.episode != null) {
        lt = 'episode';
      } else if (/\.zip\b/.test(filename) || /\.zip\b/.test(url)) {
        lt = 'zip';
      } else {
        lt = 'package';
      }

      dirty = true;
      return { ...link, linkType: lt };
    });

    if (dirty) {
      await Movie.updateOne({ _id: entry._id }, { $set: { links: newLinks } });
      updated++;
      res.write(JSON.stringify({ type: 'progress', title: entry.title, action: 'updated' }) + '\n');
    } else {
      skipped++;
    }
  }

  res.write(JSON.stringify({ type: 'done', updated, skipped, total: entries.length }) + '\n');
  res.end();
};


/**
 * Body: { movieData, targetId?, updateMode? }
 *
 * updateMode:
 *   'new'     — create a brand-new entry (default when no targetId)
 *   'append'  — keep all existing links, append new ones (skip exact-URL dupes)
 *   'replace' — replace links that match quality+season+episode, keep the rest
 *
 * Returns:
 *   { success, action, movie, appended?, replaced?, duplicatesSkipped? }
 */
export const saveManual = async (req, res) => {
  const { movieData, targetId, updateMode = 'append' } = req.body;
  if (!movieData || !movieData.title) {
    return res.status(400).json({ message: 'movieData with at least a title is required' });
  }

  try {
    // ── Merging into an existing entry ──────────────────────────────────────
    if (targetId) {
      const existingMovie = await Movie.findById(targetId);
      if (!existingMovie) return res.status(404).json({ message: 'Target entry not found' });

      const currentLinks = existingMovie.links || [];
      const incomingLinks = (movieData.links || []).map(l => ({
        ...l,
        source:   l.source   || null,
        priority: l.priority || 'primary',
        health:   l.health   || 'unverified',
      }));

      let finalLinks = [...currentLinks];
      let duplicatesSkipped = 0;
      let replaced = 0;
      let appended = 0;

      for (const newLink of incomingLinks) {
        // Always skip exact-URL duplicates regardless of mode
        const exactDupe = finalLinks.find(el => el.url === newLink.url);
        if (exactDupe) { duplicatesSkipped++; continue; }

        if (updateMode === 'replace') {
          // replace mode: swap out the link with matching quality+season+episode
          const matchIdx = finalLinks.findIndex(el =>
            el.quality === newLink.quality &&
            (el.season  ?? null) === (newLink.season  ?? null) &&
            (el.episode ?? null) === (newLink.episode ?? null)
          );
          if (matchIdx !== -1) {
            finalLinks[matchIdx] = newLink;
            replaced++;
          } else {
            finalLinks.push(newLink);
            appended++;
          }
        } else {
          // append mode: always push — never touch existing links regardless of quality
          finalLinks.push(newLink);
          appended++;
        }
      }

      // Update missing metadata fields only (never overwrite existing)
      const metaFields = ['poster','backdrop','description','rating','genre','director','cast','originalTitle','tmdbId','imdbId','country','runtime','status'];
      const metaUpdate = {};
      for (const f of metaFields) {
        const cur = existingMovie[f];
        const isEmpty = cur === null || cur === undefined || cur === '' || (Array.isArray(cur) && cur.length === 0);
        if (isEmpty && movieData[f]) metaUpdate[f] = movieData[f];
      }
      // Merge audio without duplicates
      const mergedAudio = [...new Set([...(existingMovie.audio || []), ...(movieData.audio || [])])];
      if (mergedAudio.length) metaUpdate.audio = mergedAudio;

      existingMovie.set({ ...metaUpdate, links: finalLinks, updatedAt: new Date() });
      await existingMovie.save();

      console.log(`[ManualParser] MERGED (${updateMode}): ${existingMovie.title} | +${appended} added, ${replaced} replaced, ${duplicatesSkipped} skipped`);
      return res.status(200).json({
        success: true,
        action: updateMode === 'replace' ? 'replaced' : 'appended',
        appended,
        replaced,
        duplicatesSkipped,
        movie: existingMovie,
      });
    }

    // ── Brand-new entry ─────────────────────────────────────────────────────
    const linksWithMeta = (movieData.links || []).map(l => ({
      ...l,
      source:   l.source   || null,
      priority: l.priority || 'primary',
      health:   l.health   || 'unverified',
    }));

    const syntheticMsgId = -(Date.now());
    const newMovie = new Movie({
      ...movieData,
      links: linksWithMeta,
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

// ── Pinned Movies ─────────────────────────────────────────────────────────────

export const getPinned = async (req, res) => {
  try {
    const pinned = await Movie.find({ pinned: true }).sort({ updatedAt: -1 });
    res.json(pinned);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const pinMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      { pinned: true },
      { new: true }
    );
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const unpinMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      { pinned: false },
      { new: true }
    );
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
