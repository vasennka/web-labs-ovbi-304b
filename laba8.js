/**
 * ============================================================================
 * ЛАБОРАТОРНАЯ РАБОТА №8
 * Тема: React-компонент. Взаимодействие фронтенда и бэкенда:
 *       AJAX, Comet (long polling), WebSocket, а также SSE и JSONP.
 * Файл: laba8.js — сервер (Node.js, без обязательных зависимостей*).
 *
 * ЗАПУСК:
 *   node laba8.js              — поднять сервер на http://localhost:3000
 *   node laba8.js --selftest   — самопроверка всех эндпоинтов без браузера
 *
 * ЧТО ОТКРЫТЬ В БРАУЗЕРЕ:
 *   http://localhost:3000/                 — React-приложение (задание 1, ProgressBar)
 *   http://localhost:3000/ajax.html        — задание 2 (AJAX + setInterval, 2 вкладки)
 *   http://localhost:3000/poll.html        — задание 3 (Comet / long polling)
 *   http://localhost:3000/ws.html          — задание 3 (WebSocket)
 *   http://localhost:3000/sse.html         — ознакомительно: Server-Sent Events
 *   http://localhost:3000/jsonp.html       — ознакомительно: JSONP
 *
 * (*) WebSocket работает через пакет ws. Если он не установлен, сервер
 *     всё равно поднимется: AJAX/Comet/SSE/JSONP работают, а /ws.html честно
 *     сообщит, что нужен `npm install ws`. Установка: npm install ws
 * ============================================================================
 */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'laba8', 'public');
const REACT_DIST = path.join(__dirname, 'laba8', 'progress-app', 'dist');
const SELFTEST = process.argv.includes('--selftest');

/* =========================================================================
 * ХРАНИЛИЩЕ СООБЩЕНИЙ (в памяти; в проекте для этого используется репозиторий)
 * ========================================================================= */
let nextId = 1;
const messages = [
    { id: nextId++, author: 'Макар', text: 'Привет! Проверяем AJAX.', at: new Date().toISOString() }
];

/** Ожидающие ответа HTTP-запросы для long polling (Comet). */
const waitingClients = [];

/** Подписчики Server-Sent Events (res-объекты с заголовком text/event-stream). */
const sseClients = new Set();

/** Статистика запросов — чтобы на защите показать разницу между схемами. */
const stats = {
    ajaxGet: 0,
    ajaxPost: 0,
    pollRequests: 0,
    pollTimeouts: 0,
    sseConnections: 0,
    jsonpRequests: 0,
    staticFiles: 0,
    wsMessages: 0
};

/* =========================================================================
 * ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
 * ========================================================================= */

function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',                       // AJAX-ответы не кэшируем
        'Access-Control-Allow-Origin': '*'                 // демонстрация CORS для JSONP-страницы
    });
    res.end(body);
}

function readBody(req, limit = 64 * 1024) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > limit) {
                reject(Object.assign(new Error('Слишком большое тело запроса'), { statusCode: 413 }));
                req.destroy();
                return;
            }
            body += chunk;
        });
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

/**
 * Добавляет сообщение и «будит» всех, кто ждёт новостей:
 *  - long polling: отвечаем и закрываем ожидающие ответы;
 *  - SSE: пишем событие в открытые потоки;
 *  - WebSocket: рассылаем всем клиентам (см. ниже).
 */
function addMessage(message) {
    messages.push(message);
    console.log(`  + новое сообщение #${message.id} от ${message.author}: "${message.text}"`);

    // Comet: все, кто «висит» на GET /api/poll, получают ответ СРАЗУ
    while (waitingClients.length > 0) {
        const res = waitingClients.shift();
        sendJson(res, 200, { type: 'message', message });
    }

    // SSE: push-событие в открытые соединения
    for (const client of sseClients) {
        client.write(`event: message\n`);
        client.write(`data: ${JSON.stringify(message)}\n\n`);
    }

    // WebSocket: рассылка
    if (wss) {
        const payload = JSON.stringify({ type: 'message', message });
        for (const socket of wss.clients) {
            if (socket.readyState === socket.OPEN) socket.send(payload);
        }
    }

    return message;
}

/* =========================================================================
 * СТАТИЧЕСКИЕ ФАЙЛЫ
 * ========================================================================= */

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.txt': 'text/plain; charset=utf-8'
};

