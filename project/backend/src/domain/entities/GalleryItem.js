/**
 * СЛОЙ DOMAIN: сущность «Фотография в галерее».
 */

'use strict';

const { ValidationError } = require('../errors');

const CATEGORIES = ['портрет', 'свадьба', 'репортаж', 'пейзаж', 'студия', 'предметка', 'другое'];

function validateGalleryItem(input = {}, { partial = false } = {}) {
    const errors = {};
    const data = {};
    const has = (key) => input[key] !== undefined && input[key] !== null;

    if (has('title') || !partial) {
        const title = String(input.title ?? '').trim();
        if (title.length < 2) errors.title = 'Название должно быть не короче 2 символов';
        else if (title.length > 150) errors.title = 'Название длиннее 150 символов';
        else data.title = title;
    }

    if (has('description')) {
        const description = String(input.description).trim();
        if (description.length > 500) errors.description = 'Описание длиннее 500 символов';
        else data.description = description;
    } else if (!partial) {
        data.description = '';
    }

    if (has('category') || !partial) {
        const category = String(input.category ?? 'другое').trim().toLowerCase();
        if (!CATEGORIES.includes(category)) {
            errors.category = `Категория должна быть одной из: ${CATEGORIES.join(', ')}`;
        } else {
            data.category = category;
        }
    }

    if (has('imageUrl') || !partial) {
        const imageUrl = String(input.imageUrl ?? '').trim();
        if (!/^(\/uploads\/|https?:\/\/)/.test(imageUrl)) {
            errors.imageUrl = 'Нужна картинка: загрузите файл или укажите http(s)-ссылку';
        } else {
            data.imageUrl = imageUrl;
        }
    }

    if (has('author')) {
        data.author = String(input.author).trim().slice(0, 100);
    } else if (!partial) {
        data.author = 'Фотостудия PRISMA';
    }

    if (has('shotAt')) {
        const date = new Date(input.shotAt);
        if (Number.isNaN(date.getTime())) errors.shotAt = 'Некорректная дата съёмки';
        else data.shotAt = date.toISOString().slice(0, 10);
    } else if (!partial) {
        data.shotAt = new Date().toISOString().slice(0, 10);
    }

    if (Object.keys(errors).length > 0) {
        throw new ValidationError('Проверьте поля фотографии', errors);
    }

    return data;
}

function createGalleryItem(data) {
    return {
        id: data.id ?? null,
        title: data.title,
        description: data.description ?? '',
        category: data.category,
        imageUrl: data.imageUrl,
        author: data.author,
        shotAt: data.shotAt,
        createdAt: data.createdAt ?? new Date().toISOString()
    };
}

module.exports = { validateGalleryItem, createGalleryItem, GALLERY_CATEGORIES: CATEGORIES };
