/**
 * СЛОЙ PRESENTATION: маршруты админки (серверный рендеринг EJS + сессия).
 *
 * Схема защиты:
 *   requireAuth -> все маршруты ниже /admin/login требуют сессии;
 *   csrf        -> все POST проверяют токен из формы;
 *   rateLimit   -> вход ограничен по количеству попыток.
 *
 * Обратите внимание: админка — это обычные HTML-формы. Она работает даже там,
 * где JavaScript отключён или запрещён политикой безопасности, и не требует
 * сборки фронтенда. Именно для таких страниц и выбран шаблонизатор EJS.
 */

'use strict';

const express = require('express');
const auth = require('../controllers/admin/auth.controller');
const content = require('../controllers/admin/content.controller');
const { requireAuth, csrf, rateLimit } = require('../middleware');
const { clientIp } = require('../utils');

/**
 * @param {object} deps
 * @returns {import('express').Router}
 */
function createAdminRouter(deps) {
    const { authService, newsService, galleryService, contactService, aboutService, mailer, upload, rateLimiter } = deps;
    const router = express.Router();

    // CSRF-токен нужен и на форме входа (там ещё нет сессии — токен создастся)
    router.use(csrf());

    // ----------------------------- ПУБЛИЧНЫЕ ------------------------------
    router.get('/login', auth.showLogin());
    router.post('/login', rateLimit(rateLimiter, (req) => `login:${clientIp(req)}`), auth.login(authService));
    router.post('/logout', auth.logout());

    // ---------------------- ВСЁ НИЖЕ ТРЕБУЕТ ВХОДА ------------------------
    router.use(requireAuth());

    router.get('/', content.dashboard({ newsService, contactService, galleryService, aboutService, mailer }));

    // Новости
    router.get('/news', content.newsList({ newsService }));
    router.get('/news/new', content.newsForm({ newsService }));
    router.get('/news/:id/edit', content.newsForm({ newsService }));
    router.post('/news', content.newsSave({ newsService }));
    router.post('/news/:id', content.newsSave({ newsService }));
    router.post('/news/:id/delete', content.newsDelete({ newsService }));

    // Галерея (загрузка файла обрабатывается multer)
    router.get('/gallery', content.galleryList({ galleryService }));
    router.post('/gallery', upload.single('image'), content.galleryCreate({ galleryService, upload }));
    router.post('/gallery/:id/delete', content.galleryDelete({ galleryService }));

    // Обратная связь
    router.get('/messages', content.messagesList({ contactService }));
    router.post('/messages/:id/read', content.messageToggleRead({ contactService }));
    router.post('/messages/:id/delete', content.messageDelete({ contactService }));

    // Раздел «О нас» + интеграции
    router.get('/about', content.aboutForm({ aboutService }));
    router.post('/about', content.aboutSave({ aboutService }));

    // Смена пароля
    router.post('/password', auth.changePassword(authService));

    return router;
}

module.exports = { createAdminRouter };