function serveStatic(req, res, pathname) {
    // Ищем файл сначала в public/, потом в собранном React-приложении (dist/).
    // Исключение: для «/» приоритет у React-приложения (dist/index.html).
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const candidates = pathname === '/'
        ? [path.join(REACT_DIST, relative), path.join(PUBLIC_DIR, relative)]
        : [path.join(PUBLIC_DIR, relative), path.join(REACT_DIST, relative)];

    for (const file of candidates) {
        // Защита от path traversal: итоговый путь обязан лежать внутри разрешённых каталогов
        const resolved = path.resolve(file);
        const allowed = [path.resolve(PUBLIC_DIR), path.resolve(REACT_DIST)];
        if (!allowed.some((dir) => resolved.startsWith(dir))) continue;

        if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
            stats.staticFiles += 1;
            res.writeHead(200, { 'Content-Type': MIME[path.extname(resolved)] || 'application/octet-stream' });
            fs.createReadStream(resolved).pipe(res); // отдаём файл ПОТОКОМ (см. лабораторную №7)
            return true;
        }
    }
    return false;
}

/* =========================================================================
 * МАРШРУТЫ API
 * ========================================================================= */

async function handleApi(req, res, pathname, query) {
    // --- Задание 2: обычный AJAX -------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/messages') {
        stats.ajaxGet += 1;
        sendJson(res, 200, { messages, serverTime: new Date().toISOString() });
        return true;
    }

    if (req.method === 'POST' && pathname === '/api/messages') {
        stats.ajaxPost += 1;
        try {
            const raw = await readBody(req);
            const data = JSON.parse(raw || '{}');
            const text = String(data.text ?? '').trim();
            if (!text) {
                sendJson(res, 400, { error: 'Поле text обязательно' });
                return true;
            }
            const created = addMessage({
                id: nextId++,
                author: String(data.author || 'Гость').slice(0, 40),
                text: text.slice(0, 500),
                at: new Date().toISOString()
            });
            sendJson(res, 201, { ok: true, message: created });
        } catch (err) {
            sendJson(res, err.statusCode || 400, { error: err.message });
        }
        return true;
    }

    // --- Задание 3: Comet (long polling) ----------------------------------------
    if (req.method === 'GET' && pathname === '/api/poll') {
        stats.pollRequests += 1;

        // Если клиент передал lastId — сразу отдаём всё, что он пропустил
        const lastId = Number(query.lastId || 0);
        const missed = messages.filter((m) => m.id > lastId);
        if (missed.length > 0) {
            sendJson(res, 200, { type: 'messages', messages: missed });
            return true;
        }

        // Иначе «подвешиваем» ответ: сервер молчит, пока не появится новое сообщение
        console.log(`  [poll] клиент ждёт новое сообщение (ждущих: ${waitingClients.length + 1})`);
        waitingClients.push(res);

        // Таймаут: через 25 секунд отвечаем «нет новостей», чтобы соединение
        // не висело вечно и прокси/браузер его не разорвали
        const timer = setTimeout(() => {
            const index = waitingClients.indexOf(res);
            if (index !== -1) {
                waitingClients.splice(index, 1);
                stats.pollTimeouts += 1;
                console.log('  [poll] таймаут 25 с — отвечаем "нет новостей"');
                sendJson(res, 200, { type: 'timeout', messages: [] });
            }
        }, 25_000);

        // Если клиент ушёл (закрыл вкладку) — убираем его из очереди
        req.on('close', () => {
            clearTimeout(timer);
            const index = waitingClients.indexOf(res);
            if (index !== -1) waitingClients.splice(index, 1);
        });
        return true;
    }

    // --- Ознакомительно: Server-Sent Events -------------------------------------
    if (req.method === 'GET' && pathname === '/api/events') {
        stats.sseConnections += 1;
        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('retry: 3000\n\n');                       // браузер переподключится через 3 с
        res.write(`event: hello\ndata: ${JSON.stringify({ text: 'SSE подключено' })}\n\n`);

        sseClients.add(res);
        console.log(`  [sse] клиентов: ${sseClients.size}`);

        // Небольшой «heartbeat», чтобы соединение не закрывалось по таймауту
        const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);

        req.on('close', () => {
            clearInterval(heartbeat);
            sseClients.delete(res);
            console.log(`  [sse] клиент отключился, осталось: ${sseClients.size}`);
        });
        return true;
    }

    // --- Ознакомительно: JSONP --------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/jsonp') {
        stats.jsonpRequests += 1;
        const callback = /^[A-Za-z_$][\w$]*$/.test(query.callback || '') ? query.callback : 'handleData';
        const body = `${callback}(${JSON.stringify({ messages, transport: 'jsonp' })});`;
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(body);
        return true;
    }

    // --- Статистика по транспортам (помогает на защите) -------------------------
    if (req.method === 'GET' && pathname === '/api/stats') {
        sendJson(res, 200, {
            ...stats,
            waitingLongPollClients: waitingClients.length,
            sseClients: sseClients.size,
            wsClients: wss ? wss.clients.size : 0,
            messages: messages.length
        });
        return true;
    }

    return false;
}

