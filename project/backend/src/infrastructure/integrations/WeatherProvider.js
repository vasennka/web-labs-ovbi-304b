/**
 * ИНТЕГРАЦИЯ №2 СО СТОРОННИМ СЕРВИСОМ — Open-Meteo (погода),
 * реализована как СОБСТВЕННЫЙ КЛИЕНТ ПОВЕРХ СЕТЕВОЙ БИБЛИОТЕКИ fetch.
 *
 * Технические детали, которые важно проговорить на защите:
 *   - AbortController + таймаут: без него зависший внешний сервис держит
 *     соединение бесконечно и «съедает» воркеры;
 *   - явная проверка response.ok: fetch НЕ бросает исключение на 404/500,
 *     это делает ошибку неочевидной, если её не проверять;
 *   - свой User-Agent и понятные query-параметры;
 *   - результат кэшируется (10 минут) — погода не меняется каждую секунду;
 *   - при ошибке отдаётся cache/заглушка, поэтому виджет не «ломает» страницу.
 *
 * Open-Meteo выбран потому, что не требует API-ключа: проект запускается
 * у любого проверяющего без регистрации.
 */

'use strict';

const { ExternalServiceError } = require('../../domain/errors');

/** Расшифровка кодов погоды WMO (сокращённая таблица из документации Open-Meteo). */
const WMO = {
    0: 'ясно',
    1: 'преимущественно ясно',
    2: 'переменная облачность',
    3: 'пасмурно',
    45: 'туман',
    48: 'изморозь',
    51: 'слабая морось',
    53: 'морось',
    55: 'сильная морось',
    61: 'небольшой дождь',
    63: 'дождь',
    65: 'сильный дождь',
    71: 'небольшой снег',
    73: 'снег',
    75: 'сильный снег',
    80: 'ливни',
    81: 'сильные ливни',
    82: 'очень сильные ливни',
    95: 'гроза',
    96: 'гроза с градом',
    99: 'сильная гроза с градом'
};

class WeatherProvider {
    #lat;
    #lon;
    #city;
    #cache;
    #timeoutMs;
    #logger;

    constructor({ lat, lon, city, cache, timeoutMs = 5000, logger = console }) {
        this.#lat = lat;
        this.#lon = lon;
        this.#city = city;
        this.#cache = cache;
        this.#timeoutMs = timeoutMs;
        this.#logger = logger;
    }

    /** @returns {Promise<object>} */
    async getCurrent() {
        const key = `weather:${this.#lat},${this.#lon}`;

        const { value, fromCache, stale } = await this.#cache.remember(
            key,
            () => this.#request(),
            { allowStale: true }
        );

        return { ...value, fromCache, stale };
    }

    /** @private */
    async #request() {
        const params = new URLSearchParams({
            latitude: String(this.#lat),
            longitude: String(this.#lon),
            current: 'temperature_2m,wind_speed_10m,weather_code',
            timezone: 'auto'
        });
        const url = `https://api.open-meteo.com/v1/forecast?${params}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.#timeoutMs);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'prisma-studio-study-project/1.0' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }

            const json = await response.json();
            const current = json.current ?? {};

            return {
                provider: 'Open-Meteo (клиент поверх fetch)',
                city: this.#city,
                temperature: Number.isFinite(current.temperature_2m) ? current.temperature_2m : null,
                windSpeed: Number.isFinite(current.wind_speed_10m) ? current.wind_speed_10m : null,
                description: WMO[current.weather_code] ?? 'нет данных',
                observedAt: current.time ?? null,
                degraded: false
            };
        } catch (err) {
            const reason = err.name === 'AbortError' ? `таймаут ${this.#timeoutMs} мс` : err.message;
            throw new ExternalServiceError('Open-Meteo', new Error(reason));
        } finally {
            clearTimeout(timer); // ОБЯЗАТЕЛЬНО: иначе таймер живёт и держит event loop
        }
    }
}

module.exports = { WeatherProvider, WMO_CODES: WMO };
