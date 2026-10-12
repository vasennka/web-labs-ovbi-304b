/**
 * ИНТЕГРАЦИЯ №1 СО СТОРОННИМ СЕРВИСОМ — GitHub, через ОФИЦИАЛЬНЫЙ SDK @octokit/rest.
 *
 * Почему официальный SDK:
 *   - не нужно вручную собирать URL и разбирать ответы, SDK типизирован;
 *   - сам следит за версией API (заголовок X-GitHub-Api-Version), лимитами
 *     и корректно повторяет запросы при 5xx (плагин retry/throttling);
 *   - при смене контракта API обновляется библиотека, а не наш код.
 *
 * Устойчивость: результат кэшируется на 10 минут; при ошибке сети или
 * rate-limit отдаём последнее удачное значение, а если его нет — честную
 * заглушку с флагом degraded. Страница «О нас» остаётся работоспособной
 * даже без интернета (это проверяется в смоук-тесте).
 */

'use strict';

const { ExternalServiceError } = require('../../domain/errors');

class GitHubStatsProvider {
    #octokit = null;
    #owner;
    #repo;
    #cache;

    /**
     * @param {{ owner: string, repo: string, cache: import('./TtlCache').TtlCache, logger?: Console }} options
     */
    constructor({ owner, repo, cache, logger = console }) {
        this.#owner = owner;
        this.#repo = repo;
        this.#cache = cache;
        this.logger = logger;
    }

    /**
     * Ленивая инициализация: пакет @octokit/rest грузим только при первом запросе.
     * Так приложение запускается даже без установленной библиотеки
     * (в этом случае мы честно отдадим degraded-ответ).
     */
    async #client() {
        if (this.#octokit) return this.#octokit;

        const { Octokit } = await import('@octokit/rest'); // ESM-пакет — импортируем динамически

        this.#octokit = new Octokit({
            userAgent: 'prisma-studio-study-project/1.0',
            // Токен не обязателен для публичных репозиториев, но снимает жёсткий
            // rate limit. Передаём, если он есть в окружении.
            auth: process.env.GITHUB_TOKEN || undefined,
            request: { timeout: 5000 }
        });
        return this.#octokit;
    }

    /** @returns {Promise<object>} */
    async getRepoStats() {
        const key = `github:${this.#owner}/${this.#repo}`;

        const { value, fromCache, stale } = await this.#cache.remember(key, async () => {
            try {
                const octokit = await this.#client();

                // Один вызов официального SDK вместо ручной сборки запроса
                const { data } = await octokit.rest.repos.get({
                    owner: this.#owner,
                    repo: this.#repo
                });

                return {
                    provider: 'GitHub REST API (SDK @octokit/rest)',
                    fullName: data.full_name,
                    description: data.description,
                    stars: data.stargazers_count,
                    forks: data.forks_count,
                    openIssues: data.open_issues_count,
                    language: data.language,
                    lastPush: data.pushed_at,
                    url: data.html_url,
                    degraded: false
                };
            } catch (err) {
                // Ошибку оборачиваем в доменную — выше по стеку её поймут однозначно
                throw new ExternalServiceError('GitHub', err);
            }
        });

        return { ...value, fromCache, stale }
    }
}

module.exports = { GitHubStatsProvider };
