const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display: ["'Bebas Neue'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        brand: { DEFAULT: "#E50914", dark: "#B20710", glow: "rgba(229,9,20,0.4)" },
        surface: { DEFAULT: "#0D0D0F", card: "#111215", elevated: "#16181C", border: "rgba(255,255,255,0.07)" },
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        float: { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-6px)" } },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [
    heroui({
      themes: {
        dark: {
          colors: {
            primary: { DEFAULT: "#E50914", foreground: "#ffffff" },
            focus: "#E50914",
          },
        },
      },
    }),
    require("tailwindcss-animate"),
  ],
};
