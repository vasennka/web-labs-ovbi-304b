#!/usr/bin/env node
/**
 * Замена неудачных демонстрационных фото.
 * Поиск идёт по Openverse с фильтром по источнику Wikimedia Commons
 * (там файлы отдаются без ограничения частоты) и с проверкой размера.
 *
 * Запуск: node tools/replace-demo-photos.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const outDir = path.resolve(__dirname, '..', 'project', 'backend', 'public', 'demo-photos');
const UA = 'PRISMA-study-project/1.0 (educational)';

/** Что заменяем и на что: имя файла -> список запросов (по порядку). */
const REPLACE = [
    { name: 'contacts-studio', queries: ['photographer with camera at event', 'press photographer working'] },
    { name: 'gallery-product-2', queries: ['coffee cup on wooden table still life', 'ceramic cup tea still life'] },
    { name: 'gallery-wedding-2', queries: ['bride bouquet wedding ceremony', 'wedding rings bride dress'] }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(query, source) {
    const url = new URL('https://api.openverse.org/v1/images/');
    url.searchParams.set('q', query);
    url.searchParams.set('page_size', '20');
    url.searchParams.set('license_type', 'commercial,modification');
    url.searchParams.set('mature', 'false');
    if (source) url.searchParams.set('source', source);

    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Openverse ${response.status}`);

    const json = await response.json();
    return (json.results ?? [])
        .map((item) => ({
            url: item.url,
            title: item.title ?? '',
            creator: item.creator ?? 'не указан',
            license: `${item.license ?? '?'} ${item.license_version ?? ''}`.trim(),
            source: item.foreign_landing_url ?? item.url,
            width: item.width ?? 0,
            height: item.height ?? 0
        }))
        .filter((item) => item.url && /\.(jpe?g|png)$/i.test(item.url.split('?')[0]) && item.width >= 900);
}

async function download(url) {
    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' }, redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    if (!isJpeg || buffer.length < 30 * 1024) throw new Error(`не JPEG или слишком маленький (${(buffer.length / 1024).toFixed(0)} КБ)`);
    return buffer;
}

(async () => {
    for (const item of REPLACE) {
        console.log(`\n=== ${item.name}: замена ===`);

        // Удаляем прежний файл(ы), чтобы не осталось мусора
        for (const ext of ['.jpg', '.png']) {
            const file = path.join(outDir, item.name + ext);
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                console.log(`  удалён старый ${item.name}${ext}`);
            }
        }

        let saved = false;

        for (const query of item.queries) {
            if (saved) break;

            for (const source of ['wikimedia', undefined]) {
                if (saved) break;
                console.log(`  ищем «${query}» (источник: ${source ?? 'любой'})…`);

                let candidates = [];
                try {
                    candidates = await search(query, source);
                    console.log(`    кандидатов: ${candidates.length}`);
                } catch (err) {
                    console.log(`    ошибка поиска: ${err.message}`);
                    continue;
                }

                for (const candidate of candidates.slice(0, 4)) {
                    try {
                        const buffer = await download(candidate.url);
                        fs.writeFileSync(path.join(outDir, item.name + '.jpg'), buffer);
                        console.log(`    ✔ сохранено ${(buffer.length / 1024).toFixed(0)} КБ, ${candidate.width}×${candidate.height}, ${candidate.license}`);
                        console.log(`      источник: ${candidate.source}`);
                        saved = true;
                        break;
                    } catch (err) {
                        console.log(`    попытка не удалась: ${err.message}`);
                        await sleep(400);
                    }
                }
            }
        }

        if (!saved) console.log(`  ✘ не удалось заменить ${item.name}`);
        await sleep(600);
    }

    const all = fs.readdirSync(outDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
    console.log(`\nИзображений в папке: ${all.length}`);
})();
