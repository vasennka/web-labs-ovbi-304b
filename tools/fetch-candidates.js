#!/usr/bin/env node
/**
 * Скачивание вариантов фотографий из Wikimedia Commons по темам.
 * Результат — в $env:TEMP/prisma-candidates: q1-1.jpg, q1-2.jpg, …
 * Затем отдельный скрипт собирает из них контактные листы для выбора.
 *
 * Запуск: node tools/fetch-candidates.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const outDir = path.join(process.env.TEMP || '.', 'prisma-candidates');
const UA = 'PRISMA-study-project/1.0 (educational use)';

const QUERIES = [
    'photographer taking photo camera',
    'photo studio portrait woman light',
    'photo studio softbox lighting equipment'
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(query, limit = 12) {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrsearch', `filetype:bitmap ${query}`);
    url.searchParams.set('gsrnamespace', '6');
    url.searchParams.set('gsrlimit', String(limit));
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|size');
    url.searchParams.set('iiurlwidth', '1200');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');

    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Commons ${response.status}`);
    const json = await response.json();

    return Object.values(json.query?.pages ?? {})
        .map((page) => ({
            title: (page.title ?? '').replace(/^File:/, ''),
            url: page.imageinfo?.[0]?.thumburl,
            width: page.imageinfo?.[0]?.thumbwidth ?? 0,
            height: page.imageinfo?.[0]?.thumbheight ?? 0
        }))
        .filter((item) => item.url && /\.(jpe?g|png)$/i.test(item.url.split('?')[0]));
}

async function download(url, target) {
    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error('не JPEG');
    if (buffer.length < 25 * 1024) throw new Error('слишком маленький файл');
    fs.writeFileSync(target, buffer);
    return buffer.length;
}

(async () => {
    if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    let queryIndex = 0;

    for (const query of QUERIES) {
        queryIndex++;
        console.log(`\n=== Запрос ${queryIndex}: ${query}`);

        let candidates = [];
        try {
            candidates = await search(query);
            console.log(`  найдено: ${candidates.length}`);
        } catch (err) {
            console.log(`  ошибка поиска: ${err.message}`);
            continue;
        }

        const list = [];
        let saved = 0;

        for (const candidate of candidates) {
            if (saved >= 9) break;
            const name = `q${queryIndex}-${saved + 1}.jpg`;
            try {
                const bytes = await download(candidate.url, path.join(outDir, name));
                list.push(`${name}\t${candidate.title}`);
                console.log(`  ✔ ${name}  ${(bytes / 1024).toFixed(0)} КБ  ${candidate.width}×${candidate.height}`);
                saved++;
            } catch (err) {
                // молча пробуем следующего кандидата
            }
            await sleep(250);
        }

        fs.writeFileSync(path.join(outDir, `list-q${queryIndex}.txt`), list.join('\n'), 'utf8');
        console.log(`  сохранено вариантов: ${saved}`);
    }

    console.log(`\nПапка с вариантами: ${outDir}`);
})();
