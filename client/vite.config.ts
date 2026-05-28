import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/webhook": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    minify: "terser",
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — changes rarely, long cache lifetime
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // HeroUI component library
          "vendor-heroui": ["@heroui/react"],
          // Icons — large but static
          "vendor-icons": ["lucide-react"],
        },
      },
    },
  },
})
