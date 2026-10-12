#!/usr/bin/env node
/**
 * ============================================================================
 * Маленький статический сервер для папки «отчёт».
 * Нужен только для того, чтобы браузер мог открыть HTML-страницы с выводом
 * лабораторных и сфотографировать их (скриншоты для отчёта в Word).
 * ============================================================================
 *
 * Запуск: node tools/serve-report.js [порт]
 * Затем открыть: http://127.0.0.1:8099/html/laba1-1.html
 * ============================================================================
 */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'отчёт');
const port = Number(process.argv[2] || 8099);
const host = '127.0.0.1';

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(req.url.split('?')[0]);
    const relative = pathname === '/' ? 'html/laba1-1.html' : pathname.replace(/^\/+/, '');
    const file = path.resolve(root, relative);

    // Защита от выхода за пределы каталога отчёта
    if (!file.startsWith(path.resolve(root))) {
        res.writeHead(403).end('403');
        return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404: файл не найден');
        return;
    }

    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
});

server.listen(port, host, () => {
    console.log(`Сервер отчёта: http://${host}:${port}/  (папка ${root})`);
});
