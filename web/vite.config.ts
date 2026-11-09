import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@store": path.resolve(__dirname, "./src/store"),
      "@constants": path.resolve(__dirname, "./src/constants"),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/api/pollinations": {
        target: "https://text.pollinations.ai",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pollinations/, ""),
        secure: true,
      },
    },
  },
  build: {
    target: "ES2020",
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
})
