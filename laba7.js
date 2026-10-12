/**
 * ============================================================================
 * ЛАБОРАТОРНАЯ РАБОТА №7
 * Тема: Node.js: события (EventEmitter) и потоки (streams).
 * Файл: laba7.js
 * Запуск: node laba7.js
 * ============================================================================
 *
 * ТЕОРИЯ КРАТКО:
 *   EventEmitter — «шина событий»: объект подписывается на имена событий (on/once),
 *   кто-то генерирует их (emit). Всё асинхронное в Node построено на этом:
 *   сокеты, потоки, процессы, HTTP-сервер.
 *   Поток (stream) — обработка данных ПОРЦИЯМИ (chunk), без загрузки в память целиком.
 *   Типы: Readable (fs.createReadStream), Writable (fs.createWriteStream),
 *   Duplex (сеть) и Transform (читает -> преобразует -> отдаёт дальше, zlib.createGzip).
 *   pipe() соединяет потоки, но НЕ сообщает об ошибке в промежуточных звеньях;
 *   pipeline() (для promise-версии: node:stream/promises) корректно чист
 *   открытые потоки и пробрасывает ошибку из ЛЮБОГО звена.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { Transform, Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { spawnSync } = require('node:child_process');
const EventEmitter = require('node:events');

const DATA_DIR = path.join(__dirname, 'laba7', 'data');
const INPUT_FILE = path.join(DATA_DIR, 'input.txt');
const COPY_FILE = path.join(DATA_DIR, 'copy.txt');
const RESULT_FILE = path.join(DATA_DIR, 'result.txt');

const line = (t) => console.log('\n=== ' + t + ' ===');

/* =========================================================================
 * ПОДГОТОВКА: создаём входной текстовый файл
 * ========================================================================= */

fs.mkdirSync(DATA_DIR, { recursive: true });

const sourceText = [
    'Node.js — это среда выполнения JavaScript на сервере.',
    'Потоки позволяют читать файл кусками (chunk) по 16 байт.',
    'Transform-поток переводит текст в верхний регистр.',
    'EventEmitter рассылает события подписчикам.',
    'Конец файла: последняя строка.'
].join('\n');

fs.writeFileSync(INPUT_FILE, sourceText, 'utf8');

line('Подготовка');
console.log('создан файл:', INPUT_FILE);
console.log('размер файла:', fs.statSync(INPUT_FILE).size, 'байт');
console.log('содержимое:');
console.log(sourceText.split('\n').map(s => '  | ' + s).join('\n'));

/* =========================================================================
 * ЗАДАНИЕ 1. Свой EventEmitter: класс Counter
 * ========================================================================= */

class Counter extends EventEmitter {
    /**
     * @param {number} max — при достижении этого значения генерируется "limit"
     */
    constructor(max = 3) {
        super();
        this.value = 0;
        this.max = max;
        this.limitReached = false;
    }

    /**
     * Увеличивает значение на 1 и генерирует события:
     *   "change" — всегда при успешном увеличении (аргументы: новое значение, счетчик)
     *   "limit"  — один раз, когда значение достигло максимума
     *   "error"  — при попытке увеличить после достижения максимума
     */
    increment() {
        // После лимита дальнейшие вызовы — ошибка
        if (this.limitReached) {
            // ВАЖНО: событие "error" особенное. Если на него НЕТ обработчика,
            // Node выбрасывает исключение и (без try/catch) роняет процесс.
            this.emit('error', new RangeError(`Лимит ${this.max} уже достигнут, дальше увеличивать нельзя`));
            return this.value;
        }

        this.value += 1;
        this.emit('change', this.value);        // подписчики узнают о новом значении

        if (this.value >= this.max) {
            this.limitReached = true;
            this.emit('limit', this.max);       // сработает ровно один раз (подписка once)
        }

        return this.value;
    }
}

line('Задание 1. EventEmitter: класс Counter');

const counter = new Counter(3);

