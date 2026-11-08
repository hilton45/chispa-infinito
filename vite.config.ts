import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CHISPA ∞ · Cosmos Bioluminiscente',
        short_name: 'CHISPA ∞',
        description: 'Juego incremental de cosmos bioluminiscente hecho 100% por código',
        theme_color: '#05040f',
        background_color: '#05040f',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%2305040f"/><circle cx="50" cy="50" r="35" fill="%2338bdf8"/><circle cx="50" cy="50" r="18" fill="%23ffffff"/></svg>',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2}'],
      },
    }),
  ],
  server: {
    port: 3000,
    open: false,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
