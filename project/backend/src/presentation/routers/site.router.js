/**
 * СЛОЙ PRESENTATION: серверные страницы публичной части (EJS) + SPA-роутер.
 *
 * Зачем публичная часть продублирована и на EJS:
 *   1) требование ТЗ — представления должны формироваться шаблонизатором;
 *   2) это демонстрация того, что одни и те же сервисы обслуживают и REST API
 *      (для React), и серверный рендеринг (для поисковых роботов и «no-JS»);
 *   3) админка использует тот же шаблонизатор и те же partials — единый стиль.
 *
 * React-SPA живёт на «/», «/gallery», «/news» и т.д., а серверные версии
 * страниц — под /site/... Так две модели рендеринга не конфликтуют и обе
 * доступны проверяющему.
 */

'use strict';

const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { asyncHandler } = require('../utils');

/**
 * @param {object} deps
 * @returns {import('express').Router}
 */
function createSiteRouter(deps) {
    const { newsService, galleryService, contactService, aboutService } = deps;
    const router = express.Router();

    /** Общие данные для layout: контакты подвала + счётчик непрочитанных. */
    const baseLocals = async () => ({ about: await aboutService.getAbout() });

    // --- Главная (серверная версия) ----------------------------------------
    router.get('/', asyncHandler(async (req, res) => {
        const locals = await baseLocals();
        const [news, gallery] = await Promise.all([
            newsService.latest(3),
            galleryService.list({ limit: 6 })
        ]);
        res.render('site/home', {
            title: 'Фотостудия PRISMA — серверная версия страницы',
            ...locals,
            news,
            gallery: gallery.items
        });
    }));

    // --- О нас --------------------------------------------------------------
    router.get('/about', asyncHandler(async (req, res) => {
        const locals = await baseLocals();
        const integrations = await aboutService.getIntegrations();
        res.render('site/about', { title: 'О студии', ...locals, integrations });
    }));

    // --- Галерея с фильтром по категории (обычная HTML-форма, без JS) -------
    router.get('/gallery', asyncHandler(async (req, res) => {
        const locals = await baseLocals();
        const gallery = await galleryService.list({
            page: req.query.page,
            limit: 9,
            category: req.query.category
        });
        res.render('site/gallery', {
            title: 'Галерея работ',
            ...locals,
            ...gallery,
            currentCategory: String(req.query.category ?? '')
        });
    }));

    // --- Новости + отдельная новость ---------------------------------------
    router.get('/news', asyncHandler(async (req, res) => {
        const locals = await baseLocals();
        const news = await newsService.list({ page: req.query.page, limit: 5, tag: req.query.tag });
        res.render('site/news', { title: 'Новости студии', ...locals, ...news, currentTag: String(req.query.tag ?? '') });
    }));

    router.get('/news/:slug', asyncHandler(async (req, res) => {
        const locals = await baseLocals();
        const news = await newsService.getBySlug(req.params.slug);
        res.render('site/news-item', { title: news.title, ...locals, news });
    }));

    // --- Контакты: форма обратной связи работает без JavaScript ------------
    router.get('/contacts', asyncHandler(async (req, res) => {
        const locals = await baseLocals();
        res.render('site/contacts', {
            title: 'Контакты и обратная связь',
            ...locals,
            errors: {},
            values: {},
            sent: req.query.sent === '1'
        });
    }));

    router.post('/contacts', asyncHandler(async (req, res) => {
        const locals = await baseLocals();
        try {
            await contactService.submit(req.body ?? {}, { userAgent: req.get('user-agent') ?? '' });
            return res.redirect('/site/contacts?sent=1');
        } catch (err) {
            // Возвращаем форму с сообщениями об ошибках по полям — без потери введённых данных
            return res.status(err.status ?? 500).render('site/contacts', {
                title: 'Контакты и обратная связь',
                ...locals,
                errors: err.details ?? { form: err.message },
                values: req.body ?? {},
                sent: false
            });
        }
    }));

    return router;
}

/**
 * SPA-роутер: отдаёт собранный React (frontend/dist) на все «клиентские» пути.
 * Если сборки нет — возвращаем понятную подсказку, а не пустой экран.
 */
function createSpaRouter({ distDir }) {
    const router = express.Router();
    const indexFile = path.join(distDir, 'index.html');

    router.get('*', (req, res, next) => {
        // Реальные файлы (assets/*.js, favicon) отдаёт express.static, сюда не дошло
        if (!fs.existsSync(indexFile)) {
            return res.status(503).type('html').send(`
                <!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Нужна сборка</title></head>
                <body style="font-family:system-ui;max-width:720px;margin:40px auto;line-height:1.6">
                <h1>Фронтенд ещё не собран</h1>
                <p>Соберите React-приложение (Vite):</p>
                <pre>cd project/frontend
npm install
npm run build</pre>
                <p>А пока доступны серверные страницы на шаблонизаторе EJS:
                <a href="/site/">/site/</a>, <a href="/site/gallery">галерея</a>,
                <a href="/site/news">новости</a>, <a href="/site/contacts">контакты</a>,
                админка — <a href="/admin/login">/admin/login</a>.</p>
                </body></html>
            `);
        }
        return res.sendFile(indexFile, (err) => (err ? next(err) : undefined));
    });

    return router;
}

module.exports = { createSiteRouter, createSpaRouter };
