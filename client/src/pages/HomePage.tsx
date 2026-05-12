import { useEffect, useState, useCallback } from "react";
import { movieApi } from "@/api/movieApi";
import type { Movie } from "@/types/index";
import { Link, useSearchParams } from "react-router-dom";
import { generateMovieSlugFull } from "@/lib/utils";
import {
  Button,
  Spinner,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { Play, Download, Star, Search, Filter, SortAsc } from "lucide-react";

const GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Drama", "Family", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller"];

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();

  // Local state for UI components (synced to searchParams)
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");

  const fetchMovies = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) setLoadingMore(true);
      else { setLoading(true); setPage(1); }

      try {
        const currentPage = isLoadMore ? page + 1 : 1;
        const data = await movieApi.getMovies({
          type: searchParams.get("type") || undefined,
          genre: searchParams.get("genre") || undefined,
          search: searchParams.get("search") || undefined,
          sortBy: searchParams.get("sortBy") || "addedAt",
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

  useEffect(() => {
    fetchMovies(false);
  }, [searchParams]);

  // Debounced Search Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (searchParams.get("search") || "")) {
        const newParams = new URLSearchParams(searchParams);
        if (searchInput) newParams.set("search", searchInput);
        else newParams.delete("search");
        newParams.set("page", "1");
        setSearchParams(newParams);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "all") newParams.set(key, value);
    else newParams.delete(key);
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const searchQuery = searchParams.get("search");

  return (
    <div className="pt-24 pb-24 min-h-screen">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Control Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-10 items-end lg:items-center">
          <div className="w-full lg:max-w-md">
            <Input
              placeholder="Search movies, series..."
              value={searchInput}
              onValueChange={setSearchInput}
              startContent={<Search className="text-white/30 w-4 h-4" />}
              className="bg-white/5 border-white/10"
              classNames={{
                inputWrapper: "bg-white/5 border border-white/10 group-data-[focus=true]:border-brand/50 h-12",
                input: "text-sm",
              }}
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <Select
              placeholder="Type"
              selectedKeys={[searchParams.get("type") || "all"]}
              onSelectionChange={(keys) => updateParam("type", Array.from(keys)[0] as string)}
              className="w-32"
              size="sm"
              startContent={<Filter className="w-3 h-3 text-white/40" />}
              classNames={{
                trigger: "bg-white/5 border border-white/10 h-12",
                value: "text-xs font-semibold text-white/70",
              }}
            >
              <SelectItem key="all">All Types</SelectItem>
              <SelectItem key="movie">Movies</SelectItem>
              <SelectItem key="series">Series</SelectItem>
              <SelectItem key="anime">Anime</SelectItem>
            </Select>

            <Select
              placeholder="Genre"
              selectedKeys={[searchParams.get("genre") || "all"]}
              onSelectionChange={(keys) => updateParam("genre", Array.from(keys)[0] as string)}
              className="w-40"
              size="sm"
              classNames={{
                trigger: "bg-white/5 border border-white/10 h-12",
                value: "text-xs font-semibold text-white/70",
              }}
            >
              <SelectItem key="all">All Genres</SelectItem>
              {GENRES.map(g => (
                <SelectItem key={g}>{g}</SelectItem>
              ))}
            </Select>

            <Select
              placeholder="Sort By"
              selectedKeys={[searchParams.get("sortBy") || "addedAt"]}
              onSelectionChange={(keys) => updateParam("sortBy", Array.from(keys)[0] as string)}
              className="w-44"
              size="sm"
              startContent={<SortAsc className="w-3 h-3 text-white/40" />}
              classNames={{
                trigger: "bg-white/5 border border-white/10 h-12",
                value: "text-xs font-semibold text-white/70",
              }}
            >
              <SelectItem key="addedAt">Date Added</SelectItem>
              <SelectItem key="year">Release Year</SelectItem>
              <SelectItem key="rating">Top Rated</SelectItem>
              <SelectItem key="title">A - Z</SelectItem>
            </Select>

            {(searchQuery || searchParams.get("type") || searchParams.get("genre")) && (
              <Button
                variant="light"
                onPress={() => {
                  setSearchInput("");
                  setSearchParams(new URLSearchParams());
                }}
                className="text-white/40 text-xs h-12 hover:text-white"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <Spinner color="primary" size="lg" />
            <p className="text-white/40 font-display tracking-widest text-sm uppercase">Refreshing Vault...</p>
          </div>
        ) : movies.length > 0 ? (
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
              variant="flat"
              onPress={() => {
                setSearchInput("");
                setSearchParams(new URLSearchParams());
              }}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-10 rounded-full"
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

