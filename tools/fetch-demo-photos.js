#!/usr/bin/env node
/**
 * ============================================================================
 * Загрузка демонстрационных фотографий для сайта фотостудии PRISMA.
 * ============================================================================
 *
 * Источник: Openverse (openverse.org) — открытая библиотека изображений
 * с лицензиями Creative Commons. Ключ API не нужен.
 *
 * Что делает скрипт:
 *   1) ищет изображения по темам (портрет, свадьба, студия, пейзаж, предметка…);
 *   2) скачивает их в project/backend/public/demo-photos;
 *   3) проверяет, что файл действительно картинка и не «пустышка»;
 *   4) пишет файл ATTRIBUTION.md со ссылками на источники и лицензиями.
 *
 * Запуск: node tools/fetch-demo-photos.js
 * ============================================================================
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'project', 'backend', 'public', 'demo-photos');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/** Темы поиска: сколько картинок нужно и для чего они (имя файла -> назначение). */
const SEARCHES = [
    {
        query: 'portrait photography model',
        names: ['gallery-portrait-1', 'gallery-portrait-2', 'gallery-portrait-3', 'about-team']
    },
    {
        query: 'wedding photography couple',
        names: ['gallery-wedding-1', 'gallery-wedding-2']
    },
    {
        query: 'photography studio light equipment',
        names: ['hero', 'about-studio', 'gallery-studio-1', 'gallery-studio-2', 'news-1']
    },
    {
        query: 'landscape photography mountains',
        names: ['gallery-landscape-1', 'gallery-landscape-2', 'news-2']
    },
    {
        query: 'product photography still life',
        names: ['gallery-product-1', 'gallery-product-2', 'news-3']
    },
    {
        query: 'photographer camera hands',
        names: ['contacts-studio', 'news-4']
    }
];

/**
 * Добор недостающих кадров: Flickr-хостинги часто отдают 429,
 * поэтому оставшиеся картинки берём из Wikimedia Commons
 * (upload.wikimedia.org отдаёт файлы без ограничения частоты).
 */
