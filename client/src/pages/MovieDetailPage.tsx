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
      <div className="relative h-[70vh] md:h-[80vh] w-full overflow-hidden">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={movie.poster} 
            alt="" 
            className="w-full h-full object-cover blur-sm opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="container relative z-10 h-full flex flex-col justify-end pb-12 gap-6 px-6 md:px-12 lg:px-24">
          <div className="flex flex-wrap gap-3 items-center mb-2">
            <Badge className="bg-orange-500 text-white border-0 text-sm py-1">★ {movie.rating || 'N/A'}</Badge>
            <span className="flex items-center gap-1 text-sm font-medium text-white/70">
              <Clock className="h-4 w-4" /> {movie.runtime ? `${movie.runtime} min` : 'N/A'}
            </span>
            <span className="flex items-center gap-1 text-sm font-medium text-white/70">
              <MapPin className="h-4 w-4" /> {movie.country || 'Unknown'}
            </span>
            <span className="text-sm font-medium text-white/70">| {movie.year}</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase max-w-5xl leading-none">
            {movie.title.split(' ').map((word, i) => (
               <span key={i} className={i % 2 === 1 ? "text-orange-500" : ""}>{word} </span>
            ))}
          </h1>

          <p className="max-w-3xl text-xl text-white/80 leading-relaxed line-clamp-3 font-medium">
            {movie.description}
          </p>

          <div className="flex flex-wrap gap-4 mt-4">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-10 h-14 text-lg font-bold">
              <Play className="fill-current mr-2 h-6 w-6" /> TRAILER
            </Button>
            <Button size="lg" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 h-14 px-8">
              <Heart className="mr-2 h-6 w-6" /> SAVE
            </Button>
            <Button size="lg" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 h-14 px-8">
              <Share2 className="mr-2 h-6 w-6" /> SHARE
            </Button>
          </div>
        </div>
      </div>

      {/* Info & Downloads Section */}
      <div className="container py-12 grid lg:grid-cols-3 gap-16 px-6 md:px-12 lg:px-24">
        <div className="lg:col-span-2 space-y-16">
          
          {/* Downloads with Tabs */}
          <section>
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-4">
              DOWNLOADS <div className="h-px flex-1 bg-white/10" />
            </h2>
            
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                  <Info className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-lg">Detailed Files</p>
                  <p className="text-sm text-white/60">
                    Switch between seasons and choose your preferred quality/language below.
                  </p>
                </div>
              </div>
            </div>

            {seasonNames.length > 0 ? (
              <Tabs defaultValue={seasonNames[0]} className="w-full">
                <TabsList className="bg-white/5 border border-white/10 p-1 mb-8">
                  {seasonNames.map(name => (
                    <TabsTrigger 
                      key={name} 
                      value={name}
                      className="data-[state=active]:bg-orange-500 data-[state=active]:text-white font-bold"
                    >
                      {name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {seasonNames.map(name => (
                  <TabsContent key={name} value={name} className="space-y-4">
                    {seasonGroups[name].map((link, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group gap-4">
                        <div className="flex items-start gap-6 overflow-hidden">
                           <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 shrink-0 group-hover:scale-110 transition-transform">
                             <Download className="h-6 w-6" />
                           </div>
                           <div className="overflow-hidden">
                             <span className="font-bold text-lg block truncate" title={link.filename || link.label}>
                               {link.label}
                             </span>
                             <p className="text-xs text-muted-foreground break-all line-clamp-1 italic mb-2">
                               {link.filename || "Direct High Speed Link"}
                             </p>
                             <div className="flex flex-wrap gap-3 mt-1">
                                {link.size && (
                                  <span className="flex items-center gap-1 text-[10px] bg-white/5 px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-wider text-white/60">
                                    <HardDrive className="h-3 w-3" /> {link.size}
                                  </span>
                                )}
                                {link.quality && (
                                  <span className="flex items-center gap-1 text-[10px] bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 font-bold uppercase tracking-wider text-orange-500">
                                    {link.quality}
                                  </span>
                                )}
                                {link.language && (
                                  <span className="flex items-center gap-1 text-[10px] bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 font-bold uppercase tracking-wider text-blue-400">
                                    <Languages className="h-3 w-3" /> {link.language}
                                  </span>
                                )}
                             </div>
                           </div>
                        </div>
                        <Button 
                          onClick={() => handleDownload(link.url)}
                          className="bg-orange-500 hover:bg-orange-600 text-white font-bold md:shrink-0 h-12 px-6"
                        >
                          DOWNLOAD NOW
                        </Button>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="text-center p-12 bg-white/5 rounded-3xl border border-dashed border-white/10 text-muted-foreground">
                No download links available yet.
              </div>
            )}
          </section>

          {/* Cast Section */}
          {movie.cast && movie.cast.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-4">
                TOP CAST <div className="h-px flex-1 bg-white/10" />
              </h2>
              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                {movie.cast.map((person, idx) => (
                  <div key={idx} className="flex-shrink-0 w-32 text-center group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-orange-500 transition-colors mb-3">
                      <img 
                        src={person.profile_path || "https://via.placeholder.com/150x150?text=No+Image"} 
                        alt={person.name} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                      />
                    </div>
                    <p className="font-bold text-sm truncate">{person.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate uppercase">{person.character}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-10">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Original Title</p>
              <p className="text-xl font-black uppercase tracking-tight leading-none">{movie.title}</p>
            </div>
            
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Directed By</p>
              <p className="font-bold text-lg flex items-center gap-2">
                <Film className="h-4 w-4 text-orange-500" /> {movie.director || 'N/A'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Language</p>
                <p className="font-bold">{movie.language}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Year</p>
                <p className="font-bold">{movie.year}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Type</p>
                <p className="font-bold uppercase text-orange-500">{movie.type}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Status</p>
                <p className="font-bold text-green-500">{movie.status || 'Released'}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Genres</p>
              <div className="flex flex-wrap gap-2">
                {movie.genre.map(g => (
                  <Badge key={g} variant="secondary" className="bg-white/10 hover:bg-white/20 text-[10px] px-3 py-1 uppercase">{g}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="aspect-[2/3] rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] group">
            <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
