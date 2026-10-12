#!/usr/bin/env node
/**
 * Разовое исправление: страницы «О студии» и «Контакты» используют
 * двухколоночную сетку (.two-col), поэтому им нужны ДВА закрывающих </div>:
 * один для сетки и один для контейнера .wrap. Здесь восстанавливаем потерянный.
 *
 * Запуск: node tools/fix-two-col-views.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const dir = path.resolve(__dirname, '..', 'project', 'backend', 'src', 'presentation', 'views', 'site');
const PAGES = ['about.ejs', 'contacts.ejs'];

for (const file of PAGES) {
    const full = path.join(dir, file);
    let text = fs.readFileSync(full, 'utf8');

    const before = (text.match(/<div\b/g) ?? []).length;
    const beforeClose = (text.match(/<\/div>/g) ?? []).length;

    if (before === beforeClose) {
        console.log(`= ${file}: всё в порядке (${before}/${beforeClose})`);
        continue;
    }

    // Добавляем закрытие контейнера .wrap прямо перед подключением подвала
    text = text.replace(
        /(<\/aside>\s*<\/div>)(\s*)(<%- include\('\.\.\/partials\/site-footer'\) %>)/,
        '$1\n</div>$2$3'
    );

    fs.writeFileSync(full, text, 'utf8');

    const opened = (text.match(/<div\b/g) ?? []).length;
    const closed = (text.match(/<\/div>/g) ?? []).length;
    console.log(`✔ ${file}: div ${opened}/${closed} — ${opened === closed ? 'ok' : 'ВСЁ ЕЩЁ НЕ СОВПАДАЕТ'}`);
}