const FALLBACK = [
    { query: 'wedding couple bride groom', names: ['gallery-wedding-1'], source: 'wikimedia' },
    { query: 'photographers working studio', names: ['about-team'], source: 'wikimedia' },
    { query: 'mountain lake sunrise landscape', names: ['news-2'], source: 'wikimedia' },
    { query: 'still life photography product', names: ['gallery-product-1', 'gallery-product-2', 'news-3'], source: 'wikimedia' }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Запрос к Openverse: только изображения с лицензией, допускающей использование. */
async function searchImages(query, count, source) {
    const url = new URL('https://api.openverse.org/v1/images/');
    url.searchParams.set('q', query);
    url.searchParams.set('page_size', String(Math.min(20, count * 4)));
    url.searchParams.set('license_type', 'commercial,modification');
    url.searchParams.set('mature', 'false');
    url.searchParams.set('size', 'large');
    if (source) url.searchParams.set('source', source);

    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Openverse ответил ${response.status}`);

    const json = await response.json();
    return (json.results ?? [])
        .filter((item) => item.url && /\.(jpe?g|png)(\?|$)/i.test(item.url))
        .map((item) => ({
            url: item.url,
            title: item.title ?? '',
            creator: item.creator ?? 'не указан',
            license: `${item.license ?? '?'} ${item.license_version ?? ''}`.trim(),
            source: item.foreign_landing_url ?? item.url,
            width: item.width ?? 0,
            height: item.height ?? 0
        }));
}

/** Скачивание файла с проверкой, что это настоящая картинка. */
async function download(url, fileName) {
    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' }, redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    if ((!isJpeg && !isPng) || buffer.length < 20 * 1024) {
        throw new Error(`не похоже на изображение (${(buffer.length / 1024).toFixed(1)} КБ)`);
    }

    const extension = isPng ? '.png' : '.jpg';
    const target = path.join(outDir, fileName + extension);
    fs.writeFileSync(target, buffer);
    return { target, extension, bytes: buffer.length };
}

/** Уже скачан ли файл под этим именем (любое расширение). */
function alreadySaved(fileName) {
    return ['.jpg', '.png'].some((ext) => fs.existsSync(path.join(outDir, fileName + ext)));
}

/**
 * Пытается скачать изображение, перебирая кандидатов и делая паузы между
 * попытками: чужие хостинги отвечают 429, если запросы идут слишком часто.
 */
async function downloadWithRetries(fileName, candidates, attempts = 5) {
    for (let attempt = 0; attempt < attempts && candidates.length > 0; attempt++) {
        const candidate = candidates.shift();
        try {
            const saved = await download(candidate.url, fileName);
            return { saved, candidate };
        } catch (err) {
            console.log(`    попытка ${attempt + 1}: ${err.message}`);
            await sleep(1200 + attempt * 1200); // 1.2 c, 2.4 c, 3.6 c…
        }
    }
    return null;
}

async function main() {
    fs.mkdirSync(outDir, { recursive: true });

    const attribution = [];
    const summary = [];

    for (const search of [...SEARCHES, ...FALLBACK]) {
        const missing = search.names.filter((name) => !alreadySaved(name));
        if (missing.length === 0) {
            console.log(`\nТема: «${search.query}» — все фото уже есть, пропускаем`);
            continue;
        }

        console.log(`\nТема: «${search.query}» — не хватает ${missing.length} фото: ${missing.join(', ')}`);
        let candidates = [];

        try {
            candidates = await searchImages(search.query, missing.length, search.source);
            console.log(`  найдено кандидатов: ${candidates.length}`);
        } catch (err) {
            console.log(`  ошибка поиска: ${err.message}`);
            continue;
        }

        for (const fileName of missing) {
            const result = await downloadWithRetries(fileName, candidates);

            if (!result) {
                console.log(`  ✘ ${fileName}: не удалось скачать`);
                continue;
            }

            const { saved, candidate } = result;
            summary.push({ fileName: fileName + saved.extension, bytes: saved.bytes });
            attribution.push({ fileName: fileName + saved.extension, ...candidate });
            console.log(`  ✔ ${fileName}${saved.extension}  ${(saved.bytes / 1024).toFixed(0)} КБ  ${candidate.width}×${candidate.height}  ${candidate.license}`);

            await sleep(1500); // пауза, чтобы не получать 429
        }
    }

    // Файл с атрибуцией (требование лицензий Creative Commons)
    const existingAttribution = fs.existsSync(path.join(outDir, 'ATTRIBUTION.md'))
        ? fs.readFileSync(path.join(outDir, 'ATTRIBUTION.md'), 'utf8')
        : '';

    const lines = [
        '# Источники демонстрационных фотографий',
        '',
        'Изображения загружены через открытую библиотеку [Openverse](https://openverse.org)',
        'и используются по лицензиям Creative Commons. Ниже указан источник и лицензия',
        'для каждого файла (это требование лицензий CC BY / CC BY-SA).',
        ''
    ];
    for (const item of attribution) {
        lines.push(`## ${item.fileName}`);
        lines.push('');
        lines.push(`- Название: ${item.title || '—'}`);
        lines.push(`- Автор: ${item.creator}`);
        lines.push(`- Лицензия: ${item.license}`);
        lines.push(`- Источник: ${item.source}`);
        lines.push(`- Файл: ${item.url}`);
        lines.push('');
    }

    if (attribution.length > 0) {
        fs.writeFileSync(path.join(outDir, 'ATTRIBUTION.md'), lines.join('\n'), 'utf8');
    } else if (!existingAttribution) {
        console.log('ВНИМАНИЕ: не удалось сохранить список источников');
    }

    // Итог по всей папке
    const all = fs.readdirSync(outDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
    const totalBytes = all.reduce((sum, f) => sum + fs.statSync(path.join(outDir, f)).size, 0);

    console.log('\n──────────────────────────────────────────────');
    console.log(`В папке сейчас ${all.length} изображений, ${(totalBytes / 1024 / 1024).toFixed(2)} МБ`);
    console.log(all.map((f) => '  ' + f).join('\n'));

    const plan = SEARCHES.flatMap((s) => s.names);
    const missingTotal = plan.filter((name) => !alreadySaved(name));
    console.log(missingTotal.length === 0
        ? '\nВсе запланированные изображения на месте.'
        : `\nНе хватает: ${missingTotal.join(', ')} — запустите скрипт ещё раз.`);
}

main().catch((err) => {
    console.error('Ошибка:', err);
    process.exit(1);
});
