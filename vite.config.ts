import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Copie le logo Slim comme favicon pour l'onglet et Google
function copyFaviconFromSlimLogo() {
  return {
    name: "copy-favicon",
    buildStart() {
      const src = path.resolve(__dirname, "src/assets/logo-slim.png");
      const dest = path.resolve(__dirname, "public/favicon.png");
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [copyFaviconFromSlimLogo(), react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
