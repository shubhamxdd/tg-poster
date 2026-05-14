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
    language?: string;
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
  saveManual: async (movieData: any, password: string) => {
    const response = await api.post('/movies/admin/save-manual', { movieData }, {
      headers: { 'x-admin-password': password },
    });
    return response.data as { success: boolean; action: string; movie: any };
  },
};