/* =========================================================================
 * HTTP-СЕРВЕР
 * ========================================================================= */

const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);
    const pathname = decodeURIComponent(parsed.pathname);

    handleApi(req, res, pathname, parsed.query)
        .then((handled) => {
            if (handled) return;
            if (serveStatic(req, res, pathname)) return;

            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404: не найдено. Откройте / (React), /ajax.html, /poll.html, /ws.html, /sse.html, /jsonp.html');
        })
        .catch((err) => {
            console.error('Ошибка обработки запроса:', err);
            if (!res.headersSent) sendJson(res, 500, { error: 'Внутренняя ошибка сервера' });
        });
});

/* =========================================================================
 * WEBSOCKET (пакет ws; подключаем опционально)
 * ========================================================================= */

let wss = null;
try {
    const { WebSocketServer } = require('ws');
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (socket, request) => {
        console.log(`  [ws] подключился клиент (${request.socket.remoteAddress}), всего: ${wss.clients.size}`);

        socket.send(JSON.stringify({ type: 'history', messages }));

        socket.on('message', (data) => {
            stats.wsMessages += 1;
            let payload;
            try {
                payload = JSON.parse(data.toString());
            } catch {
                payload = { text: data.toString() };
            }
            if (payload.author || payload.text) {
                addMessage({
                    id: nextId++,
                    author: String(payload.author || 'Гость').slice(0, 40),
                    text: String(payload.text || '').slice(0, 500),
                    at: new Date().toISOString()
                });
            }
        });

        socket.on('close', () => console.log(`  [ws] клиент отключился, осталось: ${wss.clients.size}`));
        socket.on('error', (err) => console.error('  [ws] ошибка сокета:', err.message));
    });

    console.log('WebSocket: включён (пакет ws найден), адрес ws://localhost:' + PORT + '/ws');
} catch (err) {
    console.warn('WebSocket: НЕ включён — пакет ws не установлен.');
    console.warn('  Установите его командой: npm install ws   (из папки js-labs)');
}

/* =========================================================================
 * ЗАПУСК И САМОПРОВЕРКА
 * ========================================================================= */

server.listen(PORT, HOST, () => {
    console.log('='.repeat(72));
    console.log('ЛАБОРАТОРНАЯ РАБОТА №8 — сервер запущен');
    console.log('='.repeat(72));
    console.log(`React-приложение (задание 1)  : http://${HOST}:${PORT}/`);
    console.log(`AJAX + setInterval (задание 2): http://${HOST}:${PORT}/ajax.html`);
    console.log(`Comet / long polling (зад. 3) : http://${HOST}:${PORT}/poll.html`);
    console.log(`WebSocket (задание 3)         : http://${HOST}:${PORT}/ws.html`);
    console.log(`Server-Sent Events            : http://${HOST}:${PORT}/sse.html`);
    console.log(`JSONP                         : http://${HOST}:${PORT}/jsonp.html`);
    console.log(`Статистика транспортов        : http://${HOST}:${PORT}/api/stats`);
    console.log(`Каталог static-файлов         : ${PUBLIC_DIR}`);
    console.log(`Собранный React (dist)        : ${REACT_DIST}`);
    if (!fs.existsSync(REACT_DIST)) {
        console.log('  [!] dist не найден: соберите React-приложение:');
        console.log('      cd laba8\\progress-app && npm install && npm run build');
    }
    console.log('Остановить сервер: Ctrl+C');

    if (SELFTEST) runSelfTest();
});

/* -------------------------------------------------------------------------
 * Самопроверка: без браузера прогоняем все транспорты и печатаем результат.
 * Запуск: node laba8.js --selftest
 * ---------------------------------------------------------------------- */
