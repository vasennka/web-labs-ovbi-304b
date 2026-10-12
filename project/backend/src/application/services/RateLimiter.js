/**
 * СЛОЙ APPLICATION: простая защита от спама (in-memory rate limiter).
 *
 * Реализован как отдельный сервис, а не как middleware Express, чтобы:
 *   - правило «не больше N действий за окно» можно было применять и к API,
 *     и к форме входа, и к серверным страницам;
 *   - логику можно было покрыть тестами без HTTP.
 *
 * Хранилище — Map в памяти процесса. Для одного инстанса этого достаточно;
 * при нескольких инстансах понадобится общий store (Redis) — это отмечено
 * в докладе как осознанный компромисс.
 */

'use strict';

const { RateLimitError } = require('../../domain/errors');

class RateLimiter {
    /**
     * @param {{ windowMs?: number, maxAttempts?: number }} [options]
     */
    constructor({ windowMs = 60_000, maxAttempts = 5 } = {}) {
        this.windowMs = windowMs;
        this.maxAttempts = maxAttempts;
        /** @type {Map<string, number[]>} ключ -> временные метки попыток */
        this.attempts = new Map();
    }

    /**
     * Регистрирует попытку и бросает RateLimitError, если лимит превышен.
     * @param {string} key — например, `contact:${ip}` или `login:${login}`
     */
    check(key) {
        const now = Date.now();
        const fresh = (this.attempts.get(key) ?? []).filter((t) => now - t < this.windowMs);

        if (fresh.length >= this.maxAttempts) {
            const waitSeconds = Math.ceil((this.windowMs - (now - fresh[0])) / 1000);
            throw new RateLimitError(`Слишком много попыток. Повторите через ${waitSeconds} с`);
        }

        fresh.push(now);
        this.attempts.set(key, fresh);
        return { remaining: this.maxAttempts - fresh.length };
    }

    /** Сброс счётчика (например, после успешного входа). */
    reset(key) {
        this.attempts.delete(key);
    }

    /** Периодическая уборка, чтобы Map не рос бесконечно. */
    startCleanup(intervalMs = 10 * 60_000) {
        const timer = setInterval(() => {
            const now = Date.now();
            for (const [key, timestamps] of this.attempts) {
                const fresh = timestamps.filter((t) => now - t < this.windowMs);
                if (fresh.length === 0) this.attempts.delete(key);
                else this.attempts.set(key, fresh);
            }
        }, intervalMs);
        timer.unref?.(); // не мешать завершению процесса
        return timer;
    }
}

module.exports = { RateLimiter };
