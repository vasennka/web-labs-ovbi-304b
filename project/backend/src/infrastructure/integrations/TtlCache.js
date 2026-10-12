/**
 * СЛОЙ INFRASTRUCTURE: кэш с временем жизни (TTL) для ответов внешних сервисов.
 *
 * Зачем: GitHub и Open-Meteo — чужие сервисы. Мы не должны дергать их на каждый
 * запрос пользователя: это медленно и быстро упирается в rate limit.
 * Кэш на 10 минут делает интеграцию быстрой и «вежливой» к чужому API,
 * а при недоступности сервиса позволяет отдать последние успешные данные.
 */

'use strict';

class TtlCache {
    #store = new Map();
    #ttl;

    /** @param {{ ttlMs?: number }} [options] */
    constructor({ ttlMs = 10 * 60_000 } = {}) {
        this.#ttl = ttlMs;
    }

    /**
     * Возвращает значение из кэша или вычисляет и запоминает его.
     * @template T
     * @param {string} key
     * @param {() => Promise<T>} factory
     * @param {{ allowStale?: boolean }} [options] — allowStale: если factory упала,
     *        вернуть устаревшее значение (это и есть graceful degradation)
     */
    async remember(key, factory, { allowStale = true } = {}) {
        const entry = this.#store.get(key);
        const now = Date.now();

        if (entry && now - entry.savedAt < this.#ttl) {
            return { value: entry.value, fromCache: true, stale: false };
        }

        try {
            const value = await factory();
            this.#store.set(key, { value, savedAt: now });
            return { value, fromCache: false, stale: false };
        } catch (err) {
            if (allowStale && entry) {
                return { value: entry.value, fromCache: true, stale: true, error: err };
            }
            throw err;
        }
    }

    peek(key) {
        return this.#store.get(key)?.value ?? null;
    }

    clear() {
        this.#store.clear();
    }
}

module.exports = { TtlCache };