async function runSelfTest() {
    const base = `http://${HOST}:${PORT}`;
    const log = (ok, title, extra = '') => console.log(`${ok ? '✔' : '✘'} ${title}${extra ? ' -> ' + extra : ''}`);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    console.log('\n--- САМОПРОВЕРКА (--selftest) ---');

    // 1) AJAX GET
    let res = await fetch(`${base}/api/messages`);
    let json = await res.json();
    log(res.status === 200 && Array.isArray(json.messages), 'AJAX GET /api/messages', `сообщений: ${json.messages.length}`);

    // 2) AJAX POST
    res = await fetch(`${base}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'Автотест', text: 'Сообщение из самопроверки' })
    });
    json = await res.json();
    log(res.status === 201 && json.ok, 'AJAX POST /api/messages', `id=${json.message.id}`);

    // 3) Comet: подписываемся ДО отправки сообщения, чтобы поймать «пуш»
    const pollStart = Date.now();
    const pollPromise = fetch(`${base}/api/poll?lastId=${json.message.id}`).then((r) => r.json());
    await sleep(300);
    await fetch(`${base}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'Автотест', text: 'Сообщение для long polling' })
    });
    const polled = await pollPromise;
    log(polled.type === 'message', 'Comet /api/poll получил push', `за ${Date.now() - pollStart} мс`);

    // 4) SSE: получаем первое событие
    const sseResult = await new Promise((resolve) => {
        const controller = new AbortController();
        const timer = setTimeout(() => { controller.abort(); resolve('таймаут'); }, 3000);
        fetch(`${base}/api/events`, { signal: controller.signal })
            .then((r) => {
                const reader = r.body.getReader();
                const decoder = new TextDecoder();
                return reader.read().then(({ value }) => {
                    clearTimeout(timer);
                    controller.abort();
                    resolve(decoder.decode(value).split('\n').filter((l) => l.startsWith('data:')).join(' '));
                });
            })
            .catch(() => resolve('ошибка соединения'));
    });
    log(typeof sseResult === 'string' && sseResult.length > 0, 'SSE /api/events', sseResult.slice(0, 70));

    // 5) JSONP: проверяем, что пришёл вызов функции
    res = await fetch(`${base}/api/jsonp?callback=handleData`);
    const text = await res.text();
    log(text.startsWith('handleData(') && text.endsWith(');'), 'JSONP /api/jsonp', text.slice(0, 60) + '…');

    // 6) WebSocket: подключаемся, получаем историю, отправляем сообщение
    try {
        const WebSocket = require('ws');
        const wsResult = await new Promise((resolve, reject) => {
            const socket = new WebSocket(`ws://${HOST}:${PORT}/ws`);
            const timer = setTimeout(() => { socket.terminate(); reject(new Error('таймаут 4 с')); }, 4000);
            socket.on('message', (data) => {
                const payload = JSON.parse(data.toString());
                if (payload.type === 'history') {
                    socket.send(JSON.stringify({ author: 'Автотест', text: 'Сообщение через WebSocket' }));
                } else if (payload.type === 'message') {
                    clearTimeout(timer);
                    socket.close();
                    resolve(payload.message.text);
                }
            });
            socket.on('error', reject);
        });
        log(true, 'WebSocket /ws (двусторонний обмен)', wsResult);
    } catch (err) {
        log(false, 'WebSocket /ws', err.message + ' (нужен npm install ws)');
    }

    // 7) Статистика
    res = await fetch(`${base}/api/stats`);
    json = await res.json();
    console.log('\nСтатистика транспортов:');
    console.log(json);
    console.log('\nСАМОПРОВЕРКА ЗАВЕРШЕНА. Сервер продолжает работать: Ctrl+C для остановки.');

    if (process.env.SELFTEST_EXIT) {
        // удобно для автоматического прогона
        server.close(() => process.exit(0));
    }
}

/* Аккуратное завершение: закрываем «висящие» long polling и SSE-соединения */
process.on('SIGINT', () => {
    console.log('\nОстанавливаю сервер...');
    while (waitingClients.length) {
        const res = waitingClients.pop();
        sendJson(res, 200, { type: 'shutdown', messages: [] });
    }
    for (const client of sseClients) client.end();
    sseClients.clear();
    if (wss) for (const socket of wss.clients) socket.close();
    server.close(() => process.exit(0));
});

module.exports = { server, addMessage, messages };
