/**
 * СЛОЙ APPLICATION: сценарии использования новостей (use cases).
 *
 * Сервис НЕ знает про HTTP, Express, EJS или JSON-файл. Он умеет:
 *   - валидировать данные через доменную сущность;
 *   - гарантировать уникальность slug (транслит из заголовка + суффикс -2, -3);
 *   - выдавать пагинированные списки;
 *   - кидать доменные ошибки (NotFoundError/ValidationError), которые
 *     presentation-слой превратит в HTTP-коды.
 * Именно поэтому код тестируется без запуска сервера.
 */

'use strict';

const { validateNews, createNews, slugify } = require('../../domain/entities/News');
const { NotFoundError, ValidationError } = require('../../domain/errors');

const MAX_LIMIT = 50;

class NewsService {
    /** @param {{ newsRepository: import('../ports/repositories').NewsRepository }} deps */
    constructor({ newsRepository }) {
        this.newsRepository = newsRepository;
    }

    /**
     * Постраничный список новостей.
     * @param {{page?: number, limit?: number, tag?: string, search?: string}} [query]
     * @returns {Promise<{items: object[], total: number, page: number, limit: number, pages: number, tags: string[]}>}
     */
    async list({ page = 1, limit = 6, tag = '', search = '' } = {}) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || 6));
        const filters = { tag: String(tag || '').trim(), search: String(search || '').trim() };

        const total = await this.newsRepository.count(filters);
        const items = await this.newsRepository.list({
            offset: (safePage - 1) * safeLimit,
            limit: safeLimit,
            ...filters
        });

        return {
            items,
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.max(1, Math.ceil(total / safeLimit)),
            tags: await this.newsRepository.tags()
        };
    }

    /** Последние n новостей (для главной страницы). */
    async latest(n = 3) {
        return this.newsRepository.list({ offset: 0, limit: Math.min(MAX_LIMIT, n) });
    }

    /** Новость по slug — так строятся «человеческие» URL: /news/privet-mir */
    async getBySlug(slug) {
        const news = await this.newsRepository.findBySlug(String(slug || '').trim());
        if (!news) throw new NotFoundError('Новость');
        return news;
    }

    async getById(id) {
        const news = await this.newsRepository.findById(Number(id));
        if (!news) throw new NotFoundError('Новость');
        return news;
    }

    /** Создание новости (вызывается из админки). */
    async create(input) {
        const data = validateNews(input);
        data.slug = await this.#uniqueSlug(data.slug);
        return this.newsRepository.insert(createNews(data));
    }

    /** Обновление (PATCH: проверяем только переданные поля). */
    async update(id, input) {
        const existing = await this.getById(id);
        const data = validateNews(input, { partial: true });

        if (data.slug && data.slug !== existing.slug) {
            data.slug = await this.#uniqueSlug(data.slug, existing.id);
        }
        if (input.title && !input.slug && !data.slug) {
            // если изменили заголовок, но не задали slug — пересоберём из заголовка,
            // чтобы ссылка оставалась читаемой
            data.slug = await this.#uniqueSlug(slugify(input.title), existing.id);
        }

        return this.newsRepository.update(existing.id, data);
    }

    async remove(id) {
        const removed = await this.newsRepository.remove(Number(id));
        if (!removed) throw new NotFoundError('Новость');
        return true;
    }

    /**
     * Гарантирует уникальный slug: prisma -> prisma-2 -> prisma-3.
     * @private
     */
    async #uniqueSlug(base, ignoreId = null) {
        const candidate = base || 'news';
        let slug = candidate;
        let counter = 2;

        // «while» здесь безопасен: количество новостей конечно,
        // но добавим страховочный предел итераций.
        while (counter < 1000) {
            const found = await this.newsRepository.findBySlug(slug);
            if (!found || found.id === ignoreId) return slug;
            slug = `${candidate}-${counter++}`;
        }
        throw new ValidationError('Не удалось подобрать уникальный адрес новости');
    }
}

module.exports = { NewsService };
