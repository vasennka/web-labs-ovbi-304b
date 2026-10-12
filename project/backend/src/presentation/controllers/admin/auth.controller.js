/**
 * СЛОЙ PRESENTATION: контроллеры входа в админку.
 *
 * Это классический MVC-контроллер: он принимает запрос, вызывает AuthService,
 * кладёт результат в сессию и выбирает, какой шаблон EJS отрисовать.
 */

'use strict';

const { asyncHandler } = require('../../utils');

/** GET /admin/login — форма входа. */
const showLogin = () => (req, res) => {
    if (req.session?.user) return res.redirect('/admin');
    return res.render('admin/login', {
        title: 'Вход в админку',
        error: null,
        csrfToken: req.session?.csrfToken ?? ''
    });
};

/** POST /admin/login — проверка пароля. */
const login = (authService) =>
    asyncHandler(async (req, res) => {
        const { login: userLogin, password } = req.body ?? {};

        try {
            const user = await authService.login(userLogin, password);

            // Пересоздаём идентификатор сессии после успешного входа —
            // защита от session fixation (злоумышленник не сможет
            // воспользоваться сессией, которую знал до входа).
            req.session.regenerate((err) => {
                if (err) throw err;
                req.session.user = user;
                const returnTo = req.session.returnTo || '/admin';
                delete req.session.returnTo;
                console.log(`[auth] успешный вход: ${user.login}`);
                res.redirect(returnTo);
            });
        } catch (err) {
            console.warn(`[auth] неудачный вход "${userLogin}": ${err.message}`);
            return res.status(err.status ?? 401).render('admin/login', {
                title: 'Вход в админку',
                error: err.message,
                csrfToken: req.session?.csrfToken ?? ''
            });
        }
        return undefined;
    });

/** POST /admin/logout — выход. */
const logout = () => (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
};

/** POST /admin/password — смена пароля. */
const changePassword = (authService) =>
    asyncHandler(async (req, res) => {
        const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

        try {
            if (newPassword !== confirmPassword) {
                throw Object.assign(new Error('Новый пароль и подтверждение не совпадают'), { status: 400 });
            }
            await authService.changePassword(req.session.user.id, currentPassword, newPassword);
            req.session.flash = { type: 'success', message: 'Пароль изменён. Используйте его при следующем входе.' };
        } catch (err) {
            req.session.flash = { type: 'error', message: err.message };
        }

        res.redirect('/admin');
    });

module.exports = { showLogin, login, logout, changePassword };
