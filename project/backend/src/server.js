/**
 * ТОЧКА ВХОДА БЭКЕНДА (composition root + HTTP-сервер).
 *
 * Запуск:
 *   node src/server.js
 *   node --env-file=.env src/server.js     (если хотите задать переменные файлом)
 *
 * Что монтируется на Express:
 *   /static        — стили сайта и админки (отдаются из backend/public)
 *   /uploads       — загруженные фотографии галереи
 *   /api, /api/v1  — REST API для React-приложения (JSON)
 *   /admin         — админка на EJS, закрытая паролем
 *   /site          — серверные страницы публичной части на EJS
 *   /              — React-SPA (собранный frontend/dist) с fallback на index.html
 */

'use strict';

const path = require('node:path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');

const config = require('./config');
const { buildContainer } = require('./container');
const { createApiRouter } = require('./presentation/routers/api.router');
const { createAdminRouter } = require('./presentation/routers/admin.router');
const { createSiteRouter, createSpaRouter } = require('./presentation/routers/site.router');
const { errorHandler, securityHeaders, requestLogger, requireAuth } = require('./presentation/middleware');

async function createApp(options = {}) {
    const deps = await buildContainer(options);
    const app = express();

    // --- Шаблонизатор EJS --------------------------------------------------
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'presentation', 'views'));
    app.set('trust proxy', true); // корректный IP за прокси (для rate limit)

    // --- Безопасность ------------------------------------------------------
    // helmet задаёт Content-Security-Policy и прочие заголовки. CSP ослабляем
    // только там, где это нужно: картинки в галерее могут быть внешними (https).
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    connectSrc: ["'self'"],
                    formAction: ["'self'"]
                }
            },
            crossOriginResourcePolicy: { policy: 'cross-origin' }
        })
    );
    app.use(securityHeaders());
    app.use(requestLogger(deps.logger));

    // --- Разбор тела запроса ----------------------------------------------
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // --- Сессия для админки ------------------------------------------------
    app.use(
        session({
            name: config.session.name,
            secret: config.session.secret,
            resave: false,
            saveUninitialized: false,          // не создаём сессию «в пустоту»
            cookie: {
                httpOnly: true,                // cookie недоступна из JavaScript (защита от XSS-кражи)
                sameSite: 'lax',               // базовая защита от CSRF
                secure: false,                 // в проде за HTTPS -> true
                maxAge: config.session.maxAge
            }
        })
    );

    // Общие данные для всех шаблонов: CSRF-токен и flash-сообщение
    app.use((req, res, next) => {
        res.locals.csrfToken = req.session?.csrfToken ?? '';
        res.locals.flash = req.session?.flash ?? null;
        if (req.session) delete req.session.flash; // показываем сообщение один раз
        next();
    });

    // --- Статические файлы -------------------------------------------------
    app.use('/static', express.static(path.join(__dirname, '..', 'public')));
    // Демонстрационные фотографии сайта (лежат в репозитории, не в загрузках).
    // Кеш отключён: при замене файлов браузер сразу показывает новые снимки.
    app.use('/demo-photos', express.static(path.join(__dirname, '..', 'public', 'demo-photos'), {
        maxAge: 0,
        etag: true,
        setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
    }));
    app.use('/uploads', express.static(config.uploads.dir, {
        // Загруженные файлы отдаём как вложения-картинки и без исполнения скриптов
        setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
    }));

    // --- REST API (две версии: /api/v1 — основная, /api — «алиас») ---------
    const apiDeps = {
        newsService: deps.newsService,
        galleryService: deps.galleryService,
        contactService: deps.contactService,
        aboutService: deps.aboutService,
        config,
        db: deps.db,
        rateLimiter: deps.rateLimiter
    };
    app.use('/api/v1', createApiRouter(apiDeps));
    app.use('/api', (req, res, next) => {
        // Помечаем «старую» версию, чтобы клиенты постепенно переезжали на /api/v1
        res.setHeader('Deprecation', 'true');
        res.setHeader('Link', '</api/v1' + req.url + '>; rel="successor-version"');
        next();
    }, createApiRouter(apiDeps));

    // --- Админка (EJS + сессия + CSRF) -------------------------------------
    app.use('/admin', createAdminRouter({
        authService: deps.authService,
        newsService: deps.newsService,
        galleryService: deps.galleryService,
        contactService: deps.contactService,
        aboutService: deps.aboutService,
        mailer: deps.mailer,
        upload: deps.upload,
        rateLimiter: deps.rateLimiter
    }));

    // --- Серверные страницы (шаблонизатор EJS) ----------------------------
    app.use('/site', createSiteRouter({
        newsService: deps.newsService,
        galleryService: deps.galleryService,
        contactService: deps.contactService,
        aboutService: deps.aboutService
    }));

    // --- React-SPA ---------------------------------------------------------
    // Сначала отдаём реальные файлы сборки (assets/*.js, *.css, картинки),
    // и только потом — fallback на index.html для клиентских маршрутов.
    // Без этой строки браузер получал бы index.html вместо скрипта и приложение
    // не запускалось (ошибка «MIME type text/html for module script»).
    app.use(express.static(config.frontend.distDir, {
        index: false,
        maxAge: '1h',
        setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
    }));
    app.use('/', createSpaRouter({ distDir: config.frontend.distDir }));

    // --- Обработка ошибок (обязательно последней) -------------------------
    app.use(errorHandler(deps.logger));

    return { app, deps };
}

/** Запуск сервера (используется и в смоук-тесте с другим портом). */
async function start(port = config.http.port, host = config.http.host) {
    const { app, deps } = await createApp();

    const server = app.listen(port, host, () => {
        const url = `http://${host}:${port}`;
        console.log('='.repeat(74));
        console.log('ПРОЕКТ «Фотостудия PRISMA» (тема 25) — сервер запущен');
        console.log('='.repeat(74));
        console.log(`Публичная часть (EJS)   : ${url}/site/`);
        console.log(`Публичная часть (React) : ${url}/`);
        console.log(`Админка (закрыта паролем): ${url}/admin/login`);
        console.log(`REST API                : ${url}/api/v1/news`);
        console.log(`Хранилище               : ${deps.db.driver} (${deps.db.driver === 'json' ? config.data.jsonFile : config.data.sqliteFile})`);
        console.log(`Каталог загрузок        : ${config.uploads.dir}`);
        console.log(`React-сборка            : ${config.frontend.distDir}`);
        console.log(`Логин администратора    : ${config.admin.login} (пароль — из ADMIN_PASSWORD)`);
        console.log('Остановить: Ctrl+C');
    });

    const shutdown = () => {
        console.log('\nОстанавливаю сервер...');
        server.close(() => {
            deps.db.close?.();
            process.exit(0);
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    return { server, deps };
}

if (require.main === module) {
    start().catch((err) => {
        console.error('Не удалось запустить сервер:', err);
        process.exit(1);
    });
}

module.exports = { createApp, start };
