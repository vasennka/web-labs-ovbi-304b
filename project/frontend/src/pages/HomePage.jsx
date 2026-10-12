/**
 * Главная страница: карусель работ (самодельный контрол), свежие новости,
 * короткий блок «О студии» и виджет интеграций.
 */

import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import Carousel from '../components/ui/Carousel.jsx';
import { NewsCard, IntegrationsPanel } from '../components/NewsCard.jsx';
import { Loader, ErrorBox } from '../components/ui/Feedback.jsx';

export default function HomePage() {
    const gallery = useApi((signal) => api.listGallery({ limit: 8 }, signal), []);
    const news = useApi((signal) => api.latestNews(3, signal), []);
    const about = useApi((signal) => api.getAbout(signal), []);
    const integrations = useApi((signal) => api.getIntegrations(signal), []);

    return (
        <>
            <section className="hero">
                <h1>Фотостудия, которая любит свет</h1>
                <p className="lead">
                    {about.data?.about?.text?.split('\n')[0] ??
                        'Портрет, свадьба, репортаж и предметная съёмка в Москве.'}
                </p>
                <div className="hero-actions">
                    <Link className="btn primary" to="/gallery">Смотреть галерею</Link>
                    <Link className="btn" to="/contacts">Заказать съёмку</Link>
                </div>
                <p className="note">
                    Этот интерфейс — React-SPA: данные приходят из REST API
                    (<code>GET /api/v1/gallery</code>, <code>/news</code>, <code>/about</code>).
                    Серверная версия тех же страниц на шаблонизаторе EJS — по адресу
                    <a href="/site/"> /site/</a>.
                </p>
            </section>

            <section>
                <div className="section-head">
                    <h2>Галерея: самодельная карусель</h2>
                    <Link to="/gallery">вся галерея →</Link>
                </div>

                {gallery.loading && <Loader text="Загружаем работы…" />}
                <ErrorBox error={gallery.error} onRetry={gallery.reload} />
                {gallery.data && (
                    <Carousel items={gallery.data.items} autoPlayMs={5000} ariaLabel="Галерея работ студии" />
                )}
            </section>

            <div className="two-col">
                <section>
                    <div className="section-head">
                        <h2>Новости студии</h2>
                        <Link to="/news">все новости →</Link>
                    </div>

                    {news.loading && <Loader />}
                    <ErrorBox error={news.error} onRetry={news.reload} />
                    <div className="news-list">
                        {news.data?.items?.map((item) => <NewsCard item={item} key={item.id} />)}
                    </div>
                </section>

                <section>
                    {integrations.loading && <Loader text="Опрашиваем сторонние сервисы…" />}
                    <ErrorBox error={integrations.error} onRetry={integrations.reload} />
                    <IntegrationsPanel data={integrations.data} />
                </section>
            </div>
        </>
    );
}
