import { useEffect, useState, useCallback } from "react";
import { movieApi } from "@/api/movieApi";
import type { Movie } from "@/types/index";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useSearchParams } from "react-router-dom";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams] = useSearchParams();

  const fetchMovies = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setPage(1);
    }

    try {
      const currentPage = isLoadMore ? page + 1 : 1;
      const data = await movieApi.getMovies({
        type: searchParams.get("type") || undefined,
        search: searchParams.get("search") || undefined,
        page: currentPage
      });

      if (isLoadMore) {
        setMovies(prev => [...prev, ...data.movies]);
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
  }, [searchParams, page]);

  useEffect(() => {
    fetchMovies(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="container pt-32 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
        <p className="text-muted-foreground font-medium">Loading your collection...</p>
      </div>
    );
  }

  return (
    <div className="container pt-24 pb-24 px-4 md:px-12">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight uppercase">
            {searchParams.get("search") ? `Results for: ${searchParams.get("search")}` : 
             searchParams.get("type") ? `${searchParams.get("type")}s` : 'Latest Uploads'}
          </h2>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
            {movies.length} Items
          </span>
        </div>

        {movies.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
              {movies.map((movie) => (
                <MovieCard key={movie._id} movie={movie} />
              ))}
            </div>

            {page < totalPages && (
              <div className="flex justify-center mt-12">
                <Button 
                  onClick={() => fetchMovies(true)} 
                  disabled={loadingMore}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-12 h-14 rounded-full font-bold uppercase tracking-widest transition-all"
                >
                  {loadingMore ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...</>
                  ) : (
                    "Load More Content"
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-6 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20">
              <Play className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">No results found</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                We couldn't find anything matching your search. Try a different title or category.
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              View All Content
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link to={`/movie/${movie._id}`} className="group">
      <Card className="relative overflow-hidden bg-transparent border-0 shadow-none transition-all duration-500">
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl md:rounded-3xl border border-white/10">
          <img 
            src={movie.poster || "https://via.placeholder.com/300x450?text=No+Poster"} 
            alt={movie.title}
            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
          <div className="absolute inset-0 bg-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(249,115,22,0.5)] scale-75 group-hover:scale-100 transition-transform duration-500">
              <Play className="fill-current w-6 h-6 ml-1" />
            </div>
          </div>
          <Badge className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border-white/10 uppercase text-[10px] font-bold tracking-widest px-3">
            {movie.type}
          </Badge>
          {movie.rating && (
            <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-orange-500">
              ★ {movie.rating}
            </div>
          )}
        </div>
        <CardContent className="p-4 space-y-1">
          <h3 className="font-bold text-base truncate group-hover:text-orange-500 transition-colors uppercase tracking-tight">
            {movie.title}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-white/40">{movie.year}</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-xs font-medium text-white/40 uppercase tracking-widest">{movie.language}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
