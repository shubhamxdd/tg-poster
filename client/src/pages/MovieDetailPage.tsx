import { useEffect, useState, useMemo, useRef } from "react";
import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { movieApi } from "@/api/movieApi";
import type { Movie, Link as MovieLink } from "@/types/index";
import { extractFullIdFromSlug } from "@/lib/utils";
import {
  Card,
  CardBody,
  Button,
  Chip,
  Tabs,
  Tab,
  Image,
  Avatar,
  Divider,
  Tooltip,
} from "@heroui/react";
import {
  Download,
  Star,
  Clock,
  Globe,
  Film,
  Share2,
  Heart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  HardDrive,
  Languages,
  Calendar,
  Clapperboard,
  Tv2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

import { detailCache } from "@/lib/movieDetailCache";

export default function MovieDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Derive id first — all state that depends on it must come after
  const id = useMemo(() => (slug ? extractFullIdFromSlug(slug) : ""), [slug]);

  const [movie, setMovie] = useState<Movie | null>(null);
  // Start loading=false; the fetch useEffect sets it to true when needed.
  // This prevents a permanent black screen if id is empty or invalid.
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [wishlist, setWishlist] = useState(false);
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<string, boolean>>({});

  // True when there's a real history entry behind us (user navigated from within the app)
  const canGoBack = (window.history.state?.idx ?? 0) > 0;
  const handleBack = () => canGoBack ? navigate(-1) : navigate("/");

  // Sync wishlist from localStorage whenever id is known
  useEffect(() => {
    if (!id) return;
    try { setWishlist(localStorage.getItem(`wishlist:${id}`) === "1"); } catch {}
  }, [id]);

  const toggleWishlist = () => {
    setWishlist(prev => {
      const next = !prev;
      try { next ? localStorage.setItem(`wishlist:${id}`, "1") : localStorage.removeItem(`wishlist:${id}`); } catch {}
      return next;
    });
  };

  // Scroll to top on every page open — fixes random scroll position on mobile/tablet
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    if (!id) return; // no id = nothing to fetch, don't show spinner

    setFetchError(false);

    const fetchMovie = async (isBackground = false) => {
      const cached = detailCache.get(id);
      if (cached) {
        // Show cached data instantly — no loading spinner
        setMovie(cached);
        setLoading(false);
        if (!isBackground) return;
      } else {
        setLoading(true);
      }

      try {
        const data = await movieApi.getMovieById(id);
        detailCache.set(id, data);
        setMovie(data);
      } catch (error) {
        console.error(error);
        if (!isBackground) setFetchError(true);
      } finally {
        setLoading(false);
      }
    };

    // If we have a cache hit, revalidate silently in background; otherwise fetch fresh
    fetchMovie(detailCache.has(id));
  }, [id]);

  const seasonGroups = useMemo(() => {
    if (!movie?.links) return {} as Record<string, MovieLink[]>;
    const groups: Record<string, MovieLink[]> = {};

    movie.links.forEach((link) => {
      let key = "Downloads";

      if (link.season) {
        key = `Season ${link.season}`;
      } else {
        const seasonMatch = link.label.match(/Season\s*(\d+)|S(\d+)/i);
        if (seasonMatch) {
          const sNum = seasonMatch[1] || seasonMatch[2];
          key = `Season ${parseInt(sNum)}`;
        } else if (link.label.toLowerCase().includes("movie")) {
          key = "Movie";
        }
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(link);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Downloads") return 1;
      if (b === "Downloads") return -1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    const sortedGroups: Record<string, MovieLink[]> = {};
    sortedKeys.forEach(k => {
      sortedGroups[k] = groups[k].sort((a, b) => {
        if (a.episode && b.episode) return a.episode - b.episode;
        if (a.episode) return -1;
        if (b.episode) return 1;
        return 0;
      });
    });

    return sortedGroups;
  }, [movie]);

  const seasonNames = Object.keys(seasonGroups);

  const handleDownload = (url: string) => {
    const absoluteUrl = url.startsWith("http") ? url : `https://${url}`;
    window.open(absoluteUrl, "_blank", "noopener,noreferrer");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: movie?.title || "", url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const toggleEpisode = (key: string) => {
    setExpandedEpisodes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const TYPE_ICON: Record<string, React.ElementType> = {
    movie: Film,
    series: Tv2,
    anime: Sparkles,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
      <div className="space-y-6 text-center">
      <div className="w-64 h-8 skeleton-shimmer rounded-lg mx-auto" />
      <div className="w-48 h-4 skeleton-shimmer rounded-lg mx-auto" />
      <div className="flex items-center justify-center gap-2 mt-8">
      <div className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0ms" }} />
      <div className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "150ms" }} />
      <div className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 gap-6">
      <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
      <Film className="w-10 h-10 text-white/20" />
      </div>
      <div className="text-center space-y-2">
      <h2 className="font-display text-3xl tracking-wider">FAILED TO LOAD</h2>
      <p className="text-white/40 text-sm">Something went wrong. Check your connection and try again.</p>
      </div>
      <div className="flex gap-3">
      <Button onPress={() => { setFetchError(false); setLoading(true); movieApi.getMovieById(id).then(d => { detailCache.set(id, d); setMovie(d); }).catch(() => setFetchError(true)).finally(() => setLoading(false)); }} className="bg-brand text-white rounded-full font-bold">
      Retry
      </Button>
      <Button as={Link} to="/" variant="flat" className="text-white/60 rounded-full">
      Back to Vault
      </Button>
      </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 gap-6">
      <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
      <Film className="w-10 h-10 text-white/20" />
      </div>
      <div className="text-center space-y-2">
      <h2 className="font-display text-3xl tracking-wider">NOT FOUND</h2>
      <p className="text-white/40 text-sm">This title doesn't exist in the vault.</p>
      </div>
      <Button as={Link} to="/" className="bg-brand text-white rounded-full font-bold">
      Back to Vault
      </Button>
      </div>
    );
  }

  const TypeIcon = TYPE_ICON[movie.type] || Film;
  const typeColor =
  movie.type === "movie"
  ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
  : movie.type === "series"
  ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
  : "text-pink-400 bg-pink-500/10 border-pink-500/20";

  return (
    <div className="min-h-screen">
    {/* ─── CINEMATIC HERO ─── */}
    <div className="relative h-[70vh] md:h-[85vh] overflow-hidden">
    <div className="absolute inset-0">
    <img
    src={movie.backdrop || movie.poster}
    alt=""
    className="w-full h-full object-cover brightness-40"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F] via-[#0D0D0F]/60 to-[#0D0D0F]/20" />
    <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0F]/80 via-transparent to-transparent" />
    <div className="absolute inset-0 noise-bg opacity-60" />
    </div>

    <div className="absolute top-20 left-4 md:left-8 z-20">
    <Button
    onPress={handleBack}
    variant="flat"
    className="bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white rounded-xl h-9 px-3 text-sm"
    startContent={<ChevronLeft className="w-4 h-4" />}
    >
    Back
    </Button>
    </div>

    <div className="absolute inset-0 flex items-end z-10">
    <div className="container mx-auto px-4 md:px-8 lg:px-16 pb-12 flex gap-8 md:gap-12 items-end">
    <div className="hidden md:block shrink-0 w-48 lg:w-60">
    <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.8)] ring-1 ring-white/5">
    <Image
    src={movie.poster}
    alt={movie.title}
    classNames={{ img: "w-full h-full object-cover" }}
    radius="none"
    removeWrapper
    />
    </div>
    </div>

    <div className="flex-1 min-w-0 space-y-4 md:space-y-5">
    <div className="flex flex-wrap items-center gap-2">
    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${typeColor}`}>
    <TypeIcon className="w-3 h-3" />
    {movie.type}
    </span>
    {movie.rating && (
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-lg">
      <Star className="w-3 h-3 fill-amber-400" />
      {movie.rating} / 10
      </span>
    )}
    {movie.status && (
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-lg">
      <ShieldCheck className="w-3 h-3" />
      {movie.status}
      </span>
    )}
    </div>

    <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-8xl tracking-wider text-white leading-none">
    {movie.title}
    </h1>

    <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
    {movie.year && (
      <span className="flex items-center gap-1.5">
      <Calendar className="w-3.5 h-3.5 text-brand" />
      {movie.year}
      </span>
    )}
    {movie.runtime && (
      <>
      <span className="w-1 h-1 rounded-full bg-white/20" />
      <span className="flex items-center gap-1.5">
      <Clock className="w-3.5 h-3.5 text-brand" />
      {movie.runtime} min
      </span>
      </>
    )}
    {movie.country && (
      <>
      <span className="w-1 h-1 rounded-full bg-white/20" />
      <span className="flex items-center gap-1.5">
      <Globe className="w-3.5 h-3.5 text-brand" />
      {movie.country}
      </span>
      </>
    )}
    {movie.audio?.length ? (
      <>
      <span className="w-1 h-1 rounded-full bg-white/20" />
      <span className="flex items-center gap-1.5">
      <Languages className="w-3.5 h-3.5 text-brand" />
      {movie.audio.join(" · ")}
      </span>
      </>
    ) : null}
    </div>

    {movie.description && (
      <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-2xl line-clamp-3">
      {movie.description}
      </p>
    )}

    <div className="flex flex-wrap gap-2">
    {movie.genre?.map((g) => (
      <Chip
      key={g}
      size="sm"
      className="bg-white/5 border border-white/10 text-white/50 text-[10px] uppercase tracking-wider hover:bg-white/10 transition-colors"
      >
      {g}
      </Chip>
    ))}
    </div>

    <div className="flex flex-wrap gap-3 pt-1">
    <Tooltip content={wishlist ? "Remove from watchlist" : "Add to watchlist"}>
    <Button
    isIconOnly
    variant="flat"
    onPress={toggleWishlist}
    className={`h-12 w-12 rounded-xl border ${wishlist ? "bg-brand/20 border-brand/30 text-brand" : "bg-white/5 border-white/10 text-white/50 hover:text-white"} transition-all`}
    >
    <Heart className={`w-5 h-5 ${wishlist ? "fill-current" : ""}`} />
    </Button>
    </Tooltip>
    <Tooltip content="Share">
    <Button
    isIconOnly
    variant="flat"
    onPress={handleShare}
    className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all"
    >
    <Share2 className="w-5 h-5" />
    </Button>
    </Tooltip>
    </div>
    </div>
    </div>
    </div>
    </div>

    {/* ─── MAIN CONTENT ─── */}
    <div className="container mx-auto px-4 md:px-8 lg:px-16 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
    {/* LEFT — Downloads + Cast */}
    <div className="lg:col-span-2 space-y-14">

    <section id="downloads">
    <div className="flex items-center gap-4 mb-8">
    <Download className="w-5 h-5 text-brand" />
    <h2 className="font-display text-3xl tracking-wider">DOWNLOADS</h2>
    <div className="h-px flex-1 bg-white/8" />
    <span className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
    {movie.links?.length || 0} files
    </span>
    </div>

    {seasonNames.length > 1 ? (
      <SeasonSlider
        seasonNames={seasonNames}
        seasonGroups={seasonGroups}
        onDownload={handleDownload}
        movieAudio={movie.audio}
        expandedEpisodes={expandedEpisodes}
        onToggleEpisode={toggleEpisode}
      />
    ) : seasonNames.length === 1 ? (
      <SeasonContent
        seasonName={seasonNames[0]}
        links={seasonGroups[seasonNames[0]]}
        onDownload={handleDownload}
        movieAudio={movie.audio}
        expandedEpisodes={expandedEpisodes}
        onToggleEpisode={toggleEpisode}
      />
    ) : (
      <div className="text-center py-16 bg-white/3 border border-dashed border-white/8 rounded-2xl">
      <Download className="w-10 h-10 text-white/15 mx-auto mb-3" />
      <p className="text-white/30 text-sm">No download links available yet.</p>
      </div>
    )}
    </section>

    {movie.cast && movie.cast.length > 0 && (
      <section>
      <div className="flex items-center gap-4 mb-8">
      <Clapperboard className="w-5 h-5 text-brand" />
      <h2 className="font-display text-3xl tracking-wider">CAST</h2>
      <div className="h-px flex-1 bg-white/8" />
      </div>
      <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
      {movie.cast.map((person, idx) => (
        <div key={idx} className="flex-shrink-0 flex flex-col items-center gap-2.5 w-20 group cursor-pointer">
        <Avatar
        src={person.profile_path || undefined}
        name={person.name}
        className="w-16 h-16 text-sm font-bold ring-2 ring-white/10 group-hover:ring-brand/50 transition-all"
        isBordered
        color="default"
        />
        <div className="text-center">
        <p className="text-[11px] font-bold text-white/80 line-clamp-2 leading-tight">{person.name}</p>
        <p className="text-[10px] text-white/30 truncate">{person.character}</p>
        </div>
        </div>
      ))}
      </div>
      </section>
    )}
    </div>

    {/* RIGHT — Sidebar Info */}
    <div className="space-y-6">
    <Card className="bg-[#111215] border border-white/8 rounded-2xl">
    <CardBody className="p-6 space-y-6">
    <InfoRow label="Original Title" value={movie.title} />
    <Divider className="bg-white/5" />
    {movie.director && (
      <>
      <InfoRow label="Director" value={movie.director} icon={<Film className="w-3.5 h-3.5 text-brand" />} />
      <Divider className="bg-white/5" />
      </>
    )}
    <div className="grid grid-cols-2 gap-4">
    <InfoRow label="Year" value={String(movie.year || "N/A")} />
    <InfoRow label="Type" value={movie.type} valueClass="text-brand" />
    {movie.runtime && <InfoRow label="Runtime" value={`${movie.runtime}m`} />}
    {movie.country && <InfoRow label="Country" value={movie.country} />}
    {movie.status && <InfoRow label="Status" value={movie.status} valueClass="text-emerald-400" />}
    </div>
    {movie.audio?.length ? (
      <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">Audio</p>
      <div className="flex flex-wrap gap-2">
      {movie.audio.map((lang) => (
        <span key={lang} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-brand/10 text-brand border border-brand/20">
        <Languages className="w-3 h-3" />
        {lang}
        </span>
      ))}
      </div>
      </div>
    ) : null}
    <Divider className="bg-white/5" />
    <div>
    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3 font-medium">Genres</p>
    <div className="flex flex-wrap gap-1.5">
    {movie.genre?.map((g) => (
      <Chip
      key={g}
      size="sm"
      className="bg-white/5 border border-white/10 text-white/60 text-[10px] uppercase tracking-wider"
      >
      {g}
      </Chip>
    ))}
    </div>
    </div>
    </CardBody>
    </Card>
    </div>
    </div>
    </div>
  );
}

/* ── SeasonSlider — scrollable season picker with arrows + fade hints ── */

function SeasonSlider({
  seasonNames,
  seasonGroups,
  onDownload,
  movieAudio,
  expandedEpisodes,
  onToggleEpisode,
}: {
  seasonNames: string[];
  seasonGroups: Record<string, MovieLink[]>;
  onDownload: (url: string) => void;
  movieAudio?: string[];
  expandedEpisodes: Record<string, boolean>;
  onToggleEpisode: (key: string) => void;
}) {
  const [activeSeason, setActiveSeason] = useState(seasonNames[0]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -160 : 160, behavior: "smooth" });
  };

  return (
    <div className="space-y-5">
      <div className="relative">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0D0D0F] to-transparent z-10 pointer-events-none rounded-l-2xl" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0D0D0F] to-transparent z-10 pointer-events-none rounded-r-2xl" />
        )}
        {canScrollLeft && (
          <button
            onPointerDown={(e) => { e.preventDefault(); scroll("left"); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-white/70" />
          </button>
        )}
        {canScrollRight && (
          <button
            onPointerDown={(e) => { e.preventDefault(); scroll("right"); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5 text-white/70" />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1 bg-white/3 border border-white/8 rounded-2xl"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {seasonNames.map((name) => (
            <button
              key={name}
              type="button"
              onPointerDown={(e) => { e.preventDefault(); setActiveSeason(name); }}
              className={`shrink-0 h-9 px-5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200
                ${activeSeason === name
                  ? "bg-brand text-white shadow-lg shadow-brand/30"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
            >
              {name}
            </button>
          ))}
        </div>
        {seasonNames.length > 3 && (
          <p className="text-center text-[10px] text-white/20 mt-1.5 tracking-wider">
            ← swipe to see all seasons →
          </p>
        )}
      </div>
      <SeasonContent
        seasonName={activeSeason}
        links={seasonGroups[activeSeason]}
        onDownload={onDownload}
        movieAudio={movieAudio}
        expandedEpisodes={expandedEpisodes}
        onToggleEpisode={onToggleEpisode}
      />
    </div>
  );
}

