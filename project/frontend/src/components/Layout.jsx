/**
 * Общий каркас страниц: шапка с навигацией и подвал с навигацией.
 * Используются <NavLink> из react-router — активный пункт получает класс.
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
                    <a className="nav-link server-link" href="/site/" title="Серверная версия на шаблонизаторе EJS">EJS-версия</a>
                    <a className="nav-link admin-link" href="/admin/login">Админка</a>
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
                                <p>{about.phone}</p>
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
                    </div>
                    <div>
                        <h4>Архитектура</h4>
                        <p>React SPA + REST API</p>
                        <p>Node.js: domain → application → infrastructure → presentation</p>
                        <p>Шаблонизатор EJS для админки и серверных страниц</p>
                    </div>
                </div>
                <p className="copy">© {new Date().getFullYear()} Фотостудия PRISMA · учебный проект (тема 25)</p>
            </div>
        </footer>
    );
}
