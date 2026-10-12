#!/usr/bin/env node
/**
 * ============================================================================
 * Пересборка отчёта «в один шаг»: титульный лист + markdown + Word.
 * ============================================================================
 *
 * Запуск (из корня папки с работами):
 *
 *   node tools/rebuild-report.js --student="Иванов Иван Иванович" ^
 *                                --group="ПИ-21" ^
 *                                --teacher="Петров Пётр Петрович" ^
 *                                --subject="Проектирование и разработка веб-приложений"
 *
 * Скриншоты уже лежат в папке «отчёт/скриншоты» — они просто переиспользуются.
 * Готовый документ копируется в корень под понятным именем.
 * ============================================================================
 */

'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const reportDir = path.join(root, 'отчёт');
const docxInReport = path.join(reportDir, 'ОТЧЁТ-лабораторные-1-8.docx');
const docxForTeacher = path.join(root, 'ОТЧЁТ по лабораторным работам 1-8 (для сдачи).docx');

// Пробрасываем только наши ключи (по умолчанию — заглушки)
const names = ['student', 'group', 'teacher', 'subject'];
const passed = Object.fromEntries(
    process.argv.slice(2)
        .filter((a) => a.startsWith('--'))
        .map((a) => {
            const [key, ...rest] = a.replace(/^--/, '').split('=');
            return [key, rest.join('=').replace(/^"|"$/g, '')];
        })
);

const args = names
    .filter((name) => passed[name])
    .map((name) => `--${name}=${passed[name]}`);

console.log('Пересборка отчёта с данными:');
names.forEach((n) => console.log(`  ${n.padEnd(8)}: ${passed[n] ?? '—'}`));
console.log('');

// Шаг 1: markdown-отчёт (и HTML-страницы для будущих скриншотов)
const build = spawnSync(process.execPath, [path.join(__dirname, 'build-report.js'), ...args], {
    cwd: root,
    stdio: 'inherit'
});
if (build.status !== 0) process.exit(build.status ?? 1);

// Шаг 2: Word
const docx = spawnSync(process.execPath, [path.join(__dirname, 'make-report-docx.js'), ...args], {
    cwd: root,
    stdio: 'inherit'
});
if (docx.status !== 0) process.exit(docx.status ?? 1);

// Шаг 3: копия в корень под понятным именем
if (fs.existsSync(docxInReport)) {
    fs.copyFileSync(docxInReport, docxForTeacher);
    console.log(`\n✔ Копия для сдачи: ${path.basename(docxForTeacher)}`);
}
