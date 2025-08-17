import path from "path";
import { VitePWA } from 'vite-plugin-pwa'; 
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "/epub-search/",
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "robots.txt",
          "favicon.png",
          "apple-touch-icon.webp",
          "pwa-192x192.webp",
          "pwa-512x512.webp",
        ],
        manifest: {
          name: "Epub Search",
          short_name: "Epub Search",
          start_url: "/epub-search/",
          scope: "/epub-search/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#ffffff",
          icons: [
            {
              src: "/epub-search/pwa-192x192.webp",
              sizes: "192x192",
              type: "image/webp",
            },
            {
              src: "/epub-search/pwa-512x512.webp",
              sizes: "512x512",
              type: "image/webp",
            },
            {
              src: "/epub-search/pwa-512x512.webp",
              sizes: "512x512",
              type: "image/webp",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ],
  };
});
