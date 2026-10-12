/**
 * Страница 404 внутри SPA. Важно: сервер отдаёт index.html на любой
 * «клиентский» путь, поэтому 404 обрабатывается именно здесь, в роутере.
 */

import { Link, useLocation } from 'react-router-dom';

export default function NotFoundPage() {
    const location = useLocation();

    return (
        <section className="page-head">
            <h1>404 — страница не найдена</h1>
            <p className="lead">
                Путь <code>{location.pathname}</code> не существует в приложении.
            </p>
            <div className="hero-actions">
                <Link className="btn primary" to="/">На главную</Link>
                <a className="btn" href="/site/">Серверная версия (EJS)</a>
            </div>
        </section>
    );
}
