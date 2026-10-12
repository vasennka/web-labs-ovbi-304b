/**
 * СЛОЙ PRESENTATION: маршруты REST API.
 *
 * Версионирование реализовано «физически»: приложение монтирует этот роутер
 * и по /api, и по /api/v1. Основной путь — /api/v1: если контракт придётся
 * изменить, старая версия останется жить по /api, а клиенты переедут постепенно.
 * Это то самое «версионирование URL-ом», о котором говорится в докладе.
 */

'use strict';

const express = require('express');
const newsApi = require('../controllers/api/news.controller');
const contentApi = require('../controllers/api/content.controller');
const { rateLimit } = require('../middleware');
const { clientIp } = require('../utils');

/**
 * @param {object} deps — собранные сервисы и зависимости (см. container.js)
 * @returns {import('express').Router}
 */
function createApiRouter(deps) {
    const { newsService, galleryService, contactService, aboutService, config, db, rateLimiter } = deps;
    const router = express.Router();

    // --- Служебные ---------------------------------------------------------
    router.get('/health', contentApi.health(config, db));

    // --- Новости -----------------------------------------------------------
    router.get('/news', newsApi.listNews(newsService));
    router.get('/news-latest', newsApi.latestNews(newsService));
    router.get('/news/:slug', newsApi.getNews(newsService));

    // --- Галерея -----------------------------------------------------------
    router.get('/gallery', contentApi.listGallery(galleryService));
    router.get('/gallery/:id', contentApi.getGalleryItem(galleryService));

    // --- Обратная связь (POST защищён ограничением частоты) ----------------
    router.post(
        '/contact',
        rateLimit(rateLimiter, (req) => `contact:${clientIp(req)}`),
        contentApi.submitContact(contactService)
    );

    // --- О нас и интеграции ------------------------------------------------
    router.get('/about', contentApi.getAbout(aboutService));
    router.get('/integrations', contentApi.getIntegrations(aboutService));

    // --- 404 внутри API: отличаем «нет такого ресурса API» от «нет страницы»
    router.use((req, res) => {
        res.status(404).json({
            ok: false,
            error: `Эндпоинт ${req.method} ${req.baseUrl}${req.path} не существует`,
            code: 'NOT_FOUND',
            hint: 'Попробуйте GET /api/v1/news, /api/v1/gallery, /api/v1/about, /api/v1/integrations'
        });
    });

    return router;
}

module.exports = { createApiRouter };
