import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Navbar as HeroNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Input,
  Button,
  Chip,
} from "@heroui/react";
import { Search, Film, Tv2, Sparkles, Home, LayoutDashboard } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Movies", href: "/?type=movie", icon: Film },
  { label: "Series", href: "/?type=series", icon: Tv2 },
  { label: "Anime", href: "/?type=anime", icon: Sparkles },
  { label: "Admin", href: "/admin", icon: LayoutDashboard },
];

export default function Navbar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setQuery(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (query) params.set("search", query);
    else params.delete("search");
    navigate(`/?${params.toString()}`);
  };

  return (
    <HeroNavbar
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className={`fixed top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0D0D0F]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl"
          : "bg-transparent"
      }`}
      maxWidth="2xl"
    >
      {/* Brand */}
      <NavbarContent justify="start">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden text-white/60"
        />
        <NavbarBrand>
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shadow-lg shadow-brand/30 group-hover:shadow-brand/50 transition-shadow">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-2xl tracking-wider text-white">
              CINE<span className="text-brand">VAULT</span>
            </span>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop Nav Links */}
      <NavbarContent className="hidden sm:flex gap-1" justify="center">
        {NAV_LINKS.map(({ label, href }) => {
          const isActive =
            href === "/"
              ? !searchParams.get("type")
              : searchParams.get("type") === label.toLowerCase();
          return (
            <NavbarItem key={label}>
              <Link
                to={href}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand/15 text-brand border border-brand/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </Link>
            </NavbarItem>
          );
        })}
      </NavbarContent>

      {/* Search */}
      <NavbarContent justify="end" className="gap-3">
        <NavbarItem className="flex-1 max-w-xs">
          <form onSubmit={handleSearch}>
            <Input
              classNames={{
                base: "w-full",
                mainWrapper: "h-9",
                input: "text-sm text-white placeholder:text-white/30",
                inputWrapper:
                  "h-9 bg-white/5 border border-white/10 hover:border-white/20 focus-within:border-brand/50 rounded-xl transition-colors",
              }}
              placeholder="Search titles..."
              startContent={<Search className="w-3.5 h-3.5 text-white/30 shrink-0" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
            />
          </form>
        </NavbarItem>
        <NavbarItem className="hidden md:flex">
          <Chip
            size="sm"
            className="bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold tracking-widest uppercase"
          >
            HD
          </Chip>
        </NavbarItem>
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu className="bg-[#0D0D0F]/98 backdrop-blur-xl pt-6 gap-2">
        {NAV_LINKS.map(({ label, href, icon: Icon }) => (
          <NavbarMenuItem key={label}>
            <Link
              to={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all"
              onClick={() => setIsMenuOpen(false)}
            >
              <Icon className="w-5 h-5 text-brand" />
              <span className="font-medium">{label}</span>
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </HeroNavbar>
  );
}
