import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'  // omit/replace for other frameworks

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: '../pb/pb_public',
    emptyOutDir: true,
  },
  server: {
    host: true, // lets other devices on your LAN open the dev server
    proxy: {
      '/api': 'http://127.0.0.1:8090',
      '/_': 'http://127.0.0.1:8090',
    },
  },
})