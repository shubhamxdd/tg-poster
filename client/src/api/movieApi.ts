import axios from 'axios';
import type { Movie, MovieResponse } from '@/types/index';

const API_BASE_URL = 'http://localhost:3000/api';

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
  getMovieById: async (id: string) => {
    const response = await api.get<Movie>(`/movies/${id}`);
    return response.data;
  },
};
