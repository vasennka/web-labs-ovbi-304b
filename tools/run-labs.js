#!/usr/bin/env node
/**
 * ============================================================================
 * Запуск всех консольных лабораторных работ №1–7 одной командой.
 * ============================================================================
 *
 * Что делает:
 *   1) прогоняет laba1.js … laba7.js в отдельных процессах Node.js;
 *   2) сохраняет вывод каждой работы в текстовый файл (удобно приложить к отчёту
 *      или сделать скриншот из готового файла);
 *   3) печатает итоговую таблицу: где вывод и сколько строк.
 *
 * Запуск:  node tools/run-labs.js
 * ============================================================================
 */

'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const labs = [1, 2, 3, 4, 5, 6, 7];

console.log('='.repeat(72));
console.log('ЗАПУСК ЛАБОРАТОРНЫХ РАБОТ №1–7');
console.log('='.repeat(72));

const results = [];

for (const number of labs) {
    const file = `laba${number}.js`;
    const fullPath = path.join(root, file);

    if (!fs.existsSync(fullPath)) {
        console.log(`✘ ${file} — файл не найден`);
        results.push({ number, ok: false, lines: 0, output: null });
        continue;
    }

    // Каждую работу запускаем отдельным процессом — так одна ошибка не мешает остальным
    const started = Date.now();
    const result = spawnSync(process.execPath, [file], {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024
    });
    const elapsed = Date.now() - started;

    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    const outFile = `вывод_лаба${number}.txt`;
    fs.writeFileSync(path.join(root, outFile), output, 'utf8');

    const ok = result.status === 0;
    // Считаем только «провалы» самопроверок — строки, начинающиеся с крестика.
    // Важно: в лабораторной №6 крестик используется и внутри демонстрационных
    // сообщений («✘ не хватает денег: …»), поэтому учитываем только начало строки.
    const failedChecks = (output.match(/^✘ /gm) ?? []).length;

    console.log(
        `${ok ? '✔' : '✘'} laba${number}.js — код выхода ${result.status}, ` +
        `${output.split('\n').length} строк, ${elapsed} мс` +
        (failedChecks ? `, ВНИМАНИЕ: неуспешных проверок: ${failedChecks}` : '') +
        `\n     вывод сохранён в ${outFile}`
    );

    results.push({ number, ok, lines: output.split('\n').length, output: outFile });
}

const success = results.filter((r) => r.ok).length;
console.log('\n' + '─'.repeat(72));
console.log(`Итого: успешно ${success} из ${labs.length}.`);
console.log('Открыть любой файл с выводом можно в блокноте, например: notepad вывод_лаба1.txt');
console.log('Дальше: лабораторная №8 (сервер) — запустите «Запустить лабу 8 (сервер).cmd»');
console.log('─'.repeat(72));

process.exit(success === labs.length ? 0 : 1);
