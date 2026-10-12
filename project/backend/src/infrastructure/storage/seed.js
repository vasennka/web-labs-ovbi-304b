/**
 * СЛОЙ INFRASTRUCTURE: первичное наполнение базы (seed).
 *
 * Запуск: npm run seed   (из папки project/backend)
 * Скрипт идемпотентен: если данные уже есть, он ничего не дублирует,
 * а только сообщает об этом. Админ создаётся с паролем из конфигурации,
 * в базу кладётся только bcrypt-хеш.
 */

'use strict';

const config = require('../../config');
const { createAppDatabase } = require('../storage/createDatabase');
const { BcryptHasher } = require('../mail/ConsoleMailer');
const { createUser } = require('../../domain/entities/User');
const { createNews } = require('../../domain/entities/News');
const { createGalleryItem } = require('../../domain/entities/GalleryItem');

const NEWS_SEED = [
    {
        title: 'Открыли новую студийную площадку на Пресне',
        excerpt: 'Два циклорамы, свет Profoto и гримёрка — теперь можно снимать кампании целиком.',
        content:
            'Мы открыли вторую студийную площадку: 140 м², две циклорамы (4 и 6 метров), ' +
            'постоянный свет Profoto, гримёрная на четыре места и отдельная переговорная для клиента.\n\n' +
            'Что это меняет для заказчиков: одну съёмку можно полностью провести на месте — ' +
            'от примерок и подгонки образа до финальных карточек товара, не переезжая между локациями.',
        tags: ['студия', 'новости студии'],
        coverUrl: ''
    },
    {
        title: 'Как мы готовим репортаж: чек-лист на 40 пунктов',
        excerpt: 'Разбираем подготовку к деловому событию: схемы света, точки съёмки, тайминг с пресс-службой.',
        content:
            'Репортаж отличается от студийной съёмки тем, что повторить кадр нельзя. ' +
            'Поэтому за два дня до события мы согласуем план с пресс-службой, помечаем ключевые точки ' +
            '(вход, сцена, переговорные) и определяем три сценария света.\n\n' +
            'Наш чек-лист из 40 пунктов включает проверку резервных карт и второго корпуса, ' +
            'тайминг по блокам программы и обязательный запас по ISO для помещений с плохим светом.',
        tags: ['репортаж', 'полезное'],
        coverUrl: ''
    },
    {
        title: 'Печать выставочных отпечатков: архивная бумага и профили',
        excerpt: 'Почему печатаем на архивной бумаге и как подбираем ICC-профиль под каждый снимок.',
        content:
            'Выставочный отпечаток должен прожить десятилетия, поэтому мы печатаем на архивной ' +
            'бумаге без оптических отбеливателей и строим ICC-профиль под конкретную партию бумаги.\n\n' +
            'Каждый тираж проверяем тестовой шкалой: смотрим, как передаются глубокие тени и светлые ' +
            'участки кожи. Только после этого запускаем печать всей серии.',
        tags: ['печать', 'полезное'],
        coverUrl: ''
    }
];

const GALLERY_SEED = [
    {
        title: 'Портрет на закатном свете',
        description: 'Съёмка на выезде, естественный свет + одна отражающая панель.',
        category: 'портрет',
        imageUrl: 'https://picsum.photos/seed/prisma-portrait/1200/800',
        author: 'Макар',
        shotAt: '2026-05-14'
    },
    {
        title: 'Свадьба под дождём',
        description: 'Пленка-эффект, тёплые тона, серия из 120 кадров.',
        category: 'свадьба',
        imageUrl: 'https://picsum.photos/seed/prisma-wed/1200/800',
        author: 'Даша',
        shotAt: '2026-06-02'
    },
    {
        title: 'Деловая конференция, 600 участников',
        description: 'Репортаж в двух залах одновременно двумя камерами.',
        category: 'репортаж',
        imageUrl: 'https://picsum.photos/seed/prisma-report/1200/800',
        author: 'Денис',
        shotAt: '2026-04-21'
    },
    {
        title: 'Студийный портрет на сером фоне',
        description: 'Одна лампа, октобокс, низкий ключ для драматичного объёма.',
        category: 'студия',
        imageUrl: 'https://picsum.photos/seed/prisma-studio/1200/800',
        author: 'Макар',
        shotAt: '2026-07-09'
    },
    {
        title: 'Туман над Истрой',
        description: 'Пейзажная серия, съёмка на рассвете, штатив и ND-фильтр.',
        category: 'пейзаж',
        imageUrl: 'https://picsum.photos/seed/prisma-landscape/1200/800',
        author: 'Анна',
        shotAt: '2026-08-30'
    },
    {
        title: 'Предметка для косметики',
        description: 'Студийный стол, скретч-фон, свет через софтбокс снизу.',
        category: 'студия',
        imageUrl: 'https://picsum.photos/seed/prisma-product/1200/800',
        author: 'Анна',
        shotAt: '2026-09-12'
    }
];

async function seed() {
    console.log('Наполнение базы: драйвер =', config.data.driver);

    const db = await createAppDatabase(config);
    const hasher = new BcryptHasher();

    // --- 1. Администратор -----------------------------------------------------
    const users = await db.all('users');
    if (users.length === 0) {
        const passwordHash = await hasher.hash(config.admin.password);
        const admin = createUser({ login: config.admin.login, passwordHash, role: 'admin' });
        await db.insert('users', admin);
        console.log(`  ✔ создан администратор: ${config.admin.login} / пароль из конфигурации (смените после входа!)`);
    } else {
        console.log(`  • пользователи уже есть (${users.length}) — пропускаем`);
    }

    // --- 2. Новости -----------------------------------------------------------
    const news = await db.all('news');
    if (news.length === 0) {
        let index = 0;
        for (const item of NEWS_SEED) {
            const publishedAt = new Date(Date.now() - index++ * 86_400_000 * 4).toISOString();
            const slug = item.title
                .toLowerCase()
                .replace(/[^a-zа-я0-9\s-]/gi, '')
                .trim()
                .replace(/\s+/g, '-');
            await db.insert('news', { ...createNews({ ...item, slug, publishedAt }) });
        }
        console.log(`  ✔ добавлено новостей: ${NEWS_SEED.length}`);
    } else {
        console.log(`  • новости уже есть (${news.length}) — пропускаем`);
    }

    // --- 3. Галерея -----------------------------------------------------------
    const gallery = await db.all('gallery');
    if (gallery.length === 0) {
        for (const item of GALLERY_SEED) {
            await db.insert('gallery', { ...createGalleryItem(item) });
        }
        console.log(`  ✔ добавлено фотографий: ${GALLERY_SEED.length}`);
    } else {
        console.log(`  • галерея уже заполнена (${gallery.length}) — пропускаем`);
    }

    // --- 4. Настройки (О нас) -------------------------------------------------
    const settings = await db.all('settings');
    if (!settings.some((row) => row.key === 'about')) {
        await db.insert('settings', { key: 'about', value: {} });
        console.log('  ✔ создан раздел «О нас» (значения по умолчанию)');
    }

    console.log('Готово. Файл базы:', config.data.driver === 'json' ? config.data.jsonFile : config.data.sqliteFile);
    db.close?.();
}

if (require.main === module) {
    seed().catch((err) => {
        console.error('Ошибка наполнения базы:', err);
        process.exitCode = 1;
    });
}

module.exports = { seed, NEWS_SEED, GALLERY_SEED };
