/**
 * Общий каркас страниц: шапка с навигацией и кнопкой заказа,
 * подвал с навигацией и контактами.
 */

import { NavLink, Link } from 'react-router-dom';

export function Header() {
    const linkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');

    return (
        <header className="site-header">
            <div className="wrap">
                <Link className="logo" to="/">PRISMA<span>·</span>studio</Link>

                <nav>
                    <NavLink to="/" className={linkClass} end>Главная</NavLink>
                    <NavLink to="/gallery" className={linkClass}>Галерея</NavLink>
                    <NavLink to="/news" className={linkClass}>Новости</NavLink>
                    <NavLink to="/about" className={linkClass}>О студии</NavLink>
                    <NavLink to="/contacts" className={linkClass}>Контакты</NavLink>
                    <a className="nav-link server-link" href="/site/" title="Версия на шаблонизаторе EJS">EJS-версия</a>
                    <a className="nav-link admin-link" href="/admin/login">Админка</a>
                    <Link className="btn primary small" to="/contacts" style={{ marginLeft: 8 }}>
                        Заказать съёмку
                    </Link>
                </nav>
            </div>
        </header>
    );
}

export function Footer({ about }) {
    return (
        <footer className="site-footer">
            <div className="wrap">
                <div className="footer-nav">
                    <div>
                        <span className="logo">PRISMA<span>·</span>studio</span>
                        <p>
                            Фотостудия полного цикла: портрет, свадьба, репортаж,
                            предметная съёмка. Своя площадка и выезд по области.
                        </p>
                    </div>

                    <div>
                        <h4>Разделы</h4>
                        <Link to="/about">О студии</Link>
                        <Link to="/gallery">Галерея</Link>
                        <Link to="/news">Новости</Link>
                        <Link to="/contacts">Контакты</Link>
                    </div>

                    <div>
                        <h4>Контакты</h4>
                        {about ? (
                            <>
                                <p><a href={`tel:${String(about.phone).replace(/[^\d+]/g, '')}`}>{about.phone}</a></p>
                                <p><a href={`mailto:${about.email}`}>{about.email}</a></p>
                                <p>{about.address}</p>
                            </>
                        ) : (
                            <p className="muted">Загружаем контакты…</p>
                        )}
                    </div>

                    <div>
                        <h4>Часы работы</h4>
                        <p>{about?.workHours ?? '—'}</p>
                        <h4 style={{ marginTop: 18 }}>Технологии</h4>
                        <p>React SPA + REST API</p>
                        <p>Node.js: domain → application → infrastructure → presentation</p>
                        <p>Шаблонизатор EJS для админки и серверных страниц</p>
                    </div>
                </div>

                <p className="copy">
                    © {new Date().getFullYear()} Фотостудия PRISMA · учебный проект (тема 25).
                    Демонстрационные фотографии — Openverse / Creative Commons (см. demo-photos/ATTRIBUTION.md).
                </p>
            </div>
        </footer>
    );
}
