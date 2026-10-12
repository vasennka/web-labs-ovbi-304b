/**
 * СЛОЙ APPLICATION: сценарии использования галереи.
 */

'use strict';

const { validateGalleryItem, createGalleryItem, GALLERY_CATEGORIES } = require('../../domain/entities/GalleryItem');
const { NotFoundError } = require('../../domain/errors');

const MAX_LIMIT = 60;

class GalleryService {
    /** @param {{ galleryRepository: import('../ports/repositories').GalleryRepository }} deps */
    constructor({ galleryRepository }) {
        this.galleryRepository = galleryRepository;
    }

    /**
     * @param {{page?: number, limit?: number, category?: string}} [query]
     * @returns {Promise<{items: object[], total: number, page: number, limit: number, pages: number, categories: string[], categoriesInUse: string[]}>}
     */
    async list({ page = 1, limit = 12, category = '' } = {}) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || 12));
        const filters = { category: String(category || '').trim().toLowerCase() };

        const total = await this.galleryRepository.count(filters);
        const items = await this.galleryRepository.list({
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
            categories: GALLERY_CATEGORIES,
            categoriesInUse: await this.galleryRepository.categories()
        };
    }

    async getById(id) {
        const item = await this.galleryRepository.findById(Number(id));
        if (!item) throw new NotFoundError('Фотография');
        return item;
    }

    async create(input) {
        const data = validateGalleryItem(input);
        return this.galleryRepository.insert(createGalleryItem(data));
    }

    async update(id, input) {
        const existing = await this.getById(id);
        const data = validateGalleryItem(input, { partial: true });
        return this.galleryRepository.update(existing.id, data);
    }

    async remove(id) {
        const removed = await this.galleryRepository.remove(Number(id));
        if (!removed) throw new NotFoundError('Фотография');
        return true;
    }

    /** Сколько всего работ — для дашборда админки. */
    async count() {
        return this.galleryRepository.count({});
    }
}

module.exports = { GalleryService };
