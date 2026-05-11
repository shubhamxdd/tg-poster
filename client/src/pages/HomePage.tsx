import { useEffect, useState } from "react";
import { movieApi } from "@/api/movieApi";
import type { Movie } from "@/types/index";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useSearchParams } from "react-router-dom";
import { Play } from "lucide-react";

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const data = await movieApi.getMovies({
          type: searchParams.get("type") || undefined,
          search: searchParams.get("search") || undefined,
        });
        setMovies(data.movies);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [searchParams]);

  if (loading) {
    return <div className="container pt-24 text-center">Loading...</div>;
  }

  return (
    <div className="container pt-24 pb-12">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {Array.isArray(movies) && movies.map((movie) => (
          <MovieCard key={movie._id} movie={movie} />
        ))}
      </div>
    </div>
  );
}

function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link to={`/movie/${movie._id}`}>
      <Card className="group relative overflow-hidden bg-transparent border-0 shadow-none transition-all duration-300">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
          <img 
            src={movie.poster || "https://via.placeholder.com/300x450?text=No+Poster"} 
            alt={movie.title}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white">
              <Play className="fill-current w-6 h-6 ml-1" />
            </div>
          </div>
          <Badge className="absolute top-2 right-2 bg-black/50 backdrop-blur-md border-white/10 uppercase text-[10px]">
            {movie.type}
          </Badge>
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold text-sm truncate group-hover:text-orange-500 transition-colors">
            {movie.title}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">{movie.year}</span>
            <span className="text-xs text-muted-foreground">{movie.language}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
