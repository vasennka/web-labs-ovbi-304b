/**
 * «О студии»: текст из базы + демонстрация двух интеграций со сторонними сервисами.
 * Текст правится в админке (раздел «О нас») и приходит из GET /api/v1/about.
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
                <h1>{data?.title ?? 'О студии'}</h1>
                <p className="lead">
                    Раздел «О себе / О компании». Данные лежат в базе (файл или SQLite)
                    и редактируются в админке.
                </p>
            </section>

            {about.loading && <Loader />}
            <ErrorBox error={about.error} onRetry={about.reload} />

            <div className="two-col">
                <section>
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
                </section>

                <section>
                    {integrations.loading && <Loader text="Опрашиваем сторонние сервисы…" />}
                    <ErrorBox error={integrations.error} onRetry={integrations.reload} />
                    <IntegrationsPanel data={integrations.data} />

                    <div className="widget">
                        <h3>Как устроена интеграция</h3>
                        <p className="muted small">
                            Бизнес-логика (AboutService) работает с портами
                            <code>VcsStatsProvider</code> и <code>WeatherProvider</code>.
                            Реализации лежат в infrastructure: <code>GitHubStatsProvider</code> использует
                            официальный SDK <code>@octokit/rest</code>, а <code>WeatherProvider</code> —
                            собственный HTTP-клиент поверх <code>fetch</code> с таймаутом через
                            <code>AbortController</code>. Ответы кэшируются на 10 минут, при недоступности
                            сервиса отдаётся кэш или заглушка с флагом <code>degraded</code>.
                        </p>
                    </div>
                </section>
            </div>
        </>
    );
}
