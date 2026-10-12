/**
 * СЛОЙ APPLICATION: раздел «О нас» + интеграции со сторонними сервисами.
 *
 * Здесь видно практическую пользу портов: AboutService понятия не имеет,
 * что статистика берётся через официальный SDK @octokit/rest, а погода —
 * через собственный HTTP-клиент. Он просто просит данные у абстракций.
 *
 * Отказоустойчивость: если внешний сервис недоступен, возвращается кэш или
 * честная заглушка со флагом degraded — страница «О нас» при этом работает.
 */

'use strict';

const { validateAbout } = require('../../domain/entities/User');
const { ExternalServiceError } = require('../../domain/errors');

/** Значения по умолчанию, пока админ ничего не сохранил. */
const DEFAULT_ABOUT = {
    title: 'Фотостудия PRISMA',
    text:
        'Мы — небольшая студия коммерческой и портретной фотографии. ' +
        'Снимаем в студии и на выезде, обрабатываем кадры вручную и печатаем ' +
        'выставочные отпечатки. За 6 лет работы — более 400 съёмок и 12 выставок.',
    values: [
        'Свет ставим по схеме, а не «на глаз»',
        'Отдаём RAW-исходники вместе с обработкой',
        'Печатаем только на архивной бумаге',
        'Договориваемся о правках заранее — без сюрпризов в счёте'
    ],
    phone: '+7 (495) 000-00-00',
    email: 'studio@prisma.local',
    address: 'Москва, ул. Примерная, 12, вход со двора',
    workHours: 'Пн–Сб 10:00–20:00, Вс — по записи'
};

class AboutService {
    /**
     * @param {{
     *   settingsRepository: import('../ports/repositories').SettingsRepository,
     *   vcsStatsProvider: import('../ports/integrations').VcsStatsProvider,
     *   weatherProvider: import('../ports/integrations').WeatherProvider,
     *   logger?: Console
     * }} deps
     */
    constructor({ settingsRepository, vcsStatsProvider, weatherProvider, logger = console }) {
        this.settingsRepository = settingsRepository;
        this.vcsStatsProvider = vcsStatsProvider;
        this.weatherProvider = weatherProvider;
        this.logger = logger;
    }

    /** Данные раздела «О нас» (из базы, с fallback на значения по умолчанию). */
    async getAbout() {
        const stored = await this.settingsRepository.get('about');
        return { ...DEFAULT_ABOUT, ...(stored ?? {}) };
    }

    /** Сохранение отредактированного админом раздела. */
    async saveAbout(input) {
        const data = validateAbout(input, { partial: true });
        return this.settingsRepository.save('about', data);
    }

    /**
     * Сводка по интеграциям для страницы «О нас».
     * Каждый вызов обёрнут в try/catch: падение одного сервиса не ломает другой.
     * @returns {Promise<{github: object, weather: object, fetchedAt: string}>}
     */
    async getIntegrations() {
        const [github, weather] = await Promise.all([
            this.#safe(() => this.vcsStatsProvider.getRepoStats(), 'github', {
                provider: 'GitHub REST API (SDK @octokit/rest)',
                degraded: true,
                error: true
            }),
            this.#safe(() => this.weatherProvider.getCurrent(), 'weather', {
                provider: 'Open-Meteo (клиент поверх fetch)',
                degraded: true,
                error: true
            })
        ]);

        return { github, weather, fetchedAt: new Date().toISOString() };
    }

    /**
     * @private
     * Универсальная обёртка «не падать, если сервис недоступен».
     */
    async #safe(fn, name, fallback) {
        try {
            return await fn();
        } catch (err) {
            const reason = err instanceof ExternalServiceError ? err.cause?.message ?? err.message : err.message;
            this.logger.warn(`[about] интеграция «${name}» недоступна: ${reason}`);
            return { ...fallback, message: reason };
        }
    }
}

module.exports = { AboutService, DEFAULT_ABOUT };
