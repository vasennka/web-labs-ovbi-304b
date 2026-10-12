/**
 * СЛОЙ PRESENTATION: загрузка файлов галереи (multer).
 *
 * Меры безопасности, которые здесь реализованы:
 *   - лимит размера файла (4 МБ) — защита от «заливки» гигабайтов;
 *   - проверка MIME-типа по белому списку — нельзя загрузить .exe или .php;
 *   - своё имя файла: случайный набор байт + расширение из типа,
 *     поэтому имя, придуманное пользователем, не попадает на диск
 *     (это защищает от path traversal и «двойных расширений» вроде a.php.jpg);
 *   - каталог загрузок отдаётся статикой БЕЗ исполнения скриптов.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const { ValidationError } = require('../../domain/errors');

const EXTENSIONS = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg'
};

/**
 * @param {{ dir: string, maxFileSize: number, allowedMime: string[] }} options
 */
function createUploadMiddleware({ dir, maxFileSize, allowedMime }) {
    fs.mkdirSync(dir, { recursive: true });

    const storage = multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, dir),
        filename: (_req, file, cb) => {
            const extension = EXTENSIONS[file.mimetype] ?? path.extname(file.originalname).slice(0, 10);
            const safeName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
            cb(null, safeName);
        }
    });

    const upload = multer({
        storage,
        limits: { fileSize: maxFileSize, files: 1 },
        fileFilter: (_req, file, cb) => {
            if (!allowedMime.includes(file.mimetype)) {
                return cb(new ValidationError('Недопустимый тип файла', {
                    image: `Разрешены только: ${allowedMime.join(', ')}`
                }));
            }
            return cb(null, true);
        }
    });

    return {
        /** Одно поле с именем `field` (для галереи — image). */
        single: (field) => upload.single(field),
        /** Публичный URL загруженного файла (то, что сохраняем в базе). */
        publicUrl: (file) => `/uploads/${file.filename}`,
        dir
    };
}

module.exports = { createUploadMiddleware, UPLOAD_EXTENSIONS: EXTENSIONS };
