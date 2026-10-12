/**
 * СЛОЙ APPLICATION: порты для сторонних сервисов и отправки писем.
 *
 * Проект требует интеграцию со сторонним сервисом. Мы делаем её через порт:
 * бизнес-логика (AboutService) просит «дай статистику репозитория» и «дай погоду»,
 * а КАК именно это получено (официальный SDK Octokit или HTTP-клиент поверх fetch)
 * решает адаптер в infrastructure. Это позволяет:
 *   - подменить GitHub на GitLab, не меняя сервис;
 *   - в тестах подставить простой fake-объект без сети;
 *   - при недоступности сервиса вернуть кэш или заглушку.
 */

'use strict';

const notImplemented = (port, method) => {
    throw new Error(`Порт ${port}.${method}() не реализован`);
};

/**
 * Провайдер статистики репозитория (интеграция №1, официальный SDK @octokit/rest).
 * @typedef {object} RepoStats
 * @property {string} fullName
 * @property {number} stars
 * @property {number} forks
 * @property {number} openIssues
 * @property {string} lastPush
 * @property {string} url
 * @property {boolean} fromCache
 */
class VcsStatsProvider {
    /** @returns {Promise<RepoStats>} */
    async getRepoStats() { return notImplemented('VcsStatsProvider', 'getRepoStats'); }
}

/**
 * Провайдер погоды (интеграция №2, собственный клиент поверх fetch).
 * @typedef {object} Weather
 * @property {string} city
 * @property {number|null} temperature
 * @property {number|null} windSpeed
 * @property {string} description
 * @property {boolean} fromCache
 * @property {boolean} degraded — true, если данные получены из заглушки
 */
class WeatherProvider {
    /** @returns {Promise<Weather>} */
    async getCurrent() { return notImplemented('WeatherProvider', 'getCurrent'); }
}

/** Отправка уведомлений (в учебном проекте — вывод в консоль). */
class Mailer {
    async send(/* { to, subject, text } */) { return notImplemented('Mailer', 'send'); }
}

module.exports = { VcsStatsProvider, WeatherProvider, Mailer };
