/**
 * СЛОЙ DOMAIN: сущность «Новость» + правила валидации.
 *
 * Сущность не знает ни про Express, ни про базу данных, ни про JSON-файл.
 * Она умеет только одно: проверить данные и создать нормализованный объект.
 * Благодаря этому правила проверки живут в одном месте и используются
 * и REST API, и админкой, и серверными страницами.
 */

'use strict';

const { ValidationError } = require('../errors');

/** Максимальные длины полей — защита от «мега-текста» в базу. */
const LIMITS = {
    title: 200,
    excerpt: 400,
    content: 20000,
    tags: 10,
    tag: 30
};

/**
 * Превращает заголовок в часть URL: "Привет, мир!" -> "privet-mir".
 * @param {string} value
 * @returns {string}
 */
function slugify(value) {
    const map = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
        й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
        у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
        э: 'e', ю: 'yu', я: 'ya'
    };

    return String(value)
        .toLowerCase()
        .split('')
        .map((char) => (map[char] !== undefined ? map[char] : char))
        .join('')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80) || 'news';
}

/**
 * Валидирует и нормализует входные данные новости.
 * @param {object} input
 * @param {{partial?: boolean}} [options] — partial: true для PATCH (проверяем только переданные поля)
 * @returns {object} «чистый» набор полей
 */
function validateNews(input = {}, { partial = false } = {}) {
    const errors = {};
    const data = {};

    const has = (key) => input[key] !== undefined && input[key] !== null;

    // --- title ---
    if (has('title') || !partial) {
        const title = String(input.title ?? '').trim();
        if (title.length < 3) errors.title = 'Заголовок должен быть не короче 3 символов';
        else if (title.length > LIMITS.title) errors.title = `Заголовок длиннее ${LIMITS.title} символов`;
        else data.title = title;
    }

    // --- excerpt (краткое описание) ---
    if (has('excerpt') || !partial) {
        const excerpt = String(input.excerpt ?? '').trim();
        if (excerpt.length > LIMITS.excerpt) errors.excerpt = `Анонс длиннее ${LIMITS.excerpt} символов`;
        else data.excerpt = excerpt;
    }

    // --- content ---
    if (has('content') || !partial) {
        const content = String(input.content ?? '').trim();
        if (content.length < 10) errors.content = 'Текст новости должен быть не короче 10 символов';
        else if (content.length > LIMITS.content) errors.content = `Текст длиннее ${LIMITS.content} символов`;
        else data.content = content;
    }

    // --- coverUrl (необязательно) ---
    if (has('coverUrl')) {
        const coverUrl = String(input.coverUrl).trim();
        if (coverUrl && !/^(\/uploads\/|https?:\/\/)/.test(coverUrl)) {
            errors.coverUrl = 'Ссылка на обложку должна начинаться с /uploads/ или http(s)://';
        } else {
            data.coverUrl = coverUrl;
        }
    }

    // --- tags: строка "выставка, портрет" или массив ---
    if (has('tags')) {
        const raw = Array.isArray(input.tags) ? input.tags : String(input.tags).split(',');
        const tags = raw.map((t) => String(t).trim()).filter(Boolean);
        if (tags.length > LIMITS.tags) errors.tags = `Не больше ${LIMITS.tags} тегов`;
        else if (tags.some((t) => t.length > LIMITS.tag)) errors.tags = `Тег длиннее ${LIMITS.tag} символов`;
        else data.tags = [...new Set(tags)];
    } else if (!partial) {
        data.tags = [];
    }

    // --- slug: если не задан, сделаем из заголовка ---
    if (has('slug')) {
        data.slug = slugify(input.slug);
    } else if (data.title) {
        data.slug = slugify(data.title);
    }

    // --- publishedAt: по умолчанию «сейчас» ---
    if (has('publishedAt')) {
        const date = new Date(input.publishedAt);
        if (Number.isNaN(date.getTime())) errors.publishedAt = 'Некорректная дата публикации';
        else data.publishedAt = date.toISOString();
    } else if (!partial) {
        data.publishedAt = new Date().toISOString();
    }

    if (Object.keys(errors).length > 0) {
        throw new ValidationError('Проверьте поля новости', errors);
    }

    return data;
}

/**
 * Создаёт сущность новости (данные уже проверены).
 */
function createNews(data) {
    return {
        id: data.id ?? null,
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt ?? '',
        content: data.content,
        coverUrl: data.coverUrl ?? '',
        tags: data.tags ?? [],
        publishedAt: data.publishedAt,
        createdAt: data.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

module.exports = { validateNews, createNews, slugify, NEWS_LIMITS: LIMITS };
