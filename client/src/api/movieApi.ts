import axios from 'axios';
import type { Movie, MovieResponse } from '@/types/index';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const movieApi = {
  getMovies: async (params: {
    type?: string;
    genre?: string;
    search?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get<MovieResponse>('/movies', { params });
    return response.data;
  },

  /**
   * Accepts either a full 24-char ObjectId or a slug like "title-year-{objectId}".
   * The backend controller handles both formats.
   */
  getMovieById: async (idOrSlug: string) => {
    const response = await api.get<Movie>(`/movies/${idOrSlug}`);
    return response.data;
  },

  verifyAdmin: async (password: string) => {
    const response = await api.post('/movies/admin/verify', {}, {
      headers: { 'x-admin-password': password }
    });
    return response.data;
  },

  updateMovie: async (id: string, data: Partial<Movie>, password?: string) => {
    const response = await api.put<Movie>(`/movies/${id}`, data, {
      headers: { 'x-admin-password': password }
    });
    return response.data;
  },

  deleteMovie: async (id: string, password?: string) => {
    const response = await api.delete(`/movies/${id}`, {
      headers: { 'x-admin-password': password }
    });
    return response.data;
  },

  /**
   * Fetches movie/TV details from TMDB via the backend, which uses TMDB_API_KEY from .env.
   * Accepts any TMDB URL: https://www.themoviedb.org/movie/123 or /tv/456-slug
   */
  fetchFromTmdb: async (tmdbUrl: string, password: string) => {
    const response = await api.get('/movies/admin/tmdb-fetch', {
      params: { url: tmdbUrl },
      headers: { 'x-admin-password': password },
    });
    return response.data;
  },

  /**
   * Fetches movie/TV details from OMDb via the backend, using an exact IMDb
   * ID lookup (i=) instead of a title search. Useful when TMDB has no match
   * AND OMDb's own title search also misses — pasting the IMDb URL sidesteps
   * fuzzy matching entirely. Accepts https://www.imdb.com/title/tt1234567 or a bare tt-id.
   */
  fetchFromImdb: async (imdbUrl: string, password: string) => {
    const response = await api.get('/movies/admin/imdb-fetch', {
      params: { url: imdbUrl },
      headers: { 'x-admin-password': password },
    });
    return response.data;
  },

  /**
   * Fetches drama/movie details from MyDramaList via the backend (using the
   * unofficial Kuryana scraper API, since MDL has no official public API).
   * Best for Korean/Asian dramas and films that TMDB/OMDb often can't find
   * under their native or alternate title. Accepts https://mydramalist.com/1872-goblin
   * or a bare slug like "1872-goblin". No uptime guarantee — third-party hosted.
   */
  fetchFromMdl: async (mdlUrl: string, password: string) => {
    const response = await api.get('/movies/admin/mdl-fetch', {
      params: { url: mdlUrl },
      headers: { 'x-admin-password': password },
    });
    return response.data;
  },

  /**
   * Fetches anime details from AniList via the backend, using AniList's
   * official public GraphQL API (no key required). Best for anime, where
   * TMDB's /tv endpoint is often a poor fit (wrong episode counts/art,
   * missing native titles). Accepts https://anilist.co/anime/16498 or a
   * bare numeric ID. Full replace, same as the TMDB/IMDb overrides.
   */
  fetchFromAnilist: async (anilistUrl: string, password: string) => {
    const response = await api.get('/movies/admin/anilist-fetch', {
      params: { url: anilistUrl },
      headers: { 'x-admin-password': password },
    });
    return response.data;
  },

  /**
   * Streams bulk description updates for all movies missing a description.
   * Calls onProgress for each line, returns final summary.
   */
  bulkUpdateDescriptions: async (
    password: string,
    onProgress: (line: { type: string; title?: string; status?: string; updated?: number; failed?: number; total?: number }) => void
  ) => {
    const response = await fetch('/api/movies/admin/bulk-update-descriptions', {
      method: 'POST',
      headers: { 'x-admin-password': password },
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;
      for (const line of lines) {
        if (line.trim()) onProgress(JSON.parse(line));
      }
    }
  },

  /**
   * Searches TMDB for candidates matching title+type+year.
   * Returns up to 8 lightweight results for the admin picker.
   */
  searchTmdbCandidates: async (title: string, type: string, year: number | null, password: string) => {
    const response = await api.get('/movies/admin/tmdb-search', {
      params: { title, type, year: year || undefined },
      headers: { 'x-admin-password': password },
    });
    return response.data as { candidates: any[] };
  },

  /**
   * Fetches full TMDB details for a specific tmdbId chosen by the admin.
   */
  fetchTmdbById: async (tmdbId: string, tmdbType: string, password: string) => {
    const response = await api.get('/movies/admin/tmdb-by-id', {
      params: { tmdbId, tmdbType },
      headers: { 'x-admin-password': password },
    });
    return response.data;
  },

  /**
   * Parses a raw Telegram message text using the server-side regex parser.
   * Returns preview data enriched with TMDB by default. Pass mdlUrl to make
   * MyDramaList the primary source (poster/backdrop still come from an
   * auto-searched TMDB match), or anilistUrl to make AniList the primary
   * source (title/poster/backdrop still come from an auto-searched TMDB
   * match). At most one of these should be set. Does NOT save to DB.
   */
  parseManual: async (text: string, password: string, mdlUrl?: string, anilistUrl?: string) => {
    const response = await api.post('/movies/admin/parse-manual', {
      text,
      mdlUrl: mdlUrl || undefined,
      anilistUrl: anilistUrl || undefined,
    }, {
      headers: { 'x-admin-password': password },
    });
    return response.data as { success: boolean; data: any };
  },

  /**
   * Saves manually-parsed (and optionally edited) movie data to the database.
   * Merges with existing entries if same tmdbId or title+year is found.
   */
  fixLinkTypes: async (password: string, onProgress: (msg: any) => void): Promise<void> => {
    const response = await fetch('/api/movies/admin/fix-link-types', {
      method: 'POST',
      headers: { 'x-admin-password': password, 'Content-Type': 'application/json' },
    });
    if (!response.body) throw new Error('No response body');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) {
          try { onProgress(JSON.parse(line)); } catch {}
        }
      }
    }
  },

  saveManual: async (movieData: any, password: string, targetId?: string, updateMode?: 'append' | 'replace') => {
    const response = await api.post('/movies/admin/save-manual', { movieData, targetId, updateMode }, {
      headers: { 'x-admin-password': password },
    });
    return response.data as { success: boolean; action: string; movie: any; appended?: number; replaced?: number; duplicatesSkipped?: number };
  },

  getPinned: async (password: string) => {
    const response = await api.get('/movies/admin/pinned', { headers: { 'x-admin-password': password } });
    return response.data as any[];
  },

  pinMovie: async (id: string, password: string) => {
    const response = await api.put(`/movies/admin/${id}/pin`, {}, { headers: { 'x-admin-password': password } });
    return response.data;
  },

  unpinMovie: async (id: string, password: string) => {
    const response = await api.put(`/movies/admin/${id}/unpin`, {}, { headers: { 'x-admin-password': password } });
    return response.data;
  },
};
