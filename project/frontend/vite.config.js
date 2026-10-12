import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Сборка кладётся в frontend/dist, а бэкенд (Express) отдаёт её как статику
// с fallback на index.html — так SPA и серверные страницы живут на одном домене.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        // В dev-режиме Vite проксирует API на бэкенд, поэтому CORS не нужен
        proxy: {
            '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
            '/uploads': { target: 'http://127.0.0.1:4000', changeOrigin: true },
            '/static': { target: 'http://127.0.0.1:4000', changeOrigin: true }
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false
    }
});
