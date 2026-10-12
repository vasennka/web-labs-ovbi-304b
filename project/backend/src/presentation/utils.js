/**
 * СЛОЙ PRESENTATION: утилиты для Express-контроллеров.
 *
 * asyncHandler — важная деталь: Express 4 НЕ передаёт ошибку из async-функции
 * в error-middleware автоматически. Без обёртки отклонённый промис приведёт
 * к «зависшему» запросу. Обёртка ловит ошибку и вызывает next(err).
 */

'use strict';

/**
 * @param {(req, res, next) => Promise<any>} handler
 * @returns {import('express').RequestHandler}
 */
const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

/** Успешный JSON-ответ единого формата. */
const ok = (res, data, status = 200) => res.status(status).json({ ok: true, ...data });

/** Ошибка в формате JSON (используется напрямую только в редких случаях). */
const fail = (res, status, message, details = undefined) =>
    res.status(status).json({ ok: false, error: message, ...(details ? { details } : {}) });

/** Мягкая нормализация текста: обрезаем края и ограничиваем длину. */
const clean = (value, maxLength = 500) => String(value ?? '').trim().slice(0, maxLength);

/** Отдаёт «IP клиента» с учётом прокси (для rate limit). */
const clientIp = (req) =>
    (req.headers['x-forwarded-for']?.split(',')[0] ?? req.socket?.remoteAddress ?? 'unknown').trim();

module.exports = { asyncHandler, ok, fail, clean, clientIp };
