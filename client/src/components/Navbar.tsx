import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Navbar as HeroNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/react";
import { Film, Tv2, Sparkles, Home, LayoutDashboard, Search, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Movies", href: "/?type=movie", icon: Film },
  { label: "Series", href: "/?type=series", icon: Tv2 },
  { label: "Anime", href: "/?type=anime", icon: Sparkles },
  // { label: "Admin", href: "/admin", icon: LayoutDashboard },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Navigates to the home page with the same `search` query param the home
  // page's own search bar sets — it's picked up by the same useSearchParams
  // effect there and hits the exact same /api/movies?search= endpoint, so
  // results are identical no matter which page you searched from.
  const submitSearch = () => {
    const trimmed = searchValue.trim();
    if (!trimmed) {
      setSearchOpen(false);
      return;
    }
    navigate(`/?search=${encodeURIComponent(trimmed)}`);
    setSearchValue("");
    setSearchOpen(false);
    setIsMenuOpen(false);
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
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); navigate("/", { replace: false }); }}
            className="flex items-center gap-2 group cursor-pointer bg-transparent border-0 p-0"
          >
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shadow-lg shadow-brand/30 group-hover:shadow-brand/50 transition-shadow">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-2xl tracking-wider text-white">
              CINE<span className="text-brand">VAULT</span>
            </span>
          </button>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop Nav Links */}
      <NavbarContent className="hidden sm:flex gap-1" justify="center">
        {NAV_LINKS.map(({ label, href }) => {
          const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
          const isActive =
            href === "/"
              ? window.location.pathname === "/" && !params.get("type")
              : params.get("type") === label.toLowerCase() || (label === "Admin" && window.location.pathname === "/admin");
          return (
            <NavbarItem key={label}>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); navigate(href); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer bg-transparent border-0 ${
                  isActive
                    ? "bg-brand/15 text-brand border border-brand/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            </NavbarItem>
          );
        })}
      </NavbarContent>

      {/* Search */}
      <NavbarContent justify="end" className="gap-3">
        {!isHomePage && (
        <div className="hidden sm:flex items-center">
          {searchOpen ? (
            <div className="flex items-center gap-1 bg-white/5 border border-brand/30 rounded-full pl-3 pr-1 h-9">
              <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitSearch();
                  if (e.key === "Escape") { setSearchValue(""); setSearchOpen(false); }
                }}
                onBlur={() => { if (!searchValue.trim()) setSearchOpen(false); }}
                placeholder="Search movies, series, anime…"
                className="bg-transparent outline-none text-sm text-white placeholder:text-white/30 w-44 lg:w-64"
              />
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); setSearchValue(""); setSearchOpen(false); }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors bg-transparent border-0 cursor-pointer shrink-0"
                aria-label="Close search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); setSearchOpen(true); }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors bg-transparent border-0 cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>
        )}
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu className="bg-[#0D0D0F]/98 backdrop-blur-xl pt-6 gap-2">
        {!isHomePage && (
        <NavbarMenuItem>
          <div className="flex items-center gap-2 px-1 pb-2">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); }}
              placeholder="Search movies, series, anime…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand/50"
            />
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); submitSearch(); }}
              className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shrink-0 cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </NavbarMenuItem>
        )}
        {NAV_LINKS.map(({ label, href, icon: Icon }) => (
          <NavbarMenuItem key={label}>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); setIsMenuOpen(false); navigate(href); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all w-full bg-transparent border-0 cursor-pointer"
            >
              <Icon className="w-5 h-5 text-brand" />
              <span className="font-medium">{label}</span>
            </button>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </HeroNavbar>
  );
}
