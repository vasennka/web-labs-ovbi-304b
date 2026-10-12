/**
 * СЛОЙ APPLICATION: порты (интерфейсы) репозиториев.
 *
 * Это ключевая идея чистой архитектуры: сервис (бизнес-логика) зависит НЕ от
 * конкретной базы, а от ИНТЕРФЕЙСА. Конкретную реализацию (JSON-файл, SQLite,
 * PostgreSQL) подставляет composition root (container.js).
 *
 * Направление зависимостей:  application -> domain
 *                            infrastructure -> application (реализует порт)
 * То есть бизнес-логика ничего не знает о хранении — «инверсия зависимостей».
 *
 * Здесь интерфейсы описаны как абстрактные классы: они не работают, но служат
 * документацией и дают понятную ошибку, если реализацию забыли подключить.
 */

'use strict';

/** Общая ошибка «порт не реализован». */
const notImplemented = (port, method) => {
    throw new Error(`Порт ${port}.${method}() не реализован. Подключите адаптер в container.js`);
};

/**
 * @typedef {object} Page
 * @property {object[]} items
 * @property {number} total
 * @property {number} page
 * @property {number} limit
 * @property {number} pages
 */

/** Репозиторий новостей. */
class NewsRepository {
    /** @returns {Promise<object[]>} */
    async list(/* { offset, limit, tag, search } */) { return notImplemented('NewsRepository', 'list'); }
    /** @returns {Promise<number>} */
    async count(/* { tag, search } */) { return notImplemented('NewsRepository', 'count'); }
    /** @returns {Promise<object|null>} */
    async findById(/* id */) { return notImplemented('NewsRepository', 'findById'); }
    /** @returns {Promise<object|null>} */
    async findBySlug(/* slug */) { return notImplemented('NewsRepository', 'findBySlug'); }
    /** @returns {Promise<object>} */
    async insert(/* entity */) { return notImplemented('NewsRepository', 'insert'); }
    /** @returns {Promise<object|null>} */
    async update(/* id, patch */) { return notImplemented('NewsRepository', 'update'); }
    /** @returns {Promise<boolean>} */
    async remove(/* id */) { return notImplemented('NewsRepository', 'remove'); }
    /** Все используемые теги (для фильтра). */
    async tags() { return notImplemented('NewsRepository', 'tags'); }
}

/** Репозиторий галереи. */
class GalleryRepository {
    async list(/* { offset, limit, category } */) { return notImplemented('GalleryRepository', 'list'); }
    async count(/* { category } */) { return notImplemented('GalleryRepository', 'count'); }
    async findById(/* id */) { return notImplemented('GalleryRepository', 'findById'); }
    async insert(/* entity */) { return notImplemented('GalleryRepository', 'insert'); }
    async update(/* id, patch */) { return notImplemented('GalleryRepository', 'update'); }
    async remove(/* id */) { return notImplemented('GalleryRepository', 'remove'); }
    async categories() { return notImplemented('GalleryRepository', 'categories'); }
}

/** Репозиторий сообщений обратной связи. */
class MessageRepository {
    async list(/* { offset, limit, onlyUnread } */) { return notImplemented('MessageRepository', 'list'); }
    async count(/* { onlyUnread } */) { return notImplemented('MessageRepository', 'count'); }
    async findById(/* id */) { return notImplemented('MessageRepository', 'findById'); }
    async insert(/* entity */) { return notImplemented('MessageRepository', 'insert'); }
    async update(/* id, patch */) { return notImplemented('MessageRepository', 'update'); }
    async remove(/* id */) { return notImplemented('MessageRepository', 'remove'); }
}

/** Репозиторий пользователей админки. */
class UserRepository {
    async findByLogin(/* login */) { return notImplemented('UserRepository', 'findByLogin'); }
    async findById(/* id */) { return notImplemented('UserRepository', 'findById'); }
    async insert(/* user */) { return notImplemented('UserRepository', 'insert'); }
    async update(/* id, patch */) { return notImplemented('UserRepository', 'update'); }
}

/** Репозиторий настроек (раздел «О нас» и контакты). Singleton. */
class SettingsRepository {
    async get(/* key */) { return notImplemented('SettingsRepository', 'get'); }
    async save(/* key, value */) { return notImplemented('SettingsRepository', 'save'); }
}

/** Хеширование паролей (реализация — bcryptjs в infrastructure). */
class PasswordHasher {
    async hash(/* plain */) { return notImplemented('PasswordHasher', 'hash'); }
    async verify(/* plain, hash */) { return notImplemented('PasswordHasher', 'verify'); }
}

module.exports = {
    NewsRepository,
    GalleryRepository,
    MessageRepository,
    UserRepository,
    SettingsRepository,
    PasswordHasher
};
