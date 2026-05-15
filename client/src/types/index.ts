export type Link = {
  label: string;
  url: string;
  quality?: string;
  size?: string;
  season?: number | null;
  episode?: number | null;
  filename?: string;
};

export type Cast = {
  name: string;
  character: string;
  profile_path: string | null;
};

export type Movie = {
  _id: string;
  title: string;
  originalTitle?: string;
  type: 'movie' | 'series' | 'anime';
  links: Link[];
  link: string; // fallback
  poster: string;
  backdrop?: string;
  genre: string[];
  year: number | null;
  audio?: string[];
  description: string;
  rating?: string;
  runtime?: string;
  status?: string;
  country?: string;
  director?: string;
  cast?: Cast[];
  telegramMsgId: number;
  addedAt: string;
};

export type MovieResponse = {
  movies: Movie[];
  totalPages: number;
  currentPage: number;
};

export const TYPES_LOADED = true;
