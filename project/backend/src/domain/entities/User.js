/**
 * СЛОЙ DOMAIN: сущность «Пользователь админки» и «Настройки сайта (О нас)».
 *
 * Пароли в открытом виде не хранятся: сущность работает с уже посчитанным
 * хешем (bcrypt считает слой infrastructure — домен не знает про bcrypt).
 */

'use strict';

const { ValidationError } = require('../errors');

const ROLES = ['admin', 'editor'];

function createUser({ id = null, login, passwordHash, role = 'admin', createdAt } = {}) {
    const cleanLogin = String(login ?? '').trim().toLowerCase();

    if (cleanLogin.length < 3) {
        throw new ValidationError('Логин должен быть не короче 3 символов', { login: 'Слишком короткий логин' });
    }
    if (!passwordHash) {
        throw new ValidationError('Не передан хеш пароля', { password: 'Пустой пароль' });
    }
    if (!ROLES.includes(role)) {
        throw new ValidationError(`Роль должна быть одной из: ${ROLES.join(', ')}`, { role: 'Неизвестная роль' });
    }

    return {
        id,
        login: cleanLogin,
        passwordHash,
        role,
        createdAt: createdAt ?? new Date().toISOString()
    };
}

/**
 * Настройки раздела «О нас» + контакты, которые правит админ.
 * Это singleton-сущность (в базе хранится одной записью с id = 'about').
 */
function validateAbout(input = {}, { partial = false } = {}) {
    const errors = {};
    const data = {};
    const has = (key) => input[key] !== undefined && input[key] !== null;

    if (has('title') || !partial) {
        const title = String(input.title ?? '').trim();
        if (title.length < 2) errors.title = 'Заголовок раздела обязателен';
        else data.title = title.slice(0, 200);
    }

    if (has('text') || !partial) {
        const text = String(input.text ?? '').trim();
        if (text.length < 20) errors.text = 'Текст о студии должен быть не короче 20 символов';
        else data.text = text.slice(0, 5000);
    }

    if (has('phone')) data.phone = String(input.phone).trim().slice(0, 40);
    if (has('email')) {
        const email = String(input.email).trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/.test(email)) {
            errors.email = 'Некорректный e-mail студии';
        } else {
            data.email = email;
        }
    }
    if (has('address')) data.address = String(input.address).trim().slice(0, 200);
    if (has('workHours')) data.workHours = String(input.workHours).trim().slice(0, 100);

    if (has('values')) {
        const raw = Array.isArray(input.values) ? input.values : String(input.values).split('\n');
        data.values = raw.map((v) => String(v).trim()).filter(Boolean).slice(0, 12);
    }

    if (Object.keys(errors).length > 0) {
        throw new ValidationError('Проверьте поля раздела «О нас»', errors);
    }

    return data;
}

module.exports = { createUser, validateAbout, USER_ROLES: ROLES };
