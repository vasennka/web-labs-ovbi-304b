/**
 * СЛОЙ INFRASTRUCTURE: конкретные репозитории.
 *
 * Каждый класс наследует CollectionRepository и добавляет только то, что
 * специфично для его коллекции (поиск по slug, фильтр по тегу/категории,
 * сортировка по дате публикации). Все они реализуют порты из
 * application/ports/repositories.js.
 */

'use strict';

const { CollectionRepository } = require('./CollectionRepository');

/** Новости: сортируем по дате публикации (свежие сверху). */
class NewsRepositoryAdapter extends CollectionRepository {
    constructor({ db }) {
        super({
            db,
            collection: 'news',
            defaultSort: (a, b) => new Date(b.publishedAt ?? 0) - new Date(a.publishedAt ?? 0)
        });
    }

    async list({ offset = 0, limit = 6, tag = '', search = '' } = {}) {
        const searchLower = search.toLowerCase();
        return this.paged({
            offset,
            limit,
            where: (item) => this.#match(item, tag, searchLower)
        });
    }

    async count({ tag = '', search = '' } = {}) {
        const searchLower = search.toLowerCase();
        return this.countWhere((item) => this.#match(item, tag, searchLower));
    }

    async findBySlug(slug) {
        const items = await this.db.all(this.collection);
        return items.find((item) => item.slug === slug) ?? null;
    }

    /** Теги, реально используемые в новостях (для фильтра в интерфейсе). */
    async tags() {
        const items = await this.db.all(this.collection);
        const set = new Set();
        items.forEach((item) => (item.tags ?? []).forEach((tag) => set.add(tag)));
        return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
    }

    /** @private */
    #match(item, tag, searchLower) {
        const byTag = !tag || (item.tags ?? []).includes(tag);
        const bySearch =
            !searchLower ||
            item.title.toLowerCase().includes(searchLower) ||
            (item.excerpt ?? '').toLowerCase().includes(searchLower) ||
            item.content.toLowerCase().includes(searchLower);
        return byTag && bySearch;
    }
}

/** Галерея: свежие работы сверху, фильтр по категории. */
class GalleryRepositoryAdapter extends CollectionRepository {
    constructor({ db }) {
        super({
            db,
            collection: 'gallery',
            defaultSort: (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)
        });
    }

    async list({ offset = 0, limit = 12, category = '' } = {}) {
        return this.paged({
            offset,
            limit,
            where: (item) => !category || item.category === category
        });
    }

    async count({ category = '' } = {}) {
        return this.countWhere((item) => !category || item.category === category);
    }

    async categories() {
        const items = await this.db.all(this.collection);
        return [...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'ru'));
    }
}

/** Сообщения: свежие сверху, можно показать только непрочитанные. */
class MessageRepositoryAdapter extends CollectionRepository {
    constructor({ db }) {
        super({
            db,
            collection: 'messages',
            defaultSort: (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)
        });
    }

    async list({ offset = 0, limit = 20, onlyUnread = false } = {}) {
        return this.paged({ offset, limit, where: (item) => !onlyUnread || !item.isRead });
    }

    async count({ onlyUnread = false } = {}) {
        return this.countWhere((item) => !onlyUnread || !item.isRead);
    }
}

/** Пользователи админки. */
class UserRepositoryAdapter extends CollectionRepository {
    constructor({ db }) {
        super({ db, collection: 'users', defaultSort: (a, b) => a.id - b.id });
    }

    async findByLogin(login) {
        const items = await this.db.all(this.collection);
        return items.find((user) => user.login === String(login).trim().toLowerCase()) ?? null;
    }
}

/**
 * Настройки (singleton-записи вида { key, value }).
 * Хранятся в отдельной коллекции 'settings'.
 */
class SettingsRepositoryAdapter {
    constructor({ db }) {
        this.db = db;
        this.collection = 'settings';
    }

    async get(key) {
        const rows = await this.db.all(this.collection);
        return rows.find((row) => row.key === key)?.value ?? null;
    }

    async save(key, value) {
        const rows = await this.db.all(this.collection);
        const existing = rows.find((row) => row.key === key);

        if (existing) {
            const updated = await this.db.update(this.collection, existing.id, {
                value: { ...existing.value, ...value }
            });
            return updated.value;
        }

        const created = await this.db.insert(this.collection, { key, value });
        return created.value;
    }
}

module.exports = {
    NewsRepositoryAdapter,
    GalleryRepositoryAdapter,
    MessageRepositoryAdapter,
    UserRepositoryAdapter,
    SettingsRepositoryAdapter
};
