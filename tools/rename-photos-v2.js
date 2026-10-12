#!/usr/bin/env node
/**
 * Версионирование заменённых фотографий (cache busting).
 *
 * Проблема: имена файлов не менялись, поэтому браузер продолжал показывать
 * старые снимки из своего кеша, хотя на диске уже новые.
 * Решение: заменённые файлы получают суффикс «-2», а ссылки в коде
 * обновляются автоматически. Это стандартный приём в веб-разработке:
 * при изменении картинки меняется её URL.
 *
 * Запуск: node tools/rename-photos-v2.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const photosDir = path.join(root, 'project', 'backend', 'public', 'demo-photos');

/** Какие файлы переименовываем (заменённые снимки). */
const RENAMED = [
    'about-studio',
    'about-team',
    'contacts-studio',
    'gallery-portrait-2',
    'gallery-portrait-3',
    'gallery-studio-1',
    'news-4'
];

// --- 1. Переименовываем файлы ---------------------------------------------
const mapping = [];

for (const name of RENAMED) {
    const from = path.join(photosDir, `${name}.jpg`);
    const to = path.join(photosDir, `${name}-2.jpg`);

    if (fs.existsSync(from)) {
        fs.renameSync(from, to);
        mapping.push([`/demo-photos/${name}.jpg`, `/demo-photos/${name}-2.jpg`]);
        console.log(`✔ ${name}.jpg -> ${name}-2.jpg`);
    } else if (fs.existsSync(to)) {
        mapping.push([`/demo-photos/${name}.jpg`, `/demo-photos/${name}-2.jpg`]);
        console.log(`= ${name}-2.jpg уже переименован`);
    } else {
        console.log(`✘ ${name}.jpg не найден`);
    }
}

if (mapping.length === 0) {
    console.log('\nНечего переименовывать.');
    process.exit(0);
}

// --- 2. Обновляем ссылки в коде проекта ------------------------------------
const extensions = ['.js', '.jsx', '.ejs', '.css'];
const skipDirs = ['node_modules', 'dist', '.git', 'data'];
let touched = 0;

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skipDirs.includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full);
            continue;
        }
        if (!extensions.includes(path.extname(entry.name))) continue;

        const original = fs.readFileSync(full, 'utf8');
        let updated = original;

        for (const [from, to] of mapping) {
            updated = updated.split(from).join(to);
        }

        if (updated !== original) {
            fs.writeFileSync(full, updated, 'utf8');
            touched++;
            console.log(`  обновлены ссылки: ${path.relative(root, full)}`);
        }
    }
}

console.log('\nОбновляем ссылки в коде:');
walk(path.join(root, 'project'));

console.log(`\nФайлов изменено: ${touched}`);
console.log('Дальше: npm --prefix project run build  и пересоздать базу (npm --prefix project/backend run seed)');