/* ── SeasonContent — renders links for one season with expandable multi-quality episodes ── */

function SeasonContent({
  seasonName,
  links,
  onDownload,
  movieAudio,
  expandedEpisodes,
  onToggleEpisode,
}: {
  seasonName: string;
  links: MovieLink[];
  onDownload: (url: string) => void;
  movieAudio?: string[];
  expandedEpisodes: Record<string, boolean>;
  onToggleEpisode: (key: string) => void;
}) {
  // Split links by explicit linkType, then handle untyped with episode logic
  const zipLinks:     MovieLink[] = [];
  const packageLinks: MovieLink[] = [];
  const episodeLinks: MovieLink[] = [];
  const untyped:      MovieLink[] = [];

  for (const link of links) {
    if      (link.linkType === 'zip')     zipLinks.push(link);
    else if (link.linkType === 'package') packageLinks.push(link);
    else if (link.linkType === 'episode') episodeLinks.push(link);
    else                                  untyped.push(link);
  }

  // Build episode map from:
  //   1. explicitly typed episode links
  //   2. untyped links that have a real episode number (old data / linkType missing)
  // Untyped links with NO episode number stay as nonEpisodeLinks (season packs, etc.)
  const untypedEpisodes = untyped.filter(l => l.episode != null);
  const untypedNonEpisodes = untyped.filter(l => l.episode == null);
  const episodeSourceLinks = [...episodeLinks, ...untypedEpisodes];

  const episodeMap = new Map<number, MovieLink[]>();
  const nonEpisodeLinks: MovieLink[] = [...untypedNonEpisodes];

  for (const link of episodeSourceLinks) {
    let realEp = link.episode ?? null;
    if (realEp) {
      const fullStr = `${link.label || ''} ${link.filename || ''}`.toUpperCase();
      const epNum = Number(realEp);
      if (epNum === 5 && fullStr.includes("ZEE5") && !/(?:EP|E|EPISODE|S\d+E)\s*0*5\b/i.test(fullStr)) realEp = null;
      if ((epNum === 264 || epNum === 265) && /H\.?26[45]|X26[45]/.test(fullStr) && !/(?:EP|E|EPISODE|S\d+E)\s*0*(264|265)\b/i.test(fullStr)) realEp = null;
    }
    if (realEp) {
      if (!episodeMap.has(realEp)) episodeMap.set(realEp, []);
      episodeMap.get(realEp)!.push(link);
    } else {
      nonEpisodeLinks.push(link);
    }
  }
  const sortedEpisodes = Array.from(episodeMap.entries()).sort(([a], [b]) => a - b);

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-3 pt-2 pb-1">
    <div className="h-px flex-1 bg-white/8" />
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 shrink-0">{title}</span>
    <div className="h-px flex-1 bg-white/8" />
    </div>
  );

  const EpisodeGroup = () => (
    <>
    {nonEpisodeLinks.map((link, idx) => (
      <DownloadRow key={`non-ep-${idx}`} link={link} onDownload={onDownload} movieAudio={movieAudio} />
    ))}
    {sortedEpisodes.map(([epNum, epLinks]) => {
      const groupKey = `${seasonName}-ep${epNum}`;
      if (epLinks.length === 1) {
        return <DownloadRow key={groupKey} link={epLinks[0]} onDownload={onDownload} movieAudio={movieAudio} />;
      }
      const isOpen = expandedEpisodes[groupKey] ?? false;
      const qualities = epLinks.map(l => l.quality).filter(Boolean).join(" \u00b7 ");
      return (
        <div key={groupKey} className="rounded-2xl border border-white/8 overflow-hidden">
        <button type="button" onPointerDown={(e) => { e.preventDefault(); onToggleEpisode(groupKey); }} className="w-full flex items-center justify-between gap-4 px-5 py-4 bg-[#111215] hover:bg-[#16181C] transition-colors group">
        <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 group-hover:bg-brand/20 transition-colors">
        <Download className="w-4 h-4 text-brand" />
        </div>
        <div className="text-left min-w-0">
        <p className="font-bold text-sm text-white">Episode {epNum}</p>
        <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-white/30">{epLinks.length} qualities available</span>
        {qualities && <span className="text-[10px] text-amber-400/60 font-mono">{qualities}</span>}
        </div>
        </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand/60 bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-lg">
        {isOpen ? "Collapse" : "Select Quality"}
        </span>
        <ChevronDown className={`w-4 h-4 text-white/30 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
        </button>
        {isOpen && (
          <div className="border-t border-white/8 bg-[#0D0D0F] p-3 space-y-2">
          {epLinks.map((link, idx) => <DownloadRow key={idx} link={link} onDownload={onDownload} movieAudio={movieAudio} />)}
          </div>
        )}
        </div>
      );
    })}
    </>
  );

  const hasTyped = zipLinks.length > 0 || packageLinks.length > 0 || episodeMap.size > 0;

  return (
    <div className="space-y-3">
    {hasTyped ? (
      <>
      {zipLinks.length > 0 && (
        <><SectionHeader title="Zip Downloads" /><div className="space-y-3">{zipLinks.map((l, i) => <DownloadRow key={i} link={l} onDownload={onDownload} movieAudio={movieAudio} />)}</div></>
      )}
      {packageLinks.length > 0 && (
        <><SectionHeader title="Package Downloads" /><div className="space-y-3">{packageLinks.map((l, i) => <DownloadRow key={i} link={l} onDownload={onDownload} movieAudio={movieAudio} />)}</div></>
      )}
      {episodeMap.size > 0 && (
        <><SectionHeader title="Episode Downloads" /><EpisodeGroup /></>
      )}
      {/* Untyped non-episode links alongside typed content (old season packs, etc.) */}
      {nonEpisodeLinks.length > 0 && (
        <div className="space-y-3">{nonEpisodeLinks.map((l, i) => <DownloadRow key={i} link={l} onDownload={onDownload} movieAudio={movieAudio} />)}</div>
      )}
      </>
    ) : (
      <EpisodeGroup />
    )}
    </div>
  );
}


/* ── Sub-components ── */

function DownloadRow({
  link,
  onDownload,
  movieAudio,
}: {
  link: MovieLink;
  onDownload: (url: string) => void;
  movieAudio?: string[];
}) {
  const getTechTags = (filename: string) => {
    if (!filename) return [];
    const f = filename.toUpperCase();
    const q = (link.quality || '').toUpperCase();

    const tags: { label: string; color: string }[] = [];

    if (f.includes('REMUX'))
      tags.push({ label: 'REMUX', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' });

    // Strict DV word boundary check to avoid catching DVD
    if (/\bDV\b/.test(f) || f.includes('DOLBY VISION') || f.includes('DOVI'))
      tags.push({ label: 'DV', color: 'bg-pink-500/10 border-pink-500/20 text-pink-400' });

    if (f.includes('HDR10+'))
      tags.push({ label: 'HDR10+', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' });
    else if (f.includes('HDR'))
      tags.push({ label: 'HDR', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' });

    if (f.includes('AV1') && !q.includes('AV1'))
      tags.push({ label: 'AV1', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' });
    else if ((f.includes('HEVC') || f.includes('H.265') || f.includes('H265') || f.includes('X265')) && !q.includes('H.265') && !q.includes('HEVC'))
      tags.push({ label: 'H.265', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' });
    else if ((f.includes('H.264') || f.includes('H264') || f.includes('X264')) && !q.includes('H.264'))
      tags.push({ label: 'H.264', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' });

    return tags;
  };

  const techTags = getTechTags(link.filename || '');
  const showQuality = !!link.quality;

  // A link is a season pack only if it has no episode number
  const isPackageLabel = !link.episode;

  // Scrub OTT fake episodes from UI side just in case bad data is already in the database
  let realEpisode = link.episode;
  if (realEpisode) {
    const fullStr = `${link.label || ''} ${link.filename || ''}`.toUpperCase();
    const epNum = Number(realEpisode);

    if (epNum === 5 && fullStr.includes("ZEE5") && !/(?:EP|E|EPISODE|S\d+E)\s*0*5\b/i.test(fullStr)) {
      realEpisode = null;
    }
    if ((epNum === 264 || epNum === 265) && /H\.?26[45]|X26[45]/.test(fullStr) && !/(?:EP|E|EPISODE|S\d+E)\s*0*(264|265)\b/i.test(fullStr)) {
      realEpisode = null;
    }
  }

  // Double lock: If it's a package label, NEVER render an episode badge
  const showEpisodeBadge = realEpisode && !isPackageLabel;

  const displayLangs: string[] = movieAudio?.length ? [...movieAudio] : [];

  return (
    <Card className="bg-[#111215] border border-white/8 hover:border-brand/25 hover:bg-[#16181C] transition-all rounded-2xl group">
    <CardBody className="flex-row items-center justify-between gap-4 p-5">
    <div className="flex items-center gap-4 min-w-0">
    <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 group-hover:bg-brand/20 transition-colors">
    <Download className="w-4 h-4 text-brand" />
    </div>
    <div className="min-w-0">
    <p className="font-bold text-sm text-white truncate">{link.label}</p>
    {link.filename && (
      <p className="text-[11px] text-white/30 truncate italic mt-0.5">{link.filename}</p>
    )}
    <div className="flex flex-wrap gap-1.5 mt-2">
    {showEpisodeBadge && (
      <span className="text-[9px] font-bold uppercase tracking-widest bg-brand/10 border border-brand/20 text-brand px-2 py-0.5 rounded">
      Ep {realEpisode}
      </span>
    )}
    {showQuality && (
      <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
      {link.quality}
      </span>
    )}
    {link.size && (
      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-white/40 px-2 py-0.5 rounded">
      <HardDrive className="w-2.5 h-2.5" />
      {link.size}
      </span>
    )}

    {displayLangs.map((lang) => (
      <span key={lang} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
      <Languages className="w-2.5 h-2.5" />
      {lang}
      </span>
    ))}

    {techTags.map((tag) => (
      <span key={tag.label} className={`text-[9px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded ${tag.color}`}>
      {tag.label}
      </span>
    ))}
    </div>
    </div>
    </div>
    <Button
    onPress={() => onDownload(link.url)}
    className="bg-brand hover:bg-brand-dark text-white font-bold text-xs uppercase tracking-wider rounded-xl h-10 px-5 shrink-0 shadow-md shadow-brand/20 hover:shadow-brand/30 transition-all"
    size="sm"
    >
    Download
    </Button>
    </CardBody>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  icon,
  valueClass = "text-white font-bold",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div>
    <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-medium mb-1">{label}</p>
    <p className={`text-sm flex items-center gap-1.5 ${valueClass}`}>
    {icon}
    {value}
    </p>
    </div>
  );
}
