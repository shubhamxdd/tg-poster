import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { movieApi } from "@/api/movieApi";
import type { Movie, Link as MovieLink } from "@/types/index";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Heart, Share2, Download, Info, Clock, MapPin, Film, HardDrive, Languages } from "lucide-react";

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovie = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await movieApi.getMovieById(id);
        setMovie(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  // Group links by season
  const seasonGroups = useMemo(() => {
    if (!movie || !movie.links) return {};
    const groups: Record<string, MovieLink[]> = {};
    
    movie.links.forEach(link => {
      const seasonLabel = link.season ? `Season ${link.season}` : "General";
      if (!groups[seasonLabel]) groups[seasonLabel] = [];
      groups[seasonLabel].push(link);
    });

    return groups;
  }, [movie]);

  const seasonNames = Object.keys(seasonGroups);

  const handleDownload = (url: string) => {
    // Ensure the URL is absolute
    const absoluteUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) return <div className="pt-24 text-center">Loading...</div>;
  if (!movie) return <div className="pt-24 text-center">Movie not found</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[60vh] md:h-[80vh] w-full overflow-hidden">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={movie.poster} 
            alt="" 
            className="w-full h-full object-cover blur-sm opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="container relative z-10 h-full flex flex-col justify-end pb-8 md:pb-12 gap-4 md:gap-6 px-4 md:px-12 lg:px-24">
          <div className="flex flex-wrap gap-2 md:gap-3 items-center mb-1">
            <Badge className="bg-orange-500 text-white border-0 text-xs md:text-sm py-0.5 md:py-1">★ {movie.rating || 'N/A'}</Badge>
            <span className="flex items-center gap-1 text-xs md:text-sm font-medium text-white/70">
              <Clock className="h-3 w-3 md:h-4 md:w-4" /> {movie.runtime ? `${movie.runtime} min` : 'N/A'}
            </span>
            <span className="flex items-center gap-1 text-xs md:text-sm font-medium text-white/70">
              <MapPin className="h-3 w-3 md:h-4 md:w-4" /> {movie.country || 'Unknown'}
            </span>
            <span className="text-xs md:text-sm font-medium text-white/70">| {movie.year}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter uppercase max-w-5xl leading-tight md:leading-none">
            {movie.title.split(' ').map((word, i) => (
               <span key={i} className={i % 2 === 1 ? "text-orange-500" : ""}>{word} </span>
            ))}
          </h1>

          <p className="max-w-3xl text-sm md:text-lg lg:text-xl text-white/80 leading-relaxed line-clamp-3 md:line-clamp-none font-medium hidden sm:block">
            {movie.description}
          </p>

          <div className="flex flex-wrap gap-2 md:gap-4 mt-2">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-6 md:px-10 h-10 md:h-14 text-sm md:text-lg font-bold">
              <Play className="fill-current mr-1 md:mr-2 h-4 w-4 md:h-6 md:w-6" /> TRAILER
            </Button>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 h-10 w-10 md:h-14 md:w-14">
                <Heart className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
              <Button size="icon" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 h-10 w-10 md:h-14 md:w-14">
                <Share2 className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Info & Downloads Section */}
      <div className="container py-8 md:py-12 grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-16 px-4 md:px-12 lg:px-24">
        
        {/* Main Content (Left) */}
        <div className="lg:col-span-2 space-y-12 md:space-y-16 order-2 lg:order-1">
          
          {/* Downloads with Tabs */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 flex items-center gap-4">
              DOWNLOADS <div className="h-px flex-1 bg-white/10" />
            </h2>
            
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl md:rounded-3xl p-4 md:p-8 flex items-center justify-between gap-4 md:gap-8 mb-6 md:mb-10">
              <div className="flex items-center gap-3 md:gap-6">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                  <Info className="h-5 w-5 md:h-7 md:w-7" />
                </div>
                <div className="space-y-0.5 md:space-y-1">
                  <p className="font-bold text-sm md:text-lg">Detailed Files</p>
                  <p className="text-[10px] md:text-sm text-white/60">
                    Switch seasons and choose quality below.
                  </p>
                </div>
              </div>
            </div>

            {seasonNames.length > 0 ? (
              <Tabs defaultValue={seasonNames[0]} className="w-full">
                <TabsList className="bg-white/5 border border-white/10 p-1 mb-6 md:mb-8 flex-wrap h-auto">
                  {seasonNames.map(name => (
                    <TabsTrigger 
                      key={name} 
                      value={name}
                      className="data-[state=active]:bg-orange-500 data-[state=active]:text-white font-bold text-xs md:text-sm flex-1"
                    >
                      {name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {seasonNames.map(name => (
                  <TabsContent key={name} value={name} className="space-y-3 md:space-y-4">
                    {seasonGroups[name].map((link, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group gap-4">
                        <div className="flex items-start gap-3 md:gap-6 overflow-hidden">
                           <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 shrink-0 group-hover:scale-110 transition-transform">
                             <Download className="h-5 w-5 md:h-6 md:w-6" />
                           </div>
                           <div className="overflow-hidden">
                             <span className="font-bold text-base md:text-lg block truncate" title={link.filename || link.label}>
                               {link.label}
                             </span>
                             <p className="text-[10px] md:text-xs text-muted-foreground break-all line-clamp-1 italic mb-2">
                               {link.filename || "Direct High Speed Link"}
                             </p>
                             <div className="flex flex-wrap gap-2 mt-1">
                                {link.size && (
                                  <span className="flex items-center gap-1 text-[8px] md:text-[10px] bg-white/5 px-1.5 md:px-2 py-0.5 md:py-1 rounded border border-white/10 font-bold uppercase tracking-wider text-white/60">
                                    <HardDrive className="h-2 w-2 md:h-3 md:w-3" /> {link.size}
                                  </span>
                                )}
                                {link.quality && (
                                  <span className="flex items-center gap-1 text-[8px] md:text-[10px] bg-orange-500/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded border border-orange-500/20 font-bold uppercase tracking-wider text-orange-500">
                                    {link.quality}
                                  </span>
                                )}
                                {link.language && (
                                  <span className="flex items-center gap-1 text-[8px] md:text-[10px] bg-blue-500/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded border border-blue-500/20 font-bold uppercase tracking-wider text-blue-400">
                                    <Languages className="h-2 w-2 md:h-3 md:w-3" /> {link.language}
                                  </span>
                                )}
                             </div>
                           </div>
                        </div>
                        <Button 
                          onClick={() => handleDownload(link.url)}
                          className="bg-orange-500 hover:bg-orange-600 text-white font-bold md:shrink-0 h-10 md:h-12 px-4 md:px-6 text-xs md:text-sm w-full md:w-auto"
                        >
                          DOWNLOAD NOW
                        </Button>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="text-center p-8 md:p-12 bg-white/5 rounded-2xl md:rounded-3xl border border-dashed border-white/10 text-muted-foreground text-sm">
                No download links available yet.
              </div>
            )}
          </section>

          {/* Cast Section */}
          {movie.cast && movie.cast.length > 0 && (
            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 flex items-center gap-4">
                TOP CAST <div className="h-px flex-1 bg-white/10" />
              </h2>
              <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide">
                {movie.cast.map((person, idx) => (
                  <div key={idx} className="flex-shrink-0 w-24 md:w-32 text-center group">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-orange-500 transition-colors mb-2 md:mb-3">
                      <img 
                        src={person.profile_path || "https://via.placeholder.com/150x150?text=No+Image"} 
                        alt={person.name} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                      />
                    </div>
                    <p className="font-bold text-xs md:text-sm truncate">{person.name}</p>
                    <p className="text-[9px] md:text-[10px] text-muted-foreground truncate uppercase">{person.character}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Info (Right on Desktop, Top on Mobile) */}
        <div className="space-y-6 md:space-y-10 order-1 lg:order-2">
          
          {/* Main Poster (Mobile only) */}
          <div className="lg:hidden aspect-[2/3] w-2/3 mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
             <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-6 md:space-y-8">
            <div>
              <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 md:mb-3">Original Title</p>
              <p className="text-lg md:text-xl font-black uppercase tracking-tight leading-none">{movie.title}</p>
            </div>
            
            <div>
              <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 md:mb-3">Directed By</p>
              <p className="font-bold text-base md:text-lg flex items-center gap-2">
                <Film className="h-4 w-4 text-orange-500" /> {movie.director || 'N/A'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 md:gap-8 text-sm md:text-base">
              <div>
                <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1 md:mb-2">Language</p>
                <p className="font-bold">{movie.language}</p>
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1 md:mb-2">Year</p>
                <p className="font-bold">{movie.year}</p>
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1 md:mb-2">Type</p>
                <p className="font-bold uppercase text-orange-500">{movie.type}</p>
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1 md:mb-2">Status</p>
                <p className="font-bold text-green-500">{movie.status || 'Released'}</p>
              </div>
            </div>

            <div>
              <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 md:mb-3">Genres</p>
              <div className="flex flex-wrap gap-2">
                {movie.genre.map(g => (
                  <Badge key={g} variant="secondary" className="bg-white/10 hover:bg-white/20 text-[9px] md:text-[10px] px-2 md:px-3 py-0.5 md:py-1 uppercase">{g}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Only Poster */}
          <div className="hidden lg:block aspect-[2/3] rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] group">
            <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
