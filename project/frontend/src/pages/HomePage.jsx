/**
 * Главная страница: фото-обложка, работы, новости, интеграции.
 * Фотографии лежат в project/backend/public/demo-photos и раздаются как статика
 * (см. /demo-photos в server.js) — поэтому сайт выглядит одинаково и после
 * клонирования репозитория, без внешних CDN.
 */

import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import Carousel from '../components/ui/Carousel.jsx';
import { NewsCard, IntegrationsPanel } from '../components/NewsCard.jsx';
import { Loader, ErrorBox } from '../components/ui/Feedback.jsx';

const HERO_IMAGE = '/demo-photos/hero.jpg';

export default function HomePage() {
    const gallery = useApi((signal) => api.listGallery({ limit: 8 }, signal), []);
    const news = useApi((signal) => api.latestNews(3, signal), []);
    const about = useApi((signal) => api.getAbout(signal), []);
    const integrations = useApi((signal) => api.getIntegrations(signal), []);

    const aboutText = about.data?.about?.text ?? '';
    const firstParagraph = aboutText.split('\n')[0] ?? '';

    return (
        <>
            {/* ---------- Обложка с фотографией ---------- */}
            <section className="hero">
                <div className="hero-bg">
                    <img src={HERO_IMAGE} alt="Фотостудия PRISMA" />
                </div>

                <div className="hero-inner wrap fade-up">
                    <p className="hero-eyebrow">Фотостудия в Москве · с 2020 года</p>
                    <h1>Снимаем людей, события и предметы <em>красиво</em> и вовремя</h1>
                    <p className="lead">
                        {firstParagraph ||
                            'Портрет, свадьба, репортаж и предметная съёмка. Своя студия на Пресне, свет Profoto, выезд по Москве и области.'}
                    </p>

                    <div className="hero-actions">
                        <Link className="btn primary" to="/gallery">Смотреть галерею</Link>
                        <Link className="btn ghost" to="/contacts">Заказать съёмку</Link>
                    </div>

                    <div className="hero-stats">
                        <div><b>6 лет</b><span>на рынке</span></div>
                        <div><b>400+</b><span>съёмок</span></div>
                        <div><b>12</b><span>выставок</span></div>
                        <div><b>24 часа</b><span>сдача превью</span></div>
                    </div>
                </div>
            </section>

            {/* ---------- Галерея: самодельная карусель ---------- */}
            <section className="fade-up delay-1">
                <div className="section-head">
                    <div>
                        <p className="eyebrow">Портфолио</p>
                        <h2>Свежие работы</h2>
                    </div>
                    <Link to="/gallery">вся галерея →</Link>
                </div>

                {gallery.loading && <Loader text="Загружаем работы…" />}
                <ErrorBox error={gallery.error} onRetry={gallery.reload} />
                {gallery.data && (
                    <Carousel items={gallery.data.items} autoPlayMs={6000} ariaLabel="Галерея работ студии" />
                )}
            </section>

            {/* ---------- О студии + фото ---------- */}
            <section className="two-col fade-up delay-2">
                <div>
                    <div className="section-head">
                        <div>
                            <p className="eyebrow">О студии</p>
                            <h2>{about.data?.about?.title ?? 'Фотостудия PRISMA'}</h2>
                        </div>
                    </div>

                    <p className="lead">{aboutText.split('\n').slice(0, 2).join(' ')}</p>

                    <ul className="checklist">
                        {(about.data?.about?.values ?? []).slice(0, 4).map((value) => (
                            <li key={value}>{value}</li>
                        ))}
                    </ul>

                    <div className="hero-actions" style={{ marginTop: 6 }}>
                        <Link className="btn" to="/about">Подробнее о студии</Link>
                        <Link className="btn ghost" to="/news">Новости студии</Link>
                    </div>
                </div>

                <div className="photo-stack">
                    <img src="/demo-photos/about-studio-2.jpg" alt="Студийная площадка" loading="lazy" />
                    <img src="/demo-photos/gallery-studio-1-2.jpg" alt="Схема света" loading="lazy" />
                    <img src="/demo-photos/about-team-2.jpg" alt="Команда студии" loading="lazy" />
                </div>
            </section>

            {/* ---------- Новости и интеграции ---------- */}
            <section className="two-col fade-up delay-3">
                <div>
                    <div className="section-head">
                        <div>
                            <p className="eyebrow">Журнал</p>
                            <h2>Новости студии</h2>
                        </div>
                        <Link to="/news">все новости →</Link>
                    </div>

                    {news.loading && <Loader />}
                    <ErrorBox error={news.error} onRetry={news.reload} />
                    <div className="news-list">
                        {news.data?.items?.map((item) => <NewsCard item={item} key={item.id} />)}
                    </div>
                </div>

                <div>
                    {integrations.loading && <Loader text="Опрашиваем сторонние сервисы…" />}
                    <ErrorBox error={integrations.error} onRetry={integrations.reload} />
                    <IntegrationsPanel data={integrations.data} />
                </div>
            </section>
        </>
    );
}
