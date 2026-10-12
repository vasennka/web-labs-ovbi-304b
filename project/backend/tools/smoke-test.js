/**
 * СМОУК-ТЕСТ проекта: проверяет, что весь стек действительно работает.
 *
 * Запуск: npm run smoke   (из папки project/backend)
 *
 * Что проверяется:
 *   1) REST API: /health, /news, /gallery, /about, /integrations, пагинация, 404;
 *   2) серверные страницы EJS: /site/, /site/gallery, /site/news, /site/contacts;
 *   3) форма обратной связи: успешная отправка с записью в базу;
 *   4) админка закрыта паролем: неавторизованный доступ редиректится на вход;
 *   5) вход в админку с паролем, доступ к дашборду и к разделу новостей;
 *   6) защита от CSRF: POST без токена отклоняется.
 *
 * Тест поднимает сервер на отдельном порту (4321) с отдельной базой,
 * поэтому не мешает вашему рабочему запуску.
 */

'use strict';

process.env.PORT = process.env.SMOKE_PORT || '4321';
process.env.DATA_DRIVER = process.env.DATA_DRIVER || 'json';

const path = require('node:path');
const fs = require('node:fs');

// Изолированная база для теста
const testDbFile = path.join(__dirname, '..', 'data', 'smoke-test-db.json');
if (fs.existsSync(testDbFile)) fs.rmSync(testDbFile);

const config = require('../src/config');
config.data.jsonFile = testDbFile;

const { start } = require('../src/server');
const { seed } = require('../src/infrastructure/storage/seed');

const BASE = `http://127.0.0.1:${process.env.PORT}`;
let passed = 0;
let failed = 0;

const check = (condition, title, extra = '') => {
    if (condition) {
        passed += 1;
        console.log(`✔ ${title}${extra ? ' — ' + extra : ''}`);
    } else {
        failed += 1;
        console.log(`✘ ${title}${extra ? ' — ' + extra : ''}`);
    }
};

