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
    minify: "esbuild",
    esbuildOptions: {
      drop: ["console", "debugger"],
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) return "vendor-react";
          if (id.includes("node_modules/@heroui")) return "vendor-heroui";
          if (id.includes("node_modules/lucide-react")) return "vendor-icons";
        },
      },
    },
  },
})
