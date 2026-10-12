/**
 * СЛОЙ PRESENTATION (MVC-контроллеры REST API).
 *
 * Контроллер — «тонкий»: он только извлекает данные из запроса, вызывает
 * сервис и формирует HTTP-ответ. Никакой бизнес-логики и SQL здесь быть не должно.
 * Именно поэтому одно и то же API обслуживает и React-SPA, и серверные страницы.
 *
 * Реализованы принципы REST, о которых говорится в докладе:
 *   - ресурсы в URL (существительные во множественном числе), HTTP-методы как глаголы;
 *   - правильные коды: 200/201/204/400/404/429/500;
 *   - пагинация через query (?page&limit) и метаданные в ответе;
 *   - версионирование: основной префикс /api/v1 (см. роутер).
 */

'use strict';

const { asyncHandler, ok, clean } = require('../../utils');

/** GET /api/v1/news — список новостей с пагинацией и фильтром по тегу. */
const listNews = (newsService) =>
    asyncHandler(async (req, res) => {
        const result = await newsService.list({
            page: req.query.page,
            limit: req.query.limit,
            tag: clean(req.query.tag, 40),
            search: clean(req.query.search, 80)
        });
        // Метаданные пагинации отдаём в теле — клиент знает, есть ли следующая страница
        ok(res, result, 200);
    });

/** GET /api/v1/news/:slug — одна новость. */
const getNews = (newsService) =>
    asyncHandler(async (req, res) => {
        const news = await newsService.getBySlug(req.params.slug);
        ok(res, { news });
    });

/** GET /api/v1/news-latest — три свежих новости для главной (демонстрация «отдельного» ресурса). */
const latestNews = (newsService) =>
    asyncHandler(async (req, res) => {
        const items = await newsService.latest(Number(req.query.limit) || 3);
        ok(res, { items });
    });

module.exports = { listNews, getNews, latestNews };
