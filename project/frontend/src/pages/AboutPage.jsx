/**
 * «О студии»: текст из базы (правится в админке), фотографии студии
 * и живые данные из двух сторонних сервисов.
 */

import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { IntegrationsPanel } from '../components/NewsCard.jsx';
import { Loader, ErrorBox } from '../components/ui/Feedback.jsx';

export default function AboutPage() {
    const about = useApi((signal) => api.getAbout(signal), []);
    const integrations = useApi((signal) => api.getIntegrations(signal), []);

    const data = about.data?.about;

    return (
        <>
            <section className="page-head">
                <p className="eyebrow">О компании</p>
                <h1>{data?.title ?? 'О студии'}</h1>
                <p className="lead">
                    Раздел «О себе / О компании»: текст хранится в базе (файл или SQLite)
                    и редактируется в админке без правки кода.
                </p>
            </section>

            {about.loading && <Loader />}
            <ErrorBox error={about.error} onRetry={about.reload} />

            <div className="two-col">
                <div>
                    <div className="photo-stack" style={{ marginBottom: 30 }}>
                        <img src="/demo-photos/about-studio-2.jpg" alt="Студийная площадка на Пресне" loading="lazy" />
                        <img src="/demo-photos/gallery-studio-1-2.jpg" alt="Схема постановки света" loading="lazy" />
                        <img src="/demo-photos/about-team-2.jpg" alt="Фотографы студии за работой" loading="lazy" />
                    </div>

                    {(data?.text ?? '').split('\n').filter(Boolean).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}

                    <h2>Наши принципы</h2>
                    <ul className="checklist">
                        {(data?.values ?? []).map((value) => <li key={value}>{value}</li>)}
                    </ul>

                    <h2>Контакты</h2>
                    <table className="kv">
                        <tbody>
                        <tr><th>Телефон</th><td>{data?.phone}</td></tr>
                        <tr><th>E-mail</th><td>{data?.email}</td></tr>
                        <tr><th>Адрес</th><td>{data?.address}</td></tr>
                        <tr><th>Часы работы</th><td>{data?.workHours}</td></tr>
                        </tbody>
                    </table>

                    <div className="hero-actions">
                        <a className="btn primary" href="/contacts">Обсудить съёмку</a>
                        <a className="btn" href="/site/about">Серверная версия страницы (EJS)</a>
                    </div>
                </div>

                <div>
                    <img
                        src="/demo-photos/gallery-portrait-1.jpg"
                        alt="Портретная съёмка студии"
                        loading="lazy"
                        style={{ width: '100%', borderRadius: 18, border: '1px solid var(--border)', marginBottom: 20 }}
                    />

                    {integrations.loading && <Loader text="Опрашиваем сторонние сервисы…" />}
                    <ErrorBox error={integrations.error} onRetry={integrations.reload} />
                    <IntegrationsPanel data={integrations.data} />
                </div>
            </div>
        </>
    );
}
