/**
 * СЛОЙ INFRASTRUCTURE: базовый репозиторий коллекции.
 *
 * Все конкретные репозитории (новости, галерея, сообщения, пользователи)
 * отличаются только набором фильтров и специфичными поисками, поэтому общая
 * механика (пагинация, сортировка, CRUD) живёт здесь — в одном месте.
 *
 * ВАЖНО: выборка/фильтрация делается в JavaScript. Для учебного проекта с
 * десятками записей это нормально, но в реальной системе фильтры уходят в SQL
 * (WHERE/ORDER BY/LIMIT) — иначе на миллионе записей всё будет в памяти.
 */

'use strict';

class CollectionRepository {
    /**
     * @param {{
     *   db: { all: Function, find: Function, insert: Function, update: Function, remove: Function },
     *   collection: string,
     *   defaultSort?: (a: object, b: object) => number
     * }} options
     */
    constructor({ db, collection, defaultSort }) {
        this.db = db;
        this.collection = collection;
        this.defaultSort = defaultSort ?? ((a, b) => b.id - a.id);
    }

    /** Все документы (отсортированные по умолчанию). */
    async findAll() {
        const items = await this.db.all(this.collection);
        return items.sort(this.defaultSort);
    }

    /** Пагинированный список с произвольным фильтром. */
    async paged({ offset = 0, limit = 20, where = () => true, sort } = {}) {
        const items = await this.findAll();
        const filtered = items.filter(where).sort(sort ?? this.defaultSort);
        return filtered.slice(offset, offset + limit);
    }

    /** Количество документов по фильтру. */
    async countWhere(where = () => true) {
        const items = await this.db.all(this.collection);
        return items.filter(where).length;
    }

    async findById(id) {
        return this.db.find(this.collection, Number(id));
    }

    async insert(entity) {
        return this.db.insert(this.collection, entity);
    }

    async update(id, patch) {
        return this.db.update(this.collection, Number(id), patch);
    }

    async remove(id) {
        return this.db.remove(this.collection, Number(id));
    }
}

module.exports = { CollectionRepository };
