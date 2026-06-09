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
   * Returns preview data enriched with TMDB. Does NOT save to DB.
   */
  parseManual: async (text: string, password: string) => {
    const response = await api.post('/movies/admin/parse-manual', { text }, {
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
