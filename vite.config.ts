import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Matches the repository the project ships from; CI overrides it with the
  // real repo name at build time. The old default named the local checkout
  // directory instead, which no deployment has ever been served under.
  base: process.env.VITE_BASE ?? '/judo-scoreboard/',
  // Dev only: lets the harness hand the dev server a free port when 5173 is
  // already taken; nothing in the app depends on a fixed port.
  server: { port: Number(process.env.PORT) || 5173 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Judo Scoreboard',
        short_name: 'Judo',
        description: 'Offline judo scoreboard for a single mat',
        display: 'fullscreen',
        background_color: '#002c5a',
        theme_color: '#002c5a',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,wav,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
