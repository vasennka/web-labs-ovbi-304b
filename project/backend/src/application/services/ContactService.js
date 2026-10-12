/**
 * СЛОЙ APPLICATION: сценарии обратной связи.
 *
 * Порядок действий (важен для объяснения на защите):
 *   1) валидация данных доменной сущностью (в т.ч. honeypot против ботов);
 *   2) сохранение в репозиторий (файл или SQLite — сервису всё равно);
 *   3) уведомление администратора через порт Mailer (в учебном проекте —
 *      запись письма в консоль);
 *   4) возврат «человеческого» ответа для фронтенда.
 *
 * Сервис устойчив к падению почты: сообщение уже сохранено, а ошибка отправки
 * логируется и не ломает ответ пользователю (метод #notifyAdmin).
 */

'use strict';

const { validateContactMessage, createContactMessage } = require('../../domain/entities/ContactMessage');
const { NotFoundError } = require('../../domain/errors');

const MAX_LIMIT = 100;

class ContactService {
    /**
     * @param {{
     *   messageRepository: import('../ports/repositories').MessageRepository,
     *   mailer: import('../ports/integrations').Mailer,
     *   logger?: Console,
     *   adminEmail?: string
     * }} deps
     */
    constructor({ messageRepository, mailer, logger = console, adminEmail = 'studio@prisma.local' }) {
        this.messageRepository = messageRepository;
        this.mailer = mailer;
        this.logger = logger;
        this.adminEmail = adminEmail;
    }

    /**
     * Обработка формы обратной связи.
     * @param {object} input — поля формы
     * @param {{userAgent?: string, ip?: string}} [context]
     * @returns {Promise<{id: number, createdAt: string, notified: boolean}>}
     */
    async submit(input, context = {}) {
        const data = validateContactMessage(input);
        const entity = createContactMessage({
            ...data,
            userAgent: String(context.userAgent ?? '').slice(0, 200)
        });

        const saved = await this.messageRepository.insert(entity);
        const notified = await this.#notifyAdmin(saved);

        this.logger.log(`[contact] сообщение #${saved.id} от ${saved.email} сохранено (уведомление: ${notified ? 'отправлено' : 'нет'})`);

        return { id: saved.id, createdAt: saved.createdAt, notified };
    }

    /** @returns {Promise<{items: object[], total: number, page: number, limit: number, pages: number, unread: number}>} */
    async list({ page = 1, limit = 20, onlyUnread = false } = {}) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || 20));
        const filters = { onlyUnread: Boolean(onlyUnread) };

        const total = await this.messageRepository.count(filters);
        const items = await this.messageRepository.list({
            offset: (safePage - 1) * safeLimit,
            limit: safeLimit,
            ...filters
        });

        return {
            items,
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.max(1, Math.ceil(total / safeLimit)),
            unread: await this.messageRepository.count({ onlyUnread: true })
        };
    }

    async markRead(id, isRead = true) {
        const updated = await this.messageRepository.update(Number(id), { isRead });
        if (!updated) throw new NotFoundError('Сообщение');
        return updated;
    }

    async remove(id) {
        const removed = await this.messageRepository.remove(Number(id));
        if (!removed) throw new NotFoundError('Сообщение');
        return true;
    }

    async countUnread() {
        return this.messageRepository.count({ onlyUnread: true });
    }

    /** @private */
    async #notifyAdmin(message) {
        try {
            await this.mailer.send({
                to: this.adminEmail,
                subject: `Новое сообщение с сайта от ${message.name}`,
                text: [
                    `Имя: ${message.name}`,
                    `E-mail: ${message.email}`,
                    `Оценка сайта: ${message.rating ?? 'не указана'}`,
                    '',
                    message.message
                ].join('\n')
            });
            return true;
        } catch (err) {
            // Сообщение уже сохранено — падение почты не должно ломать сценарий.
            this.logger.error('[contact] не удалось отправить уведомление:', err.message);
            return false;
        }
    }
}

module.exports = { ContactService };
