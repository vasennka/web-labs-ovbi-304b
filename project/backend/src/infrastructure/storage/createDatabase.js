/**
 * СЛОЙ INFRASTRUCTURE: фабрика хранилища.
 *
 * Единственное место, где выбирается конкретный драйвер базы.
 * Благодаря этому переключение «файл ↔ SQLite» — это одна переменная
 * окружения (DATA_DRIVER), а не правка кода во всех репозиториях.
 */

'use strict';

const { JsonDatabase } = require('./JsonDatabase');
const { SqliteDatabase } = require('./SqliteDatabase');

/** Коллекции, которые должны существовать при старте. */
const COLLECTIONS = ['news', 'gallery', 'messages', 'users', 'settings'];

/**
 * @param {typeof import('../../config')} config
 * @returns {Promise<{all: Function, find: Function, insert: Function, update: Function, remove: Function, close?: Function, driver: string}>}
 */
async function createAppDatabase(config) {
    const driver = config.data.driver === 'sqlite' ? 'sqlite' : 'json';

    const db =
        driver === 'sqlite'
            ? new SqliteDatabase({ file: config.data.sqliteFile })
            : new JsonDatabase({ file: config.data.jsonFile });

    await db.init({ collections: COLLECTIONS });
    db.driver = driver;
    return db;
}

module.exports = { createAppDatabase, COLLECTIONS };
