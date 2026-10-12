import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Конфигурация Vite.
//  - base: '/' — приложение отдаётся сервером laba8.js с корня http://localhost:3000/
//  - build.outDir: dist — сюда попадает собранная версия, её и раздаёт laba8.js
//  - server.proxy: при `npm run dev` (порт 5173) запросы /api и /ws проксируются
//    на сервер лабораторной (порт 3000), чтобы не было CORS-проблем.
export default defineConfig({
    plugins: [react()],
    base: '/',
    build: {
        outDir: 'dist',
        emptyOutDir: true
    },
    server: {
        port: 5173,
        proxy: {
            '/api': { target: 'http://localhost:3000', changeOrigin: true },
            '/ws': { target: 'ws://localhost:3000', ws: true }
        }
    }
});
