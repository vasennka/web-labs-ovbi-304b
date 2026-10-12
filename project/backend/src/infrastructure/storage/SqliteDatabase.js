/**
 * СЛОЙ INFRASTRUCTURE: адаптер базы данных на встроенном модуле node:sqlite
 * (Node.js 22+). Демонстрирует главную идею архитектуры: чтобы перейти с файла
 * на настоящую БД, достаточно поменять DATA_DRIVER=sqlite — код сервисов,
 * контроллеров и шаблонов не меняется НИ ОДНОЙ СТРОКОЙ.
 *
 * Схема простая и честная: таблица на коллекцию, документ хранится в колонке
 * data как JSON, плюс id целым числом. Так адаптер остаётся универсальным
 * (сущности добавляются без миграций) и полностью повторяет контракт
 * JsonDatabase. В реальной системе вместо этого были бы нормализованные
 * таблицы и SQL-фильтры — это отмечено в докладе как осознанный упрощённый выбор.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/** node:sqlite помечен как экспериментальный — предупреждение отключаем. */
const loadSqlite = () => {
    const originalEmit = process.emit;
    process.emit = function patchedEmit(name, ...args) {
        if (name === 'warning' && args[0]?.name === 'ExperimentalWarning' && /SQLite/i.test(args[0].message)) {
            return false;
        }
        return originalEmit.apply(process, [name, ...args]);
    };
    try {
        return require('node:sqlite');
    } finally {
        process.emit = originalEmit;
    }
};

class SqliteDatabase {
    #file;
    #db = null;

    constructor({ file }) {
        this.#file = file;
    }

    async init({ collections = [] } = {}) {
        fs.mkdirSync(path.dirname(this.#file), { recursive: true });

        const { DatabaseSync } = loadSqlite();
        this.#db = new DatabaseSync(this.#file);

        // WAL — стандартный режим для конкурентного чтения/записи
        this.#db.exec('PRAGMA journal_mode = WAL;');

        for (const collection of collections) {
            this.#db.exec(`
                CREATE TABLE IF NOT EXISTS "${collection}" (
                    id   INTEGER PRIMARY KEY AUTOINCREMENT,
                    data TEXT NOT NULL
                );
            `);
        }
        return this;
    }

    #table(collection) {
        // Имя таблицы подставляется только из кода (не из пользовательского ввода);
        // тем не менее экранируем кавычки — привычка безопасного программирования.
        return `"${String(collection).replace(/"/g, '""')}"`;
    }

    #rowToDoc(row) {
        return row ? { ...JSON.parse(row.data), id: Number(row.id) } : null;
    }

    async all(collection) {
        const rows = this.#db.prepare(`SELECT id, data FROM ${this.#table(collection)} ORDER BY id`).all();
        return rows.map((row) => this.#rowToDoc(row));
    }

    async find(collection, id) {
        const row = this.#db.prepare(`SELECT id, data FROM ${this.#table(collection)} WHERE id = ?`).get(Number(id));
        return this.#rowToDoc(row);
    }

    async insert(collection, doc) {
        const { id, ...rest } = doc; // id назначает сама база
        const info = this.#db
            .prepare(`INSERT INTO ${this.#table(collection)} (data) VALUES (?)`)
            .run(JSON.stringify(rest));
        return { ...rest, id: Number(info.lastInsertRowid) };
    }

    async update(collection, id, patch) {
        const current = await this.find(collection, id);
        if (!current) return null;

        const { id: _ignored, ...rest } = current;
        const merged = { ...rest, ...patch };
        this.#db
            .prepare(`UPDATE ${this.#table(collection)} SET data = ? WHERE id = ?`)
            .run(JSON.stringify(merged), Number(id));

        return { ...merged, id: Number(id) };
    }

    async remove(collection, id) {
        const info = this.#db.prepare(`DELETE FROM ${this.#table(collection)} WHERE id = ?`).run(Number(id));
        return Number(info.changes) > 0;
    }

    close() {
        this.#db?.close();
    }
}

module.exports = { SqliteDatabase };
