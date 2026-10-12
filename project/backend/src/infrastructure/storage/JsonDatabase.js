/**
 * СЛОЙ INFRASTRUCTURE: файловая база (JSON).
 *
 * Это адаптер, реализующий «порт хранения»: набор коллекций в одном JSON-файле.
 * Требование ТЗ — «данные загружать из файла или из базы данных» — закрывается
 * именно здесь: по умолчанию драйвер json, но тот же интерфейс реализует
 * SqliteDatabase, и вся бизнес-логика продолжает работать без изменений.
 *
 * Почему не «просто require('./db.json')»:
 *   - нужны записи (insert/update/remove), а не только чтение;
 *   - нужна атомарность: пишем во временный файл и переименовываем, чтобы при
 *     падении процесса база не осталась «полузаписанной»;
 *   - нужна очередь записи: два параллельных запроса не должны затереть друг друга.
 */

'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

class JsonDatabase {
    #file;
    #data = {};
    #writeQueue = Promise.resolve();
    #nextIds = {};

    /** @param {{ file: string }} options */
    constructor({ file }) {
        this.#file = file;
    }

    /** Читает файл (или создаёт пустой) и готовит структуру коллекций. */
    async init({ collections = [] } = {}) {
        await fsp.mkdir(path.dirname(this.#file), { recursive: true });

        if (fs.existsSync(this.#file)) {
            this.#data = JSON.parse(await fsp.readFile(this.#file, 'utf8'));
        } else {
            this.#data = {};
        }

        for (const collection of collections) {
            if (!Array.isArray(this.#data[collection])) this.#data[collection] = [];
        }

        // Вычисляем следующий id для каждой коллекции (целые возрастающие номера)
        for (const collection of Object.keys(this.#data)) {
            this.#nextIds[collection] =
                this.#data[collection].reduce((max, doc) => Math.max(max, Number(doc.id) || 0), 0) + 1;
        }

        await this.#persist();
        return this;
    }

    /** Все документы коллекции (копии — чтобы никто не мутировал «базу» извне). */
    async all(collection) {
        return structuredClone(this.#data[collection] ?? []);
    }

    async find(collection, id) {
        const found = (this.#data[collection] ?? []).find((doc) => doc.id === Number(id));
        return found ? structuredClone(found) : null;
    }

    async insert(collection, doc) {
        if (!Array.isArray(this.#data[collection])) this.#data[collection] = [];
        const id = this.#nextIds[collection] ?? 1;
        this.#nextIds[collection] = id + 1;

        const stored = { ...structuredClone(doc), id };
        this.#data[collection].push(stored);
        await this.#persist();
        return structuredClone(stored);
    }

    async update(collection, id, patch) {
        const list = this.#data[collection] ?? [];
        const index = list.findIndex((doc) => doc.id === Number(id));
        if (index === -1) return null;

        list[index] = { ...list[index], ...structuredClone(patch), id: list[index].id };
        await this.#persist();
        return structuredClone(list[index]);
    }

    async remove(collection, id) {
        const list = this.#data[collection] ?? [];
        const index = list.findIndex((doc) => doc.id === Number(id));
        if (index === -1) return false;

        list.splice(index, 1);
        await this.#persist();
        return true;
    }

    /** Запись всего файла в конец очереди (защита от «гонок»). */
    #persist() {
        this.#writeQueue = this.#writeQueue.then(async () => {
            const tmp = `${this.#file}.tmp`;
            await fsp.writeFile(tmp, JSON.stringify(this.#data, null, 2), 'utf8');
            await fsp.rename(tmp, this.#file); // атомарная замена
        });
        return this.#writeQueue;
    }
}

module.exports = { JsonDatabase };
