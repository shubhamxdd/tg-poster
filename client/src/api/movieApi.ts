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
    page?: number;
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
};