// Подписка на "change" через on — сработает столько раз, сколько есть событий
counter.on('change', (value) => console.log(`  [change] новое значение: ${value}`));

// Подписка на "limit" через once — сработает ровно ОДИН раз (даже если emit повторить)
counter.once('limit', (max) => console.log(`  [limit]  достигнут максимум: ${max} (обработчик once)`));

// Обязательный обработчик "error" — иначе emit('error') бросит исключение
counter.on('error', (err) => console.log(`  [error]  ${err.name}: ${err.message}`));

console.log('вызываем increment() 5 раз при max = 3:');
for (let i = 1; i <= 5; i++) {
    const result = counter.increment();
    console.log(`  вызов #${i} -> value = ${result}`);
}
console.log('итог: value =', counter.value, '| слушателей "change" =', counter.listenerCount('change'));

// Демонстрация once «вручную»: повторный emit('limit') больше не вызовет обработчик
counter.emit('limit', counter.max);
console.log('повторный emit("limit") — обработчик once больше не сработал (в выводе строки [limit] нет)');

// Снятие подписки: off()/removeListener()
const tempHandler = () => console.log('  (временный обработчик, его снимут)');
counter.on('change', tempHandler);
counter.off('change', tempHandler);            // современный синоним removeListener
console.log('после off() слушателей "change" =', counter.listenerCount('change'));

/* --- Что будет, если УБРАТЬ обработчик события "error"? --------------------
 * Проверяем в ОТДЕЛЬНОМ процессе, чтобы не уронить текущий скрипт:
 * без обработчика emit('error') приводит к необработанному исключению
 * и завершению процесса с ненулевым кодом (ERR_UNHANDLED_ERROR). */
line('Задание 1 (проверка). Что если убрать обработчик "error"?');

const childCode = `
const EventEmitter = require('node:events');
class Counter extends EventEmitter {
  constructor(max) { super(); this.value = 0; this.max = max; }
  increment() { this.emit('error', new Error('лимит достигнут, а обработчика нет')); }
}
const c = new Counter(1);
c.on('change', () => {});
console.log('   процесс: подписка только на "change", обработчика "error" НЕТ');
c.increment();
console.log('   процесс: эта строка уже не выполнится');
`;

const child = spawnSync(process.execPath, ['-e', childCode], { encoding: 'utf8' });
console.log(child.stdout.trimEnd());
console.log('код завершения дочернего процесса:', child.status);
console.log('stderr (обрезано):', child.stderr.split('\n').slice(0, 4).join(' ').trim());
console.log('\nВЫВОД: событие "error" — специальное. Если на него нет ни одного слушателя,');
console.log('Node превращает emit("error") в исключение. Правильно: ВСЕГДА вешать');
console.log('emitter.on("error", handler) или оборачивать emit в try/catch.');

// Ловим ту же ситуацию через try/catch в текущем процессе
const noErrorHandler = new EventEmitter();
try {
    noErrorHandler.emit('error', new Error('проверка перехвата'));
} catch (err) {
    console.log('emit("error") без обработчика пойман try/catch ->', err.name + ':', err.message);
}

/* =========================================================================
 * ЗАДАНИЕ 2. Чтение и копирование файла потоками
 * ========================================================================= */

line('Задание 2. fs.createReadStream с highWaterMark: 16');

const readWithStream = () =>
    new Promise((resolve, reject) => {
        let chunkNumber = 0;
        let totalChars = 0;
        const chunks = [];

        const stream = fs.createReadStream(INPUT_FILE, {
            encoding: 'utf8',      // декодирует байты в строку автоматически
            highWaterMark: 16      // размер одного куска = 16 байт (по умолчанию 64 КБ)
        });

        stream.on('data', (chunk) => {
            chunkNumber += 1;
            totalChars += chunk.length;
            chunks.push(chunk);
            // Показываем \n, чтобы было видно, где заканчивается строка
            console.log(`  chunk #${String(chunkNumber).padStart(2, '0')} (${String(chunk.length).padStart(2, '0')} симв.): ${JSON.stringify(chunk)}`);
        });

        stream.on('end', () => {
            console.log(`  --- событие "end": файл прочитан ---`);
            console.log(`  всего кусков: ${chunkNumber}`);
            console.log(`  всего символов: ${totalChars}`);
            console.log(`  размер файла на диске: ${fs.statSync(INPUT_FILE).size} байт`);
            console.log(`  склеенный текст совпадает с исходным: ${chunks.join('') === sourceText}`);
            resolve({ chunkNumber, totalChars });
        });

        stream.on('error', (err) => {
            console.error('  --- событие "error" ---');
            reject(err);
        });
    });

