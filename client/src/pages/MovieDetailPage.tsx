import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
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
  HardDrive,
  Languages,
  Calendar,
  Clapperboard,
  Tv2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function MovieDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState(false);

  const id = useMemo(() => (slug ? extractFullIdFromSlug(slug) : ""), [slug]);

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

  const seasonGroups = useMemo(() => {
    if (!movie?.links) return {} as Record<string, MovieLink[]>;
    const groups: Record<string, MovieLink[]> = {};
    movie.links.forEach((link) => {
      const key = link.season ? `Season ${link.season}` : "Downloads";
      if (!groups[key]) groups[key] = [];
      groups[key].push(link);
    });
    return groups;
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

  const TYPE_ICON: Record<string, React.ElementType> = {
    movie: Film,
    series: Tv2,
    anime: Sparkles,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="space-y-6 text-center">
          {/* Skeleton hero */}
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
        {/* Hero BG — backdrop (no-text preferred) → any backdrop → poster fallback */}
        <div className="absolute inset-0">
          <img
            src={movie.backdrop || movie.poster}
            alt=""
            className="w-full h-full object-cover brightness-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F] via-[#0D0D0F]/60 to-[#0D0D0F]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0F]/80 via-transparent to-transparent" />
          {/* Noise overlay */}
          <div className="absolute inset-0 noise-bg opacity-60" />
        </div>

        {/* Back button */}
        <div className="absolute top-20 left-4 md:left-8 z-20">
          <Button
            as={Link}
            to="/"
            variant="flat"
            className="bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white rounded-xl h-9 px-3 text-sm"
            startContent={<ChevronLeft className="w-4 h-4" />}
          >
            Back
          </Button>
        </div>

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-end z-10">
          <div className="container mx-auto px-4 md:px-8 lg:px-16 pb-12 flex gap-8 md:gap-12 items-end">
            {/* Poster — desktop only */}
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

            {/* Text */}
            <div className="flex-1 min-w-0 space-y-4 md:space-y-5">
              {/* Badges */}
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

              {/* Title */}
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-8xl tracking-wider text-white leading-none">
                {movie.title}
              </h1>

              {/* Meta row */}
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
                {movie.language && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5 text-brand" />
                      {movie.language}
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              {movie.description && (
                <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-2xl line-clamp-3">
                  {movie.description}
                </p>
              )}

              {/* Genre tags */}
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

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-1">
                <Tooltip content={wishlist ? "Remove from watchlist" : "Add to watchlist"}>
                  <Button
                    isIconOnly
                    variant="flat"
                    onPress={() => setWishlist(!wishlist)}
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

          {/* Downloads */}
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
              <Tabs
                aria-label="Download seasons"
                classNames={{
                  tabList: "bg-white/3 border border-white/8 p-1 rounded-2xl gap-1",
                  cursor: "bg-brand shadow-lg shadow-brand/30 rounded-xl",
                  tab: "font-bold text-xs uppercase tracking-widest text-white/40 data-[selected=true]:text-white h-9 px-5",
                  panel: "pt-6",
                }}
              >
                {seasonNames.map((name) => (
                  <Tab key={name} title={name}>
                    <div className="space-y-3">
                      {seasonGroups[name].map((link, idx) => (
                        <DownloadRow key={idx} link={link} onDownload={handleDownload} />
                      ))}
                    </div>
                  </Tab>
                ))}
              </Tabs>
            ) : seasonNames.length === 1 ? (
              <div className="space-y-3">
                {seasonGroups[seasonNames[0]].map((link, idx) => (
                  <DownloadRow key={idx} link={link} onDownload={handleDownload} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white/3 border border-dashed border-white/8 rounded-2xl">
                <Download className="w-10 h-10 text-white/15 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No download links available yet.</p>
              </div>
            )}
          </section>

          {/* Cast */}
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
          {/* Info Card */}
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
                <InfoRow label="Language" value={movie.language || "N/A"} />
                <InfoRow label="Type" value={movie.type} valueClass="text-brand" />
                {movie.runtime && <InfoRow label="Runtime" value={`${movie.runtime}m`} />}
                {movie.country && <InfoRow label="Country" value={movie.country} />}
                {movie.status && <InfoRow label="Status" value={movie.status} valueClass="text-emerald-400" />}
              </div>
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

/* ── Sub-components ── */

function DownloadRow({
  link,
  onDownload,
}: {
  link: MovieLink;
  onDownload: (url: string) => void;
}) {
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
              {link.quality && (
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
              {link.language && (
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                  <Languages className="w-2.5 h-2.5" />
                  {link.language}
                </span>
              )}
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
