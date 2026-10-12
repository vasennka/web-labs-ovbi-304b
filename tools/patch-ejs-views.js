#!/usr/bin/env node
/**
 * Небольшая правка шаблонов EJS: содержимое страниц оборачиваем в контейнер
 * .wrap (ограничивает ширину и добавляет поля), а «шапку-обложку» на главной
 * оставляем во всю ширину экрана.
 *
 * Запуск: node tools/patch-ejs-views.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const viewsDir = path.resolve(
    __dirname, '..', 'project', 'backend', 'src', 'presentation', 'views', 'site'
);

const HEADER = "<%- include('../partials/site-header') %>";
const FOOTER = "<%- include('../partials/site-footer') %>";
const OPEN = '<div class="wrap">';
const CLOSE = '</div>';

/** Страницы, где контейнер нужен вокруг всего содержимого. */
const SIMPLE_PAGES = ['gallery.ejs', 'news.ejs', 'news-item.ejs', 'about.ejs', 'contacts.ejs'];

// --- Проверяем и при необходимости оборачиваем содержимое в .wrap ---------
console.log('Шаг 1. Оборачиваем содержимое в контейнер .wrap');
for (const file of SIMPLE_PAGES) {
    const full = path.join(viewsDir, file);
    if (!fs.existsSync(full)) {
        console.log(`✘ нет файла ${file}`);
        continue;
    }

    let text = fs.readFileSync(full, 'utf8');

    // Уже обёрнуто? Тогда ничего не делаем (скрипт можно запускать повторно)
    if (text.includes(OPEN)) {
        console.log(`= ${file}: контейнер уже есть`);
        continue;
    }

    text = text.replace(HEADER, `${HEADER}\n\n${OPEN}`);
    text = text.replace(FOOTER, `${CLOSE}\n\n${FOOTER}`);

    fs.writeFileSync(full, text, 'utf8');
    console.log(`✔ ${file}: содержимое обёрнуто в ${OPEN}`);
}

// --- Главная: контейнер начинается ПОСЛЕ обложки (hero) --------------------
const homeFile = path.join(viewsDir, 'home.ejs');
if (fs.existsSync(homeFile)) {
    let text = fs.readFileSync(homeFile, 'utf8');

    if (text.includes(OPEN)) {
        console.log('= home.ejs: контейнер уже есть');
    } else {
        // Конец обложки — первый </section>, который закрывает <section class="hero">
        const heroStart = text.indexOf('<section class="hero">');
        const heroEnd = text.indexOf('</section>', heroStart);

        if (heroStart === -1 || heroEnd === -1) {
            console.log('✘ home.ejs: не найдена секция .hero');
        } else {
            const insertAt = heroEnd + '</section>'.length;
            text = text.slice(0, insertAt) + `\n\n${OPEN}` + text.slice(insertAt);
            text = text.replace(FOOTER, `${CLOSE}\n\n${FOOTER}`);
            fs.writeFileSync(homeFile, text, 'utf8');
            console.log(`✔ home.ejs: обложка во всю ширину, остальное внутри ${OPEN}`);
        }
    }
}

// --- Проверка сбалансированности тегов div по файлам ----------------------
console.log('\nПроверка:');
for (const file of [...SIMPLE_PAGES, 'home.ejs']) {
    const full = path.join(viewsDir, file);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, 'utf8');
    const opened = (text.match(/<div\b/g) ?? []).length;
    const closed = (text.match(/<\/div>/g) ?? []).length;
    const state = opened === closed ? 'ok' : `НЕ СОВПАДАЕТ (${opened} открыто, ${closed} закрыто)`;
    console.log(`  ${file.padEnd(16)} div: ${opened}/${closed} — ${state}`);
}
