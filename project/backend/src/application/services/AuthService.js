/**
 * СЛОЙ APPLICATION: аутентификация администратора.
 *
 * Схема (cookie-сессия, без JWT — обоснование в README и докладе):
 *   1) админ отправляет логин/пароль формой;
 *   2) сервис достаёт пользователя и сравнивает пароль с ХЕШЕМ (bcryptjs);
 *   3) при успехе presentation-слой кладёт в сессию (express-session) только
 *      { userId, login, role } — сам хеш и пароль в cookie не попадают;
 *   4) дальше middleware requireAuth проверяет req.session.user.
 *
 * Защита: не сообщаем, что именно неверно (логин или пароль), и применяем
 * RateLimiter, чтобы пароль нельзя было перебирать.
 */

'use strict';

const { createUser } = require('../../domain/entities/User');
const { AuthError, ValidationError, NotFoundError } = require('../../domain/errors');

class AuthService {
    /**
     * @param {{
     *   userRepository: import('../ports/repositories').UserRepository,
     *   passwordHasher: import('../ports/repositories').PasswordHasher,
     *   rateLimiter?: import('./RateLimiter').RateLimiter
     * }} deps
     */
    constructor({ userRepository, passwordHasher, rateLimiter = null }) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
        this.rateLimiter = rateLimiter;
    }

    /**
     * Проверка пары логин/пароль.
     * @param {string} login
     * @param {string} password
     * @returns {Promise<{id: number, login: string, role: string}>} публичное представление
     */
    async login(login, password) {
        const cleanLogin = String(login ?? '').trim().toLowerCase();
        const cleanPassword = String(password ?? '');

        if (!cleanLogin || !cleanPassword) {
            throw new ValidationError('Введите логин и пароль');
        }

        // Ограничение попыток входа: 5 за 5 минут на логин+ключ
        this.rateLimiter?.check(`login:${cleanLogin}`);

        const user = await this.userRepository.findByLogin(cleanLogin);

        // Одна и та же ошибка для «нет пользователя» и «неверный пароль»:
        // так злоумышленник не узнает, существует ли логин.
        const ok = user ? await this.passwordHasher.verify(cleanPassword, user.passwordHash) : false;
        if (!ok) throw new AuthError('Неверный логин или пароль');

        this.rateLimiter?.reset(`login:${cleanLogin}`);
        return this.toPublic(user);
    }

    /**
     * Смена пароля из админки.
     * @param {number} userId
     * @param {string} currentPassword
     * @param {string} newPassword
     */
    async changePassword(userId, currentPassword, newPassword) {
        if (String(newPassword).length < 6) {
            throw new ValidationError('Новый пароль должен быть не короче 6 символов', {
                password: 'Минимум 6 символов'
            });
        }

        const user = await this.userRepository.findById(Number(userId));
        if (!user) throw new NotFoundError('Пользователь');

        const ok = await this.passwordHasher.verify(String(currentPassword), user.passwordHash);
        if (!ok) throw new AuthError('Текущий пароль указан неверно');

        const passwordHash = await this.passwordHasher.hash(String(newPassword));
        await this.userRepository.update(user.id, { passwordHash });
        return true;
    }

    /** Создание администратора (используется при первичном наполнении базы). */
    async register({ login, password, role = 'admin' }) {
        if (String(password).length < 6) {
            throw new ValidationError('Пароль администратора должен быть не короче 6 символов');
        }
        const passwordHash = await this.passwordHasher.hash(String(password));
        const existing = await this.userRepository.findByLogin(String(login).trim().toLowerCase());
        if (existing) return existing; // идемпотентность при повторном сидировании
        return this.userRepository.insert(createUser({ login, passwordHash, role }));
    }

    /** Убирает хеш пароля из объекта, который уходит в сессию/клиент. */
    toPublic(user) {
        return { id: user.id, login: user.login, role: user.role };
    }
}

module.exports = { AuthService };
