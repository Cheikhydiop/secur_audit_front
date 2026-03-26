import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    // Seuil d'alerte pour les chunks (en ko)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Découpage manuel pour un meilleur caching HTTP long-terme
        manualChunks: {
          // Séparation des librairies stables (rarement mises à jour)
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          query: ['@tanstack/react-query'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
    // Minification optimale (esbuild est ~20x plus rapide que terser)
    minify: 'esbuild',
    // Source maps uniquement en dev (ne pas les exposer en prod)
    sourcemap: mode === 'development',
    // Activer la compression brotli/gzip pour les assets
    target: 'es2020',
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
      devOptions: {
        enabled: true,
      },
      workbox: {
        // Met en cache tout le build statique
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
        // Taille max d'un fichier mis en cache (5 Mo)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Cache réseau en priorité (Network First) pour les appels API
        runtimeCaching: [
          {
            // API backend — Network First (données fraîches si dispo, sinon cache)
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 jours
              },
              networkTimeoutSeconds: 5, // Réduit de 10s à 5s pour basculer plus vite sur le cache
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Images — Cache First (images stables)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Fonts Google
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 an
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: "DG/SECU — SmartAudit DG-SECU/Sonatel",
        short_name: "SmartInspect",
        description: "Application officielle d'audit de sécurité - Sonatel DG/SECU",
        theme_color: "#FF7900",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "fr",
        icons: [
          {
            src: "/icon_officiel.jpeg",
            sizes: "192x192",
            type: "image/jpeg",
            purpose: "any",
          },
          {
            src: "/icon_officiel.jpeg",
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimisation des dépendances au démarrage dev
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
    ],
  },
}));
