/**
 * REST-контроллеры: галерея, обратная связь, «О нас» с интеграциями.
 * Собраны в один файл, потому что каждый из них — 5-15 строк «клея»
 * между HTTP и сервисом.
 */

'use strict';

const { asyncHandler, ok, clean, clientIp } = require('../../utils');

/* ------------------------------- ГАЛЕРЕЯ ------------------------------- */

/** GET /api/v1/gallery?page&limit&category */
const listGallery = (galleryService) =>
    asyncHandler(async (req, res) => {
        const result = await galleryService.list({
            page: req.query.page,
            limit: req.query.limit,
            category: clean(req.query.category, 30)
        });
        ok(res, result);
    });

/** GET /api/v1/gallery/:id */
const getGalleryItem = (galleryService) =>
    asyncHandler(async (req, res) => {
        const item = await galleryService.getById(req.params.id);
        ok(res, { item });
    });

/* -------------------------- ОБРАТНАЯ СВЯЗЬ ----------------------------- */

/**
 * POST /api/v1/contact
 * Тело: { name, email, message, rating?, website? (honeypot) }
 * Ответ: 201 { ok: true, id, createdAt, notified }
 */
const submitContact = (contactService) =>
    asyncHandler(async (req, res) => {
        const result = await contactService.submit(req.body ?? {}, {
            userAgent: req.get('user-agent') ?? '',
            ip: clientIp(req)
        });
        ok(res, result, 201);
    });

/* ------------------------------- О НАС --------------------------------- */

/** GET /api/v1/about — текст раздела и контакты. */
const getAbout = (aboutService) =>
    asyncHandler(async (req, res) => {
        const about = await aboutService.getAbout();
        ok(res, { about });
    });

/**
 * GET /api/v1/integrations — сводка по сторонним сервисам.
 * Обратите внимание: даже если внешние API недоступны, вернётся 200
 * с полем degraded = true. Это осознанное решение: виджет на сайте
 * не должен «падать» из-за чужого сервиса.
 */
const getIntegrations = (aboutService) =>
    asyncHandler(async (req, res) => {
        const integrations = await aboutService.getIntegrations();
        ok(res, integrations);
    });

/* ------------------------------ СЛУЖЕБНОЕ ------------------------------ */

/** GET /api/v1/health — проверка работоспособности (используется смоук-тестом). */
const health = (config, db) =>
    asyncHandler(async (_req, res) => {
        ok(res, {
            status: 'ok',
            env: config.env,
            driver: db.driver,
            time: new Date().toISOString(),
            uptimeSec: Math.round(process.uptime())
        });
    });

module.exports = { listGallery, getGalleryItem, submitContact, getAbout, getIntegrations, health };
