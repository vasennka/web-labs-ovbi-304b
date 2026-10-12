/**
 * СЛОЙ PRESENTATION: контроллеры админки (новости, галерея, сообщения, «О нас»).
 *
 * Все действия работают через обычные HTML-формы (POST + redirect),
 * поэтому не требуют JavaScript — это одно из достоинств серверного
 * рендеринга шаблонизатором, о котором говорится в README.
 */

'use strict';

const { asyncHandler } = require('../../utils');
const { DEFAULT_ABOUT } = require('../../../application/services/AboutService');

/** Хелпер: положить сообщение «в один показ» в сессию. */
const flash = (req, type, message) => {
    req.session.flash = { type, message };
};

/* ------------------------------- ДАШБОРД ------------------------------- */

const dashboard = (deps) =>
    asyncHandler(async (req, res) => {
        const [news, unread, galleryCount, about] = await Promise.all([
            deps.newsService.list({ limit: 5 }),
            deps.contactService.countUnread(),
            deps.galleryService.count(),
            deps.aboutService.getAbout()
        ]);

        res.render('admin/dashboard', {
            title: 'Дашборд',
            user: req.session.user,
            stats: {
                news: news.total,
                unread,
                gallery: galleryCount,
                emails: deps.mailer.getHistory().length
            },
            latestNews: news.items,
            letters: deps.mailer.getHistory().slice(0, 3),
            aboutTitle: about.title
        });
    });

/* -------------------------------- НОВОСТИ ------------------------------ */

const newsList = (deps) =>
    asyncHandler(async (req, res) => {
        const page = Number(req.query.page) || 1;
        const result = await deps.newsService.list({ page, limit: 10 });
        res.render('admin/news', {
            title: 'Новости',
            user: req.session.user,
            ...result
        });
    });

const newsForm = (deps) =>
    asyncHandler(async (req, res) => {
        const isEdit = Boolean(req.params.id);
        const news = isEdit ? await deps.newsService.getById(req.params.id) : null;
        res.render('admin/news-form', {
            title: isEdit ? `Правка новости #${news.id}` : 'Новая новость',
            user: req.session.user,
            news,
            errors: {},
            values: news ?? { title: '', excerpt: '', content: '', tags: [], coverUrl: '' }
        });
    });

const newsSave = (deps) =>
    asyncHandler(async (req, res) => {
        const isEdit = Boolean(req.params.id);
        try {
            if (isEdit) {
                await deps.newsService.update(req.params.id, req.body);
                flash(req, 'success', `Новость #${req.params.id} сохранена`);
            } else {
                const created = await deps.newsService.create(req.body);
                flash(req, 'success', `Создана новость «${created.title}» (${created.slug})`);
            }
            return res.redirect('/admin/news');
        } catch (err) {
            // Ошибки валидации показываем прямо в форме, ничего не теряя
            return res.status(err.status ?? 500).render('admin/news-form', {
                title: isEdit ? 'Правка новости' : 'Новая новость',
                user: req.session.user,
                news: isEdit ? { id: req.params.id } : null,
                errors: err.details ?? { form: err.message },
                values: { tags: [], ...req.body }
            });
        }
    });

const newsDelete = (deps) =>
    asyncHandler(async (req, res) => {
        await deps.newsService.remove(req.params.id);
        flash(req, 'success', `Новость #${req.params.id} удалена`);
        res.redirect('/admin/news');
    });

/* ------------------------------- ГАЛЕРЕЯ ------------------------------- */

const galleryList = (deps) =>
    asyncHandler(async (req, res) => {
        const result = await deps.galleryService.list({ page: Number(req.query.page) || 1, limit: 24 });
        res.render('admin/gallery', {
            title: 'Галерея',
            user: req.session.user,
            ...result,
            uploaded: req.query.uploaded === '1',
            error: req.query.error ? decodeURIComponent(req.query.error) : null
        });
    });

const galleryCreate = (deps) =>
    asyncHandler(async (req, res) => {
        // Если загружен файл — формируем URL /uploads/xxx; иначе берём ссылку из поля
        const imageUrl = req.file ? deps.upload.publicUrl(req.file) : String(req.body.imageUrl ?? '').trim();

        try {
            await deps.galleryService.create({
                title: req.body.title,
                description: req.body.description,
                category: req.body.category,
                author: req.body.author,
                shotAt: req.body.shotAt,
                imageUrl
            });
            res.redirect('/admin/gallery?uploaded=1');
        } catch (err) {
            // multer-ошибки и ошибки валидации возвращаем в query-строке (простой способ)
            res.redirect(`/admin/gallery?error=${encodeURIComponent(err.message)}`);
        }
    });

const galleryDelete = (deps) =>
    asyncHandler(async (req, res) => {
        await deps.galleryService.remove(req.params.id);
        flash(req, 'success', `Фотография #${req.params.id} удалена`);
        res.redirect('/admin/gallery');
    });

/* ------------------------------ СООБЩЕНИЯ ------------------------------ */

const messagesList = (deps) =>
    asyncHandler(async (req, res) => {
        const onlyUnread = req.query.filter === 'unread';
        const result = await deps.contactService.list({ page: Number(req.query.page) || 1, limit: 20, onlyUnread });
        res.render('admin/messages', {
            title: 'Обратная связь',
            user: req.session.user,
            ...result,
            onlyUnread
        });
    });

const messageToggleRead = (deps) =>
    asyncHandler(async (req, res) => {
        const isRead = req.body.isRead === 'true';
        await deps.contactService.markRead(req.params.id, isRead);
        res.redirect(req.get('referer') || '/admin/messages');
    });

const messageDelete = (deps) =>
    asyncHandler(async (req, res) => {
        await deps.contactService.remove(req.params.id);
        flash(req, 'success', `Сообщение #${req.params.id} удалено`);
        res.redirect('/admin/messages');
    });

/* -------------------------------- О НАС -------------------------------- */

const aboutForm = (deps) =>
    asyncHandler(async (req, res) => {
        const about = await deps.aboutService.getAbout();
        const integrations = await deps.aboutService.getIntegrations();
        res.render('admin/about', {
            title: 'Раздел «О нас»',
            user: req.session.user,
            about: { ...DEFAULT_ABOUT, ...about },
            integrations,
            defaultAbout: DEFAULT_ABOUT,
            errors: {}
        });
    });

const aboutSave = (deps) =>
    asyncHandler(async (req, res) => {
        try {
            // values приходит из textarea — по одной строке на пункт
            await deps.aboutService.saveAbout({ ...req.body, values: req.body.values });
            flash(req, 'success', 'Раздел «О нас» сохранён');
            res.redirect('/admin/about');
        } catch (err) {
            const about = await deps.aboutService.getAbout();
            res.status(err.status ?? 500).render('admin/about', {
                title: 'Раздел «О нас»',
                user: req.session.user,
                about: { ...about, ...req.body },
                integrations: { github: {}, weather: {} },
                defaultAbout: DEFAULT_ABOUT,
                errors: err.details ?? { form: err.message }
            });
        }
    });

module.exports = {
    dashboard,
    newsList,
    newsForm,
    newsSave,
    newsDelete,
    galleryList,
    galleryCreate,
    galleryDelete,
    messagesList,
    messageToggleRead,
    messageDelete,
    aboutForm,
    aboutSave
};
