import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get("search") || "");

  // Update local state if URL changes (e.g. back button)
  useEffect(() => {
    setQuery(searchParams.get("search") || "");
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    // Always navigate to home on search
    navigate(`/?${params.toString()}`);
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="text-xl md:text-2xl font-bold tracking-tighter text-primary shrink-0">
          MOVIE<span className="text-orange-500">CATALOG</span>
        </Link>
        
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search movies, shows..." 
            className="pl-10 bg-white/5 border-white/10 focus-visible:ring-orange-500 h-9 md:h-10 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-orange-500 transition-colors">Home</Link>
          <Link to="/?type=movie" className="hover:text-orange-500 transition-colors">Movies</Link>
          <Link to="/?type=series" className="hover:text-orange-500 transition-colors">Series</Link>
          <Link to="/?type=anime" className="hover:text-orange-500 transition-colors">Anime</Link>
        </div>
      </div>
    </nav>
  );
}
