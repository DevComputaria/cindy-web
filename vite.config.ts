import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Cindy Web',
        short_name: 'Cindy',
        lang: 'pt-BR',
        description: 'Seu espaço de trabalho com agentes de IA, totalmente no navegador.',
        theme_color: '#f8f8f6',
        background_color: '#f8f8f6',
        display: 'standalone',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      }
    })
  ]
});
