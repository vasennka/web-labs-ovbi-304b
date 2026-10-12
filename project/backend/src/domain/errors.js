/**
 * СЛОЙ DOMAIN: доменные ошибки.
 *
 * Зачем свои классы ошибок, а не throw new Error('...'):
 *   - по instanceof можно выбрать правильный HTTP-код в одном месте (errorHandler);
 *   - сообщение для пользователя отделено от деталей реализации;
 *   - домен не зависит ни от Express, ни от базы — он не знает про HTTP.
 * Зависимостей у этого файла нет вообще (чистое ядро).
 */

'use strict';

/** Базовая ошибка приложения. */
class AppError extends Error {
    /**
     * @param {string} message — безопасное для пользователя сообщение
     * @param {object} [options]
     * @param {number} [options.status=500] — HTTP-код
     * @param {string} [options.code='APP_ERROR']
     * @param {unknown} [options.cause] — исходная ошибка
     */
    constructor(message, { status = 500, code = 'APP_ERROR', cause } = {}) {
        super(message, { cause });
        this.name = new.target.name;
        this.status = status;
        this.code = code;
        this.expose = status < 500; // 5xx-ошибки не показываем пользователю целиком
    }
}

/** Ошибка валидации входных данных (400). */
class ValidationError extends AppError {
    constructor(message, details = {}) {
        super(message, { status: 400, code: 'VALIDATION_ERROR' });
        this.details = details; // какие именно поля неверны — удобно для формы
    }
}

/** Сущность не найдена (404). */
class NotFoundError extends AppError {
    constructor(what = 'Ресурс') {
        super(`${what} не найден`, { status: 404, code: 'NOT_FOUND' });
    }
}

/** Нет аутентификации / сессии (401). */
class AuthError extends AppError {
    constructor(message = 'Требуется вход в систему') {
        super(message, { status: 401, code: 'AUTH_REQUIRED' });
    }
}

/** Нет прав (403). */
class ForbiddenError extends AppError {
    constructor(message = 'Доступ запрещён') {
        super(message, { status: 403, code: 'FORBIDDEN' });
    }
}

/** Слишком много запросов (429) — простейшая защита от спама. */
class RateLimitError extends AppError {
    constructor(message = 'Слишком много запросов, попробуйте позже') {
        super(message, { status: 429, code: 'RATE_LIMITED' });
    }
}

/** Внешний сервис недоступен (502). Используется адаптерами интеграций. */
class ExternalServiceError extends AppError {
    constructor(service, cause) {
        super(`Внешний сервис «${service}» недоступен`, { status: 502, code: 'EXTERNAL_ERROR', cause });
        this.service = service;
    }
}

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    AuthError,
    ForbiddenError,
    RateLimitError,
    ExternalServiceError
};
