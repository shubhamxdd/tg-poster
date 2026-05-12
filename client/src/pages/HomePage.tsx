import { useEffect, useState, useCallback } from "react";
import { movieApi } from "@/api/movieApi";
import type { Movie } from "@/types/index";
import { Link, useSearchParams } from "react-router-dom";
import { generateMovieSlugFull } from "@/lib/utils";
import {
  Button,
  Spinner,
} from "@heroui/react";
import { Play, Download, Star } from "lucide-react";

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams] = useSearchParams();

  const fetchMovies = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) setLoadingMore(true);
      else { setLoading(true); setPage(1); }

      try {
        const currentPage = isLoadMore ? page + 1 : 1;
        const data = await movieApi.getMovies({
          type: searchParams.get("type") || undefined,
          search: searchParams.get("search") || undefined,
          page: currentPage,
        });

        if (isLoadMore) {
          setMovies((prev) => [...prev, ...data.movies]);
          setPage(currentPage);
        } else {
          setMovies(data.movies);
        }
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchParams, page]
  );

  useEffect(() => { fetchMovies(false); }, [searchParams]);

  const searchQuery = searchParams.get("search");
  const typeFilter = searchParams.get("type");

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 pt-20">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center animate-pulse">
            <Play className="w-8 h-8 text-brand" />
          </div>
          <div className="absolute -inset-2 rounded-3xl border border-brand/10 animate-ping" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-display text-2xl tracking-wider text-white">LOADING VAULT</p>
          <p className="text-white/40 text-sm">Fetching the latest content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-24">
      <div className="container mx-auto px-4 md:px-8">
        {/* Search result label only */}
        {(searchQuery || typeFilter) && (
          <div className="mb-6">
            <h2 className="font-display text-2xl tracking-wider text-white/70">
              {searchQuery ? `Results for "${searchQuery}"` : `${typeFilter!.charAt(0).toUpperCase() + typeFilter!.slice(1)}s`}
            </h2>
          </div>
        )}

        {/* Grid */}
        {movies.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
              {movies.map((movie) => (
                <MovieCard key={movie._id} movie={movie} />
              ))}
            </div>

            {page < totalPages && (
              <div className="flex justify-center mt-16">
                <Button
                  onPress={() => fetchMovies(true)}
                  isLoading={loadingMore}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand/30 text-white px-14 h-13 font-bold uppercase tracking-widest rounded-full transition-all"
                  variant="bordered"
                  size="lg"
                >
                  {loadingMore ? <Spinner size="sm" color="white" /> : "Load More"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center gap-8">
            <div className="w-24 h-24 rounded-3xl bg-white/3 border border-white/8 flex items-center justify-center">
              <Download className="w-10 h-10 text-white/15" />
            </div>
            <div className="space-y-3">
              <h3 className="font-display text-3xl tracking-wider text-white/60">NOTHING FOUND</h3>
              <p className="text-white/30 max-w-sm mx-auto text-sm">
                No content matches your search. Try a different title or browse all categories.
              </p>
            </div>
            <Button
              as={Link}
              to="/"
              className="bg-brand hover:bg-brand-dark text-white font-bold px-10 rounded-full"
            >
              Browse All
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}


function MovieCard({ movie }: { movie: Movie }) {
  const slug = generateMovieSlugFull(movie.title, movie.year, movie._id);

  const TYPE_COLORS: Record<string, string> = {
    movie: "bg-blue-600",
    series: "bg-purple-600",
    anime: "bg-pink-600",
  };
  const typeClass = TYPE_COLORS[movie.type] || "bg-white/30";

  return (
    <Link to={`/movie/${slug}`} className="group block select-none">
      {/* Poster wrapper — padding-bottom trick for consistent 2:3 ratio */}
      <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: "150%" }}>
        <img
          src={movie.poster || "https://placehold.co/300x450/111215/444?text=No+Poster"}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          draggable={false}
        />

        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

        {/* Hover tint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />

        {/* Type — top right */}
        <span className={`absolute top-2 right-2 z-10 text-[9px] font-bold uppercase tracking-widest text-white px-2 py-0.5 rounded-md ${typeClass}`}>
          {movie.type}
        </span>

        {/* Year — bottom left */}
        {movie.year && (
          <span className="absolute bottom-2 left-2 z-10 text-[10px] font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
            {movie.year}
          </span>
        )}

        {/* Rating — bottom right */}
        {movie.rating && (
          <span className="absolute bottom-2 right-2 z-10 flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]" />
            <span className="text-[11px] font-bold text-amber-400 drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">
              {movie.rating}
            </span>
          </span>
        )}
      </div>

      {/* Title */}
      <p className="mt-2 px-0.5 text-[13px] font-bold text-white leading-tight line-clamp-1 group-hover:text-brand transition-colors">
        {movie.title}
      </p>
    </Link>
  );
}

