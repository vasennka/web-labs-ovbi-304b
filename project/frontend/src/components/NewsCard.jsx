/**
 * Карточка новости с фотографией-обложкой и блок интеграций со сторонними сервисами.
 * Обложки берутся из /demo-photos (лежат в репозитории), поэтому карточки
 * выглядят одинаково у любого, кто скачает проект.
 */

import { Link } from 'react-router-dom';

export function NewsCard({ item }) {
    const cover = item.coverUrl || '/demo-photos/news-1.jpg';
    const date = new Date(item.publishedAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <article className="card news">
            <Link className="cover" to={`/news/${item.slug}`} aria-label={item.title}>
                <img src={cover} alt={item.title} loading="lazy" />
            </Link>

            <div className="body">
                <time dateTime={item.publishedAt}>{date}</time>
                <h3>
                    <Link to={`/news/${item.slug}`}>{item.title}</Link>
                </h3>
                {item.excerpt && <p>{item.excerpt}</p>}
                <p className="meta">
                    {(item.tags ?? []).map((tag) => (
                        <span className="tag" key={tag}>{tag}</span>
                    ))}
                </p>
            </div>
        </article>
    );
}

/**
 * Виджет интеграций: данные приходят от сторонних сервисов через порты
 * (VcsStatsProvider / WeatherProvider). Если сервис недоступен, бэкенд
 * возвращает degraded = true — показываем это честно, без «пустоты».
 */
export function IntegrationsPanel({ data }) {
    if (!data) return null;

    const { github, weather, fetchedAt } = data;

    return (
        <aside className="integrations">
            <div className="section-head">
                <div>
                    <p className="eyebrow">Интеграции</p>
                    <h2>Сторонние сервисы</h2>
                </div>
            </div>
            <p className="muted small">Получено: {new Date(fetchedAt).toLocaleString('ru-RU')}</p>

            <div className={`widget ${github.degraded ? 'degraded' : ''}`}>
                <h3><span className="tag accent">SDK</span> GitHub · @octokit/rest</h3>
                {github.fullName ? (
                    <>
                        <p><b>{github.fullName}</b></p>
                        <p className="muted small">{github.description}</p>
                        <ul className="stats">
                            <li>★ <b>{github.stars}</b></li>
                            <li>⑂ <b>{github.forks}</b></li>
                            <li>! <b>{github.openIssues}</b></li>
                        </ul>
                        <p className="muted small">
                            {github.fromCache ? 'из кэша (10 минут)' : 'получено сейчас'}
                            {github.stale ? ' · данные могли устареть' : ''}
                        </p>
                        <a href={github.url} target="_blank" rel="noreferrer noopener">открыть репозиторий →</a>
                    </>
                ) : (
                    <>
                        <p>Сервис недоступен, показываем заглушку.</p>
                        <p className="muted small">{github.message}</p>
                    </>
                )}
            </div>

            <div className={`widget ${weather.degraded ? 'degraded' : ''}`}>
                <h3><span className="tag accent">HTTP</span> Погода · fetch</h3>
                {weather.temperature !== null && weather.temperature !== undefined ? (
                    <>
                        <p className="big">{weather.temperature} °C</p>
                        <p>{weather.description}, {weather.city}</p>
                        <p className="muted small">
                            ветер {weather.windSpeed} м/с · {weather.fromCache ? 'из кэша' : 'получено сейчас'}
                        </p>
                    </>
                ) : (
                    <>
                        <p>Сервис недоступен, показываем заглушку.</p>
                        <p className="muted small">{weather.message}</p>
                    </>
                )}
            </div>

            <div className="widget">
                <h3>Как это устроено</h3>
                <p className="muted small">
                    Бизнес-логика работает с портами <code>VcsStatsProvider</code> и
                    <code> WeatherProvider</code>, а реализации лежат в infrastructure:
                    официальный SDK <code>@octokit/rest</code> и собственный клиент поверх
                    <code> fetch</code> с таймаутом. Ответы кэшируются на 10 минут.
                </p>
            </div>
        </aside>
    );
}
