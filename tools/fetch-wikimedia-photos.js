#!/usr/bin/env node
/**
 * Добор недостающих демонстрационных фото напрямую из Wikimedia Commons.
 * API не требует ключа, а upload.wikimedia.org не ограничивает частоту запросов.
 *
 * Запуск: node tools/fetch-wikimedia-photos.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const outDir = path.resolve(__dirname, '..', 'project', 'backend', 'public', 'demo-photos');
const UA = 'PRISMA-study-project/1.0 (educational use)';

/** Что добрать: имя файла -> поисковый запрос в Commons */
const WANTED = [
    { name: 'gallery-wedding-1', query: 'wedding couple bride groom photography' },
    { name: 'gallery-product-1', query: 'still life fruit table photography' },
    { name: 'gallery-product-2', query: 'coffee cup still life photography' },
    { name: 'news-3', query: 'fine art printing photograph paper' }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchCommons(query) {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrsearch', `filetype:bitmap ${query}`);
    url.searchParams.set('gsrnamespace', '6');          // только файлы
    url.searchParams.set('gsrlimit', '12');
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|extmetadata|size');
    url.searchParams.set('iiurlwidth', '1600');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');

    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Commons ответил ${response.status}`);

    const json = await response.json();
    const pages = Object.values(json.query?.pages ?? {});

    return pages
        .map((page) => {
            const info = page.imageinfo?.[0] ?? {};
            const meta = info.extmetadata ?? {};
            return {
                title: page.title,
                url: info.thumburl ?? info.url,
                width: info.thumbwidth ?? info.width ?? 0,
                height: info.thumbheight ?? info.height ?? 0,
                license: (meta.LicenseShortName?.value ?? 'см. источник'),
                author: (meta.Artist?.value ?? 'не указан').replace(/<[^>]+>/g, '').slice(0, 120),
                source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`
            };
        })
        .filter((item) => item.url && /\.(jpe?g|png)$/i.test(item.url.split('?')[0]));
}

async function download(url, name) {
    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    if ((!isJpeg && !isPng) || buffer.length < 20 * 1024) throw new Error('файл не является изображением');

    const extension = isPng ? '.png' : '.jpg';
    fs.writeFileSync(path.join(outDir, name + extension), buffer);
    return { extension, bytes: buffer.length };
}

(async () => {
    fs.mkdirSync(outDir, { recursive: true });
    const attribution = [];

    for (const item of WANTED) {
        const exists = ['.jpg', '.png'].some((ext) => fs.existsSync(path.join(outDir, item.name + ext)));
        if (exists) {
            console.log(`= ${item.name}: уже есть, пропускаем`);
            continue;
        }

        console.log(`\nИщем «${item.query}» для ${item.name}…`);
        let candidates = [];
        try {
            candidates = await searchCommons(item.query);
            console.log(`  кандидатов: ${candidates.length}`);
        } catch (err) {
            console.log(`  ошибка поиска: ${err.message}`);
            continue;
        }

        let saved = null;
        for (const candidate of candidates.slice(0, 5)) {
            try {
                const result = await download(candidate.url, item.name);
                saved = { ...candidate, ...result };
                console.log(`  ✔ ${item.name}${result.extension}  ${(result.bytes / 1024).toFixed(0)} КБ  ${candidate.width}×${candidate.height}  ${candidate.license}`);
                break;
            } catch (err) {
                console.log(`  попытка не удалась: ${err.message}`);
                await sleep(600);
            }
        }

        if (saved) {
            attribution.push({ fileName: item.name + saved.extension, ...saved });
        } else {
            console.log(`  ✘ не удалось скачать ${item.name}`);
        }

        await sleep(500);
    }

    if (attribution.length > 0) {
        const file = path.join(outDir, 'ATTRIBUTION.md');
        const header = fs.existsSync(file)
            ? fs.readFileSync(file, 'utf8').replace(/\s+$/, '') + '\n\n'
            : '# Источники демонстрационных фотографий\n';
        const extra = attribution.map((item) => [
            `## ${item.fileName}`,
            '',
            `- Название: ${item.title}`,
            `- Автор: ${item.author}`,
            `- Лицензия: ${item.license}`,
            `- Источник: ${item.source}`,
            `- Файл: ${item.url}`,
            ''
        ].join('\n')).join('\n');
        fs.writeFileSync(file, header + extra, 'utf8');
        console.log('\nСписок источников обновлён: ATTRIBUTION.md');
    }

    const all = fs.readdirSync(outDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
    console.log(`\nВсего изображений в папке: ${all.length}`);
})();
