/**
 * СЛОЙ DOMAIN: сущность «Сообщение обратной связи».
 * Здесь же — простая защита от спама на уровне домена (honeypot и длина текста).
 */

'use strict';

const { ValidationError } = require('../errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/;

function validateContactMessage(input = {}) {
    const errors = {};
    const data = {};

    // --- name ---
    const name = String(input.name ?? '').trim();
    if (name.length < 2) errors.name = 'Укажите имя (минимум 2 символа)';
    else if (name.length > 100) errors.name = 'Имя слишком длинное';
    else data.name = name;

    // --- email ---
    const email = String(input.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) errors.email = 'Укажите корректный e-mail, например ivan@mail.ru';
    else data.email = email;

    // --- message ---
    const message = String(input.message ?? '').trim();
    if (message.length < 10) errors.message = 'Сообщение должно быть не короче 10 символов';
    else if (message.length > 2000) errors.message = 'Сообщение длиннее 2000 символов';
    else data.message = message;

    // --- rating (необязательно, для самодельного контрола StarRating) ---
    if (input.rating !== undefined && input.rating !== null && input.rating !== '') {
        const rating = Number(input.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            errors.rating = 'Оценка должна быть целым числом от 1 до 5';
        } else {
            data.rating = rating;
        }
    } else {
        data.rating = null;
    }

    // --- honeypot: скрытое поле, которое заполняют только боты ---
    if (String(input.website ?? '').trim() !== '') {
        errors.website = 'Сообщение отклонено как спам';
    }

    if (Object.keys(errors).length > 0) {
        throw new ValidationError('Проверьте поля формы', errors);
    }

    return data;
}

function createContactMessage(data) {
    return {
        id: data.id ?? null,
        name: data.name,
        email: data.email,
        message: data.message,
        rating: data.rating ?? null,
        isRead: false,
        userAgent: data.userAgent ?? '',
        createdAt: data.createdAt ?? new Date().toISOString()
    };
}

module.exports = { validateContactMessage, createContactMessage, EMAIL_RE };
