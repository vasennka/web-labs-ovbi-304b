/**
 * СЛОЙ INFRASTRUCTURE: почта и хеширование паролей.
 *
 * ConsoleMailer — учебная реализация порта Mailer: письмо не отправляется,
 * а печатается в консоль. Заменить на реальную почту (SMTP через nodemailer
 * или API сервиса) — это заменить один класс в container.js.
 *
 * BcryptHasher — порт PasswordHasher. bcryptjs (чистый JS, без сборки нативных
 * модулей) выбран осознанно: пароль НЕ хранится ни в открытом виде, ни в виде
 * MD5/SHA, потому что те быстрые и ломаются перебором. bcrypt добавляет
 * замедлитель (cost) и соль, что делает подбор паролей дорогим.
 */

'use strict';

const bcrypt = require('bcryptjs');

class ConsoleMailer {
    #logger;
    #history = [];
    #enabled;

    constructor({ logger = console, enabled = true } = {}) {
        this.#logger = logger;
        this.#enabled = enabled;
    }

    /**
     * «Отправляет» письмо: в учебном проекте пишет в консоль и хранит историю
     * (историю показываем в админке, чтобы было видно, что уведомление ушло).
     */
    async send({ to, subject, text }) {
        if (!to || !subject) throw new Error('Mailer.send: нужны to и subject');

        const letter = { to, subject, text, sentAt: new Date().toISOString() };
        this.#history.unshift(letter);
        if (this.#history.length > 50) this.#history.pop();

        if (this.#enabled) {
            this.#logger.log([
                '────────────────────────── ПИСЬМО ──────────────────────────',
                `Кому:     ${to}`,
                `Тема:     ${subject}`,
                'Текст:',
                text,
                '────────────────────────────────────────────────────────────'
            ].join('\n'));
        }

        return letter;
    }

    /** История «отправленных» писем (для дашборда админки). */
    getHistory() {
        return [...this.#history];
    }
}

class BcryptHasher {
    #rounds;

    /** @param {{ rounds?: number }} [options] — 10 раундов ≈ 60-100 мс на проверку */
    constructor({ rounds = 10 } = {}) {
        this.#rounds = rounds;
    }

    async hash(plain) {
        return bcrypt.hash(String(plain), this.#rounds);
    }

    async verify(plain, hash) {
        if (!hash) return false;
        return bcrypt.compare(String(plain), hash);
    }
}

module.exports = { ConsoleMailer, BcryptHasher };
