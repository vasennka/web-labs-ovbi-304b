/**
 * СЛОЙ PRESENTATION: middleware безопасности и обработки ошибок.
 */

'use strict';

const crypto = require('node:crypto');
const { AppError } = require('../../domain/errors');
const { clientIp } = require('../utils');

/**
 * Единый обработчик ошибок Express (4 аргумента — обязательное условие).
 *
 * Здесь «сходятся» доменные ошибки и HTTP:
 *   ValidationError -> 400, NotFoundError -> 404, AuthError -> 401, и т.д.
 * Наружу отдаём безопасный текст (err.expose), внутренние детали (5xx)
 * логируем и показываем общее сообщение — это защита от утечки информации.
 */
function errorHandler(logger = console) {
    // eslint-disable-next-line no-unused-vars
    return (err, req, res, next) => {
        const status = err instanceof AppError ? err.status : 500;
        const payload = {
            ok: false,
            error: err.expose || err instanceof AppError ? err.message : 'Внутренняя ошибка сервера',
            code: err.code ?? 'INTERNAL_ERROR'
        };
        if (err.details) payload.details = err.details;

        if (status >= 500) {
            logger.error(`[error] ${req.method} ${req.originalUrl} ->`, err);
        } else {
            logger.warn(`[warn] ${req.method} ${req.originalUrl} -> ${status} ${err.message}`);
        }

        // Для API отвечаем JSON, для страниц админки — HTML-страницей ошибки
        const wantsJson = req.path.startsWith('/api') || req.xhr || req.get('accept')?.includes('application/json');
        if (wantsJson) return res.status(status).json(payload);

        return res.status(status).render('admin/error', {
            title: 'Ошибка',
            status,
            message: payload.error,
            details: payload.details,
            user: req.session?.user ?? null
        });
    };
}

/**
 * Проверка аутентификации для админских маршрутов.
 * Если сессии нет — редирект на форму входа (для страниц) либо 401 (для API).
 */
function requireAuth() {
    return (req, res, next) => {
        if (req.session?.user) return next();

        if (req.path.startsWith('/api')) {
            return res.status(401).json({ ok: false, error: 'Требуется вход в систему', code: 'AUTH_REQUIRED' });
        }
        // Запоминаем, куда пользователь шёл, чтобы вернуть его туда после входа
        req.session.returnTo = req.originalUrl;
        return res.redirect('/admin/login');
    };
}

/**
 * CSRF-защита по схеме double-submit cookie + сессия.
 *
 * Механика: сервер генерирует случайный токен и хранит его в сессии.
 * Токен попадает в скрытое поле каждой формы. При POST сравниваем присланное
 * значение с сессионным (используя timing-safe сравнение). Посторонний сайт
 * не может прочитать значение из нашей формы — значит, не сможет его подделать.
 */
function csrf() {
    const generate = () => crypto.randomBytes(32).toString('hex');

    return (req, res, next) => {
        // Ленивая генерация: если токена ещё нет — создаём
        if (!req.session?.csrfToken) {
            if (req.session) req.session.csrfToken = generate();
        }
        res.locals.csrfToken = req.session?.csrfToken ?? '';

        // Проверяем только «изменяющие» методы
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            const sent = req.body?._csrf ?? req.get('x-csrf-token') ?? '';
            const expected = req.session?.csrfToken ?? '';

            const okLength = sent.length === expected.length && expected.length > 0;
            const okValue = okLength && crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));

            if (!okValue) {
                const err = new AppError('Недействительный CSRF-токен. Обновите страницу и попробуйте снова', {
                    status: 403,
                    code: 'CSRF_ERROR'
                });
                return next(err);
            }
        }

        return next();
    };
}

/**
 * Ограничение частоты запросов на основе сервиса RateLimiter.
 * @param {import('../../application/services/RateLimiter').RateLimiter} limiter
 * @param {(req: import('express').Request) => string} keyFn
 */
function rateLimit(limiter, keyFn) {
    return (req, _res, next) => {
        try {
            limiter.check(keyFn(req));
            next();
        } catch (err) {
            next(err);
        }
    };
}

/**
 * Базовые заголовки безопасности (упрощённый аналог helmet).
 * В проекте подключён и сам helmet — здесь показан «ручной» подход для понимания.
 */
function securityHeaders() {
    return (_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    };
}

/** Логирование запросов (краткий формат). */
function requestLogger(logger = console) {
    return (req, res, next) => {
        const startedAt = process.hrtime.bigint();
        res.on('finish', () => {
            const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
            if (!req.path.startsWith('/assets') && !req.path.endsWith('.ico')) {
                logger.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)} мс) от ${clientIp(req)}`);
            }
        });
        next();
    };
}

module.exports = { errorHandler, requireAuth, csrf, rateLimit, securityHeaders, requestLogger };