(async () => {
    console.log('Наполняем тестовую базу…');
    await seed();

    const { server } = await start(Number(process.env.PORT), '127.0.0.1');
    console.log(`\nСервер смоук-теста: ${BASE}\n`);

    try {
        /* ------------------------- REST API ------------------------- */
        let res = await fetch(`${BASE}/api/v1/health`);
        let json = await res.json();
        check(res.status === 200 && json.status === 'ok', 'GET /api/v1/health', `driver=${json.driver}`);

        res = await fetch(`${BASE}/api/v1/news?limit=2`);
        json = await res.json();
        check(res.status === 200 && json.items.length === 2 && json.total >= 3,
            'GET /api/v1/news (пагинация)', `total=${json.total}, pages=${json.pages}, tags=${json.tags.length}`);

        const slug = json.items[0].slug;
        res = await fetch(`${BASE}/api/v1/news/${slug}`);
        json = await res.json();
        check(res.status === 200 && json.news.slug === slug, 'GET /api/v1/news/:slug', slug);

        res = await fetch(`${BASE}/api/v1/news/такой-новости-нет`);
        check(res.status === 404, 'GET /api/v1/news/<несуществующий> -> 404');

        res = await fetch(`${BASE}/api/v1/gallery?category=студия`);
        json = await res.json();
        check(res.status === 200 && json.items.every((i) => i.category === 'студия'),
            'GET /api/v1/gallery?category=студия (фильтр)', `найдено ${json.total}`);

        res = await fetch(`${BASE}/api/v1/about`);
        json = await res.json();
        check(res.status === 200 && typeof json.about.title === 'string', 'GET /api/v1/about', json.about.title);

        res = await fetch(`${BASE}/api/v1/integrations`);
        json = await res.json();
        const degraded = Boolean(json.github?.degraded) || Boolean(json.weather?.degraded);
        check(res.status === 200 && json.github && json.weather,
            'GET /api/v1/integrations (внешние сервисы)', degraded ? 'сервисы недоступны — отданы заглушки' : 'данные получены');

        res = await fetch(`${BASE}/api/v1/нет-такого-эндпоинта`);
        check(res.status === 404, 'GET /api/v1/<неизвестный> -> 404 JSON');

        /* ------------------- Форма обратной связи -------------------- */
        res = await fetch(`${BASE}/api/v1/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Смоук-тест',
                email: 'smoke@test.local',
                message: 'Проверка формы обратной связи из смоук-теста цепочки.',
                rating: 5
            })
        });
        json = await res.json();
        check(res.status === 201 && json.ok && json.id > 0, 'POST /api/v1/contact (успех)', `id=${json.id}`);

        res = await fetch(`${BASE}/api/v1/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'X', email: 'не-почта', message: 'мало' })
        });
        json = await res.json();
        check(res.status === 400 && json.details?.email && json.details?.name,
            'POST /api/v1/contact (валидация) -> 400 с деталями по полям');

        /* -------------------- Серверные страницы EJS ----------------- */
        for (const [url, marker] of [
            ['/site/', 'Снимаем людей'],
            ['/site/gallery', 'Галерея работ'],
            ['/site/news', 'Новости студии'],
            ['/site/about', 'Сторонние сервисы'],
            ['/site/contacts', 'обратная связь']
        ]) {
            res = await fetch(`${BASE}${url}`);
            const html = await res.text();
            check(res.status === 200 && html.includes(marker), `GET ${url} (EJS-страница)`);
        }

        // Форма из EJS-версии: обычный POST с редиректом
        res = await fetch(`${BASE}/site/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                name: 'EJS-форма',
                email: 'ejs@test.local',
                message: 'Сообщение отправлено формой без JavaScript.'
            }).toString(),
            redirect: 'manual'
        });
        check(res.status === 302 && res.headers.get('location')?.includes('sent=1'),
            'POST /site/contacts (форма без JS) -> редирект с подтверждением');

        /* ------------------------- Админка -------------------------- */
        res = await fetch(`${BASE}/admin`, { redirect: 'manual' });
        check(res.status === 302 && res.headers.get('location') === '/admin/login',
            'GET /admin без сессии -> редирект на /admin/login');

        res = await fetch(`${BASE}/admin/news`, { redirect: 'manual' });
        check(res.status === 302, 'GET /admin/news без сессии -> редирект (закрыто паролем)');

        // Получаем форму входа и CSRF-токен из неё
        res = await fetch(`${BASE}/admin/login`);
        const loginHtml = await res.text();
        const csrfMatch = loginHtml.match(/name="_csrf" value="([^"]+)"/);
        check(Boolean(csrfMatch), 'страница входа содержит CSRF-токен');

        const cookies = res.headers.getSetCookie?.() ?? [];
        const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');
        const csrfToken = csrfMatch ? csrfMatch[1] : '';

        // Вход с неверным паролем
        res = await fetch(`${BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cookieHeader },
            body: new URLSearchParams({ login: 'admin', password: 'неверный', _csrf: csrfToken }).toString(),
            redirect: 'manual'
        });
        check(res.status === 401, 'вход с неверным паролем -> 401 (форма с ошибкой)');

        // POST без CSRF-токена должен быть отклонён
        res = await fetch(`${BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cookieHeader },
            body: new URLSearchParams({ login: 'admin', password: 'admin123' }).toString(),
            redirect: 'manual'
        });
        check(res.status === 403, 'POST без CSRF-токена -> 403 (защита работает)');

        // Вход с верным паролем
        res = await fetch(`${BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cookieHeader },
            body: new URLSearchParams({ login: 'admin', password: 'admin123', _csrf: csrfToken }).toString(),
            redirect: 'manual'
        });
        const sessionCookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
        check(res.status === 302 && res.headers.get('location') === '/admin',
            'вход с верным паролем -> редирект на /admin');

        res = await fetch(`${BASE}/admin`, { headers: { cookie: sessionCookie } });
        const dashHtml = await res.text();
        check(res.status === 200 && dashHtml.includes('Дашборд'), 'GET /admin с сессией -> дашборд');

        res = await fetch(`${BASE}/admin/messages`, { headers: { cookie: sessionCookie } });
        const msgHtml = await res.text();
        check(res.status === 200 && msgHtml.includes('smoke@test.local'),
            'GET /admin/messages -> видно сообщение из формы', 'сквозной сценарий пройден');

        res = await fetch(`${BASE}/admin/news/new`, { headers: { cookie: sessionCookie } });
        const formHtml = await res.text();
        check(res.status === 200 && formHtml.includes('Заголовок'), 'GET /admin/news/new -> форма создания новости');

        /* --------------------- Статика и SPA ------------------------ */
        res = await fetch(`${BASE}/static/site.css`);
        check(res.status === 200, 'GET /static/site.css (статика подключена)');

        res = await fetch(`${BASE}/demo-photos/hero.jpg`);
        check(res.status === 200 && (res.headers.get('content-type') ?? '').includes('image'),
            'GET /demo-photos/hero.jpg (фотографии сайта отдаются)');

        res = await fetch(`${BASE}/`);
        const spaHtml = await res.text();
        check(res.status === 200 && (spaHtml.includes('id="root"') || spaHtml.includes('Не собран')),
            'GET / (React-SPA или подсказка о сборке)');

        // Проверяем, что файлы сборки отдаются с правильными типами,
        // иначе браузер откажется запускать приложение (MIME type text/html)
        const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist', 'assets');
        if (fs.existsSync(distDir)) {
            const bundle = fs.readdirSync(distDir).find((file) => file.endsWith('.js'));
            if (bundle) {
                res = await fetch(`${BASE}/assets/${bundle}`);
                const type = res.headers.get('content-type') ?? '';
                check(res.status === 200 && /javascript/i.test(type),
                    'GET /assets/*.js (файлы сборки React отдаются с верным типом)', type);
            }
        }

        res = await fetch(`${BASE}/gallery`);
        check(res.status === 200, 'GET /gallery (SPA-fallback отдаёт index.html)');
    } catch (err) {
        failed += 1;
        console.error('✘ Исключение в смоук-тесте:', err);
    } finally {
        console.log(`\n──────────────────────────────────────────`);
        console.log(`Пройдено: ${passed} · Провалено: ${failed}`);
        server.close(() => process.exit(failed === 0 ? 0 : 1));
    }
})();
