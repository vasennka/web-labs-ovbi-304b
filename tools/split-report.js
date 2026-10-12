#!/usr/bin/env node
/**
 * ============================================================================
 * Разделение общего отчёта на 8 отдельных документов (по одной лабораторной).
 * ============================================================================
 *
 * Берёт готовый markdown-отчёт «отчёт/ОТЧЁТ-лабораторные-1-8.md» и разрезает
 * его по заголовкам «## Лабораторная работа №N». Для каждой работы собирается
 * свой документ Word с отдельным титульным листом:
 *
 *     ОТЧЁТЫ-по-лабораторным\Отчёт по лабораторной работе 1.docx
 *     ...
 *     ОТЧЁТЫ-по-лабораторным\Отчёт по лабораторной работе 8.docx
 *
 * Запуск:
 *     node tools/split-report.js
 *     node tools/split-report.js --student="Суббота Василий Владимирович" --group="ОВБИ-304б"
 * ============================================================================
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildDocx } = require('./md2docx');

const root = path.resolve(__dirname, '..');
const reportDir = path.join(root, 'отчёт');
const outDir = path.join(root, 'ОТЧЁТЫ-по-лабораторным');
const sourceFile = path.join(reportDir, 'ОТЧЁТ-лабораторные-1-8.md');

const arg = (name, fallback) => {
    const found = process.argv.find((a) => a.startsWith(`--${name}=`));
    return found ? found.split('=').slice(1).join('=').replace(/^"|"$/g, '') : fallback;
};

/** Данные титульного листа берём из общего отчёта, если не передали ключами. */
function readTitleData(markdown) {
    const value = (pattern, fallback) => markdown.match(pattern)?.[1]?.trim() ?? fallback;
    return {
        subject: value(/по дисциплине «([^»]+)»/, arg('subject', 'Проектирование веб-сайтов')),
        student: arg('student', value(/\*\*Выполнил:\*\*\s*(.+)/, 'Фамилия Имя Отчество')),
        group: arg('group', value(/\*\*Группа:\*\*\s*(.+)/, 'Группа')),
        teacher: arg('teacher', value(/\*\*Проверил:\*\*\s*(.+)/, '______________________')),
        year: new Date().getFullYear()
    };
}

if (!fs.existsSync(sourceFile)) {
    console.error('Не найден общий отчёт. Сначала выполните: node tools/rebuild-report.js');
    process.exit(1);
}

const markdown = fs.readFileSync(sourceFile, 'utf8');
const title = readTitleData(markdown);

// --- 1. Разрезаем markdown по заголовкам лабораторных работ -----------------
const heading = /^## Лабораторная работа №(\d+)\.(.*)$/gm;
const sections = [];
let match;
while ((match = heading.exec(markdown)) !== null) {
    sections.push({
        number: Number(match[1]),
        title: match[2].trim(),
        bodyStart: heading.lastIndex
    });
}

if (sections.length === 0) {
    console.error('В отчёте не найдены разделы «## Лабораторная работа №N»');
    process.exit(1);
}

sections.forEach((section, index) => {
    const next = sections[index + 1];
    section.rawBody = markdown.slice(section.bodyStart, next ? next.bodyStart - ('## Лабораторная работа №' + next.number + '.').length : markdown.length);
});

fs.mkdirSync(outDir, { recursive: true });

const created = [];

for (const section of sections) {
    // Убираем хвостовой разделитель и лишние пустые строки
    let body = section.rawBody.replace(/^[\s\S]*?\n\n/, '\n').replace(/\n---\s*$/, '').trim();

    // Перенумеровываем рисунки внутри отдельного документа (Рис. 1, 2, 3…)
    let figure = 0;
    body = body.replace(/Рис\.\s*\d+\./g, () => `Рис. ${++figure}.`);

    const document = [
        `# ОТЧЁТ по лабораторной работе №${section.number}`,
        '',
        `по дисциплине «${title.subject}»`,
        '',
        `**Выполнил:** ${title.student}`,
        '',
        `**Группа:** ${title.group}`,
        '',
        `**Проверил:** ${title.teacher}`,
        '',
        `**Год:** ${title.year}`,
        '',
        '---',
        '',
        `## ${section.title}`,
        '',
        body,
        ''
    ].join('\n');

    const fileName = `Отчёт по лабораторной работе ${section.number}.docx`;
    const target = path.join(outDir, fileName);
    const buffer = buildDocx({
        markdown: document,
        title: `Отчёт по лабораторной работе №${section.number}`,
        author: `${title.student}, ${title.group}`,
        baseDir: reportDir
    });

    fs.writeFileSync(target, buffer);
    created.push({ fileName, size: buffer.length, figures: figure });
    console.log(`✔ ${fileName.padEnd(38)} ${(buffer.length / 1024).toFixed(0)} КБ, рисунков: ${figure}, тема: «${section.title.slice(0, 60)}…»`);
}

fs.writeFileSync(
    path.join(outDir, 'титульные-данные.json'),
    JSON.stringify({ ...title, generatedAt: new Date().toISOString() }, null, 2),
    'utf8'
);

console.log(`\nГотово: ${created.length} документов в папке «${path.basename(outDir)}»`);
console.log('Открыть папку: explorer "ОТЧЁТЫ-по-лабораторным"');