(async () => {
    await readWithStream();

    /* ВАЖНАЯ ДЕТАЛЬ про кириллицу: highWaterMark считается в БАЙТАХ, а буква
     * кириллицы в UTF-8 занимает 2 байта. Поэтому куски по 16 байт «режутся»
     * не по границам строк. При encoding: 'utf8' встроенный StringDecoder
     * аккуратно собирает многобайтовые символы, и текст не «ломается». */

    // --- Проверка обработки ошибки: несуществующий файл ---------------------
    line('Задание 2 (проверка). Чтение несуществующего файла');

    await new Promise((resolve) => {
        const bad = fs.createReadStream(path.join(DATA_DIR, 'no-such-file.txt'));
        bad.on('data', () => {});
        bad.on('error', (err) => {
            console.log('  событие "error" перехвачено ->');
            console.log('  err.code =', err.code, '| err.name =', err.name);
            console.log('  err.message =', err.message);
            resolve();
        });
    });

    // --- Копирование через pipe() ------------------------------------------
    line('Задание 2 (продолжение). Копирование файла через pipe()');

    const source = fs.createReadStream(INPUT_FILE);
    const destination = fs.createWriteStream(COPY_FILE);

    // pipe() соединяет потоки: данные идут сами, без ручного on('data')
    source.pipe(destination);

    // Событие 'finish' у WriteStream означает, что все данные записаны
    await once(destination, 'finish');
    console.log('  файл скопирован в', COPY_FILE);

    const original = fs.readFileSync(INPUT_FILE, 'utf8');
    const copy = fs.readFileSync(COPY_FILE, 'utf8');
    console.log('  размеры:', fs.statSync(INPUT_FILE).size, 'и', fs.statSync(COPY_FILE).size, 'байт');
    console.log('  содержимое совпадает:', original === copy);
    console.log('  sha256 совпадают:',
        require('node:crypto').createHash('sha256').update(original).digest('hex') ===
        require('node:crypto').createHash('sha256').update(copy).digest('hex'));

    /* Про pipe() важно помнить: он НЕ пробрасывает ошибку из середины цепочки
     * в конец, поэтому «идеальный» вариант — pipeline() (см. задание 3). */

    /* =====================================================================
     * ЗАДАНИЕ 3. Transform-поток и pipeline
     * ===================================================================== */

    line('Задание 3. Transform: верхний регистр + подсчёт символов');

    /* ВАЖНАЯ ЛОВУШКА, которую нужно здесь разобрать.
     * highWaterMark считается в БАЙТАХ, а буква «й» или «ё» в UTF-8 занимает
     * 2 байта. Значит, граница куска может попасть ВНУТРЬ символа. Если вызвать
     * chunk.toString() на таком обрубке, последний байт превратится в
     * U+FFFD — знак замены «�», и символ потеряется.
     * Ниже мы специально запускаем «наивный» Transform, чтобы увидеть баг,
     * а затем — корректный вариант со StringDecoder. */

    // --- 3.1 «НАИВНЫЙ» Transform: chunk.toString() без учёта границ ---------
    function createNaiveUpperTransform() {
        let processedChars = 0;
        const transform = new Transform({
            transform(chunk, _encoding, callback) {
                const text = chunk.toString();       // <-- теряет многобайтовые символы на стыке
                processedChars += text.length;
                callback(null, text.toUpperCase());
            }
        });
        Object.defineProperty(transform, 'processedChars', { get: () => processedChars });
        return transform;
    }

    /** КОРРЕКТНЫЙ Transform: StringDecoder достраивает «разрезанные» символы. */
    function createUpperCounterTransform() {
        const { StringDecoder } = require('node:string_decoder');
        const decoder = new StringDecoder('utf8');   // буферизует неполные последовательности
        let processedChars = 0;

        const transform = new Transform({
            transform(chunk, _encoding, callback) {
                // decoder.write() возвращает только ПОЛНЫЕ символы и хранит
                // «хвост» до следующего куска
                const text = decoder.write(chunk);
                processedChars += text.length;
                // Первый аргумент callback — ошибка (null = ошибки нет),
                // второй — данные, которые уйдут дальше по цепочке
                callback(null, text.toUpperCase());
            },
            // flush вызывается в самом конце — отдаём остаток из буфера декодера
            flush(callback) {
                const tail = decoder.end();
                if (tail) {
                    processedChars += tail.length;
                    callback(null, tail.toUpperCase());
                } else {
                    callback(null);
                }
            }
        });

        // Object.defineProperty — «приклеиваем» счётчик к потоку для чтения снаружи
        Object.defineProperty(transform, 'processedChars', { get: () => processedChars });

        return transform;
    }

    const NAIVE_FILE = path.join(DATA_DIR, 'result-naive.txt');

    const naive = createNaiveUpperTransform();
    await pipeline(
        fs.createReadStream(INPUT_FILE, { highWaterMark: 16 }), // БЕЗ encoding -> приходят Buffer'ы
        naive,
        fs.createWriteStream(NAIVE_FILE)
    );
    console.log('  [наивный Transform] обработано символов:', naive.processedChars, '(а должно быть 236!)');
    console.log('  [наивный Transform] видны «порванные» символы:');
    console.log('    ' + fs.readFileSync(NAIVE_FILE, 'utf8').split('\n')[0]);
    console.log('    ^ «�» = U+FFFD: байт символа потерялся на границе куска');
    console.log('  ВЫВОД: нельзя декодировать Buffer по частям через toString() вручную.');

    // --- 3.2 КОРРЕКТНО: pipeline с StringDecoder ----------------------------
    const upper = createUpperCounterTransform();
    try {
        await pipeline(
            // Вариант A (самый простой): попросить поток самому декодировать текст
            // fs.createReadStream(INPUT_FILE, { encoding: 'utf8', highWaterMark: 16 }),
            // Вариант B (универсальный, применяем здесь): Transform со StringDecoder,
            // он работает и с бинарными данными, и с текстом.
            fs.createReadStream(INPUT_FILE, { highWaterMark: 16 }),
            upper,
            fs.createWriteStream(RESULT_FILE)
        );
        console.log('\n  pipeline завершён: текст в верхнем регистре записан в result.txt');
        console.log('  обработано символов:', upper.processedChars, '(совпадает с 236 -> символы не потеряны)');
        console.log('  первые 2 строки результата:');
        console.log(
            fs.readFileSync(RESULT_FILE, 'utf8').split('\n').slice(0, 2)
                .map(s => '    ' + s).join('\n')
        );
    } catch (err) {
        console.error('  pipeline упал:', err.message);
    }

    // --- 3.2 Обработка ошибки в pipeline: несуществующий входной файл -------
    line('Задание 3 (проверка). Ошибка в pipeline (нет входного файла)');

    try {
        await pipeline(
            fs.createReadStream(path.join(DATA_DIR, 'нет-такого-файла.txt')),
            createUpperCounterTransform(),
            fs.createWriteStream(path.join(DATA_DIR, 'never-created.txt'))
        );
        console.log('  эта строка не выполнится');
    } catch (err) {
        console.log('  pipeline поймал ошибку в try/catch ->');
        console.log('  err.code =', err.code, '| err.message =', err.message);
        // pipeline гарантирует, что все потоки уничтожены; убедимся, что мусора не осталось
        fs.rmSync(path.join(DATA_DIR, 'never-created.txt'), { force: true });
        console.log('  (пустой файл-приёмник удалён — pipeline корректно закрыл потоки)');
    }

    /* ПОЧЕМУ pipeline, А НЕ pipe:
     *   pipe() не сообщает об ошибке в промежуточных потоках и не закрывает
     *   остальные звенья -> утечка дескрипторов, «зависшие» записи.
     *   pipeline() при ошибке в ЛЮБОМ звене уничтожает все потоки и пробрасывает
     *   ошибку в await/колбэк. Для продакшена — только pipeline. */

    // --- 3.3 Вывод в консоль вместо файла (process.stdout) ------------------
    line('Задание 3 (дополнительно). Вывод в process.stdout вместо файла');

    await pipeline(
        fs.createReadStream(INPUT_FILE, { highWaterMark: 16 }),
        createUpperCounterTransform(),
        process.stdout       // Writable-поток консоли
    );
    console.log('\n  (^ это тот же Transform, но результат ушёл в консоль, а не в файл)');

    // --- 3.4 Бонус: собственный Readable «на лету» + Transform + сбор в память
    line('Бонус. Readable из массива строк + Transform + Writable-сборщик');

    const generator = Readable.from(['раз, ', 'два, ', 'три\n']); // Readable из итерируемого
    const collect = new Transform({
        transform(chunk, _enc, cb) {
            cb(null, chunk.toString().toUpperCase());
        }
    });

    let collected = '';
    const sink = new (require('node:stream').Writable)({
        write(chunk, _enc, cb) {
            collected += chunk.toString();
            cb();
        }
    });

    await pipeline(generator, collect, sink);
    console.log('  Readable.from -> Transform -> Writable:', JSON.stringify(collected));

    // --- Итоговая проверка всех файлов --------------------------------------
    line('Итог задания: файлы в папке laba7/data');
    for (const file of fs.readdirSync(DATA_DIR)) {
        const stat = fs.statSync(path.join(DATA_DIR, file));
        console.log(`  ${file.padEnd(22)} ${String(stat.size).padStart(4)} байт`);
    }

    /* ==========================================================================
     * ВЫВОДЫ ПО РАБОТЕ (для устной защиты)
     * ==========================================================================
     * 1) EventEmitter — реализация паттерна «наблюдатель»: on/once/off для
     *    подписки, emit для генерации события, listenerCount/removeAllListeners
     *    для управления.
     * 2) Событие "error" особенное: без слушателя emit('error') бросает исключение
     *    и роняет процесс (проверено в задании 1 в отдельном процессе).
     * 3) Потоки обрабатывают данные порциями: файл в 10 ГБ можно скопировать,
     *    не заняв 10 ГБ памяти. Размер порции для файлов задаёт highWaterMark.
     * 4) События потока Readable: 'data' (кусок), 'end' (данные закончились),
     *    'error', 'close'. У Writable: 'finish' (всё записано), 'error', 'close'.
     *    'end' и 'finish' — РАЗНЫЕ события: 'end' — читать больше нечего,
     *    'finish' — запись завершена и сброшена на диск.
     * 5) pipe() прост, но не управляет ошибками; pipeline() — безопасный вариант
     *    (при ошибке уничтожает все звенья и сообщает о проблеме).
     * 6) При чтении текста ставьте encoding: 'utf8': поток сам склеит многобайтные
     *    символы (StringDecoder), иначе кириллица «порвётся» на границе кусков.
     * 7) Backpressure: если читатель быстрее писателя, поток приостанавливается —
     *    именно поэтому ручной сбор всех кусков в массив (как в задании 2)
     *    для больших файлов использовать нельзя.
     * ======================================================================= */

    console.log('\n=== Лабораторная работа №7 завершена ===');
})().catch((err) => {
    console.error('Критическая ошибка:', err);
    process.exitCode = 1;
});
