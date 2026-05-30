import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Navbar as HeroNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/react";
import { Film, Tv2, Sparkles, Home, LayoutDashboard } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Movies", href: "/?type=movie", icon: Film },
  { label: "Series", href: "/?type=series", icon: Tv2 },
  { label: "Anime", href: "/?type=anime", icon: Sparkles },
  // { label: "Admin", href: "/admin", icon: LayoutDashboard },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

      {/* Badges/Info */}
      <NavbarContent justify="end" className="gap-3">

      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu className="bg-[#0D0D0F]/98 backdrop-blur-xl pt-6 gap-2">
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
