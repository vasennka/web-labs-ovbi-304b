#!/usr/bin/env node
/**
 * ============================================================================
 * Сборка отчёта в Word: markdown + скриншоты -> .docx
 * ============================================================================
 * Запуск: node tools/make-report-docx.js [--student="ФИО"] [--group="Группа"]
 *
 * Требует, чтобы до этого были сделаны скриншоты (отчёт/скриншоты/*.png)
 * и сформирован markdown-отчёт (tools/build-report.js).
 * ============================================================================
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildDocx } = require('./md2docx');

const root = path.resolve(__dirname, '..');
const reportDir = path.join(root, 'отчёт');
const markdownFile = path.join(reportDir, 'ОТЧЁТ-лабораторные-1-8.md');
const targetFile = path.join(reportDir, 'ОТЧЁТ-лабораторные-1-8.docx');

const arg = (name, fallback) => {
    const found = process.argv.find((a) => a.startsWith(`--${name}=`));
    return found ? found.split('=').slice(1).join('=').replace(/^"|"$/g, '') : fallback;
};

if (!fs.existsSync(markdownFile)) {
    console.error('Не найден markdown-отчёт. Сначала выполните: node tools/build-report.js');
    process.exit(1);
}

const markdown = fs.readFileSync(markdownFile, 'utf8');
const title = 'Отчёт по лабораторным работам №1–8';
const author = `${arg('student', 'Фамилия Имя Отчество')}, ${arg('group', 'группа')}`;

const buffer = buildDocx({ markdown, title, author, baseDir: reportDir });
fs.writeFileSync(targetFile, buffer);

const screenshots = fs.readdirSync(path.join(reportDir, 'скриншоты')).filter((f) => f.endsWith('.png'));
console.log(`✔ ${path.relative(root, targetFile)}  (${(buffer.length / 1024 / 1024).toFixed(2)} МБ, картинок внутри: ${screenshots.length})`);
console.log('Проверить: откройте файл в Word / LibreOffice / Google Документах.');
